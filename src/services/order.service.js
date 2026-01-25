import db from "../config/db.config.js";

export const OrderService = {
  insertOrder: async (orderData) => {
    const { user_id, address_id, total_amount, status, payment_method } =
      orderData;
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // 1. Check User Points
      const [[user]] = await connection.query(
        "SELECT points FROM users WHERE user_id = ? FOR UPDATE;",
        [user_id],
      );

      if (!user || user.points < total_amount) {
        throw new Error("Insufficient points to place the order");
      }

      // 2. Fetch current Cart Items to move to the Order (Matches image_261b6a.png)
      const [cartItems] = await connection.query(
        `SELECT ci.product_id, ci.quantity, p.price 
       FROM cart_items ci
       JOIN cart c ON ci.cart_id = c.cart_id
       JOIN products p ON ci.product_id = p.product_id
       WHERE c.user_id = ?`,
        [user_id],
      );

      if (cartItems.length === 0) {
        throw new Error("Cart is empty");
      }

      // 3. Create the Main Order
      const [orderResult] = await connection.query(
        "INSERT INTO orders (user_id, address_id, total_amount) VALUES (?, ?, ?);",
        [user_id, address_id, total_amount],
      );
      const orderId = orderResult.insertId;

      // 4. Insert multiple items into order_items
      const orderItemsData = cartItems.map((item) => [
        orderId,
        item.product_id,
        item.quantity,
        item.price,
        status
      ]);

      await connection.query(
        "INSERT INTO order_items (order_id, product_id, quantity, price, status) VALUES ?;",
        [orderItemsData],
      );

      let transaction_id = `TXN_${payment_method}_${user_id}_${orderId}`;

      // 5. Process Payment & Points Deduction
      await connection.query(
        "INSERT INTO payment (order_id, user_id, payment_method, amount, payment_status, transaction_id, paid_at) VALUES (?, ?, ?, ?, ?, ?, ?);",
        [
          orderId,
          user_id,
          payment_method,
          total_amount,
          "completed",
          transaction_id,
          new Date(),
        ],
      );

      await connection.query(
        "UPDATE users SET points = points - ? WHERE user_id = ?;",
        [total_amount, user_id],
      );

      // 6. Clear the User's Cart (Matches image_261b8d.png)
      await connection.query(
        "DELETE ci FROM cart_items ci JOIN cart c ON ci.cart_id = c.cart_id WHERE c.user_id = ?;",
        [user_id],
      );

      await connection.commit();

      // 7. Return Order Summary
      return {
        order_id: orderId,
        total_paid: total_amount,
        items_count: cartItems.length,
        status: "SUCCESS",
        remaining_points: user.points - total_amount,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  getUserAllOrders: async (user_id) => {
    const query = `
    SELECT 
      o.order_id, 
      o.total_amount AS order_total, 
      oi.status AS item_status, 
      o.created_at,
      p.product_id, 
      p.name AS product_name, 
      p.image_url, 
      oi.order_item_id,
      oi.quantity, 
      oi.price AS price_at_purchase,
      a.address_line1, 
      a.city, 
      a.state, 
      a.pincode, 
      a.address_type
    FROM orders o
    JOIN order_items oi ON o.order_id = oi.order_id
    JOIN products p ON oi.product_id = p.product_id
    JOIN addresses a ON o.address_id = a.address_id
    WHERE o.user_id = ?
    ORDER BY o.created_at DESC;
  `;

    const [rows] = await db.query(query, [user_id]);

    // Each product is returned as a separate object with its own item-level status
    return rows.map((row) => ({
      order_item_id: row.order_item_id, // Unique ID for this specific product
      order_id: row.order_id, // Parent Order ID
      status: row.item_status, // Status specifically from order_items
      created_at: row.created_at,
      product_details: {
        product_id: row.product_id,
        name: row.product_name,
        image_url: row.image_url,
        quantity: row.quantity,
        price: row.price_at_purchase, // Historical price
      },
      address: {
        line1: row.address_line1,
        city: row.city,
        state: row.state,
        pincode: row.pincode,
        type: row.address_type, // Shipping address used
      },
      order_summary_total: row.order_total,
    }));
  },
  cancelParticularOrder: async (order_id, order_item_id) => {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // 1. Fetch details using order_item_id as the source of truth for status
      const [itemDetails] = await connection.query(
        `SELECT oi.price, oi.quantity, oi.status AS item_status, o.user_id 
       FROM order_items oi 
       JOIN orders o ON oi.order_id = o.order_id 
       WHERE oi.order_item_id = ? AND oi.order_id = ? FOR UPDATE`,
        [order_item_id, order_id],
      );

      if (!itemDetails.length) throw new Error("Item not found");

      // 2. Check item-level status instead of order-level
      // Database uses 'delivered' and 'canceled' (single 'l')
      if (itemDetails[0].item_status === "delivered") {
        throw new Error("Cannot cancel a delivered item");
      }
      if (itemDetails[0].item_status === "canceled") {
        throw new Error("Item is already canceled");
      }

      const refundAmount = itemDetails[0].price * itemDetails[0].quantity;
      const userId = itemDetails[0].user_id;

      // 3. Update specific item status to 'canceled' (Fixed spelling to prevent truncation error)
      await connection.query(
        "UPDATE order_items SET status = 'canceled' WHERE order_item_id = ?",
        [order_item_id],
      );

      // 4. Deduct amount from main Order Total
      await connection.query(
        "UPDATE orders SET total_amount = total_amount - ? WHERE order_id = ?",
        [refundAmount, order_id],
      );

      // 5. Refund Points to the User balance
      await connection.query(
        "UPDATE users SET points = points + ? WHERE user_id = ?",
        [refundAmount, userId],
      );

      // 6. Sync main order status if ALL items are now 'canceled'
      const [remainingItems] = await connection.query(
        "SELECT COUNT(*) as count FROM order_items WHERE order_id = ? AND status != 'canceled'",
        [order_id],
      );

      if (remainingItems[0].count === 0) {
        await connection.query(
          "UPDATE orders SET status = 'canceled' WHERE order_id = ?",
          [order_id],
        );
      }

      await connection.commit();
      return { success: true, refundedPoints: refundAmount };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },
  getParticularOrder: async (order_id) => {
    const [orderDetails] = await db.query(
      "SELECT p.product_id, p.image_url, p.name, u.user_id, oi.quantity, oi.price, o.order_id, o.status, o.total_amount, o.created_at FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.order_id LEFT JOIN users u ON u.user_id = o.user_id LEFT JOIN products p ON p.product_id = oi.product_id where o.order_id = ?;",
      [order_id],
    );

    const [addressDetails] = await db.query(
      "SELECT a.address_id, a.city, a.state, a.pincode, a.country FROM addresses a JOIN orders o ON o.address_id = a.address_id WHERE o.order_id = ?;",
      [order_id],
    );

    const [paymentDetails] = await db.query(
      "SELECT o.order_id, pay.user_id, pay.payment_id, pay.payment_method, pay.amount, pay.payment_status, pay.transaction_id, pay.paid_at FROM payment pay LEFT JOIN orders o ON o.order_id = pay.order_id WHERE o.order_id = ?; ",
      [order_id],
    );

    let obj = {
      orderDetails: orderDetails,
      addressDetails: addressDetails[0],
      paymentDetails: paymentDetails[0],
    };

    return obj;
  },

  getUserAllAddress: async (user_id) => {
    const [rows] = await db.query(
      "SELECT * FROM addresses WHERE user_id = ?;",
      [user_id],
    );
    return rows;
  },

  getUserParticularAddress: async (address_id, user_id) => {
    const [rows] = await db.query(
      "SELECT * FROM addresses WHERE user_id = ? AND address_id = ?;",
      [user_id, address_id],
    );
    return rows;
  },

  resetUserDefaultAddress: async (user_id) => {
    const [rows] = await db.query(
      "UPDATE addresses SET is_default = 0 WHERE user_id = ?;",
      [user_id],
    );
    return rows;
  },

  updateParticularAddress: async (address_id, addressData) => {
    const {
      address_line1,
      address_line2,
      city,
      state,
      pincode,
      country,
      address_type,
      is_default,
      user_id,
    } = addressData;

    if (is_default === 1 || is_default === true) {
      await OrderService.resetUserDefaultAddress(user_id);
    }

    const [rows] = await db.query(
      "UPDATE addresses SET user_id=?, address_line1 = ?,address_line2 = ?, city = ?, state = ?, pincode = ?, country = ?, is_default=?, address_type=? WHERE address_id = ?;",
      [
        user_id,
        address_line1,
        address_line2,
        city,
        state,
        pincode,
        country,
        is_default,
        address_type,
        address_id,
      ],
    );
    return rows;
  },

  addUserAddress: async (user_id, addressData) => {
    const {
      address_line1,
      address_line2,
      city,
      state,
      pincode,
      country,
      address_type,
      is_default,
    } = addressData;
    console.log("addressData in service", addressData);

    if (is_default === 1 || is_default === true) {
      await OrderService.resetUserDefaultAddress(user_id);
    }

    const [rows] = await db.query(
      "INSERT INTO addresses (address_line1,address_line2, city, state, pincode, country , is_default, address_type, user_id) VALUES (?,?,?,?,?,?,?,?,?);",
      [
        address_line1,
        address_line2,
        city,
        state,
        pincode,
        country,
        is_default,
        address_type,
        user_id,
      ],
    );
    return rows;
  },

  getCartItems: async (user_id) => {
    const [rows] = await db.query(
      `SELECT
    c.cart_id,
    c.user_id,
    ci.product_id,
    ci.quantity,
    p.name,
    p.description,
    p.image_url,
    p.price,
	(p.price * ci.quantity) as product_total,
	sum(p.price * ci.quantity) OVER () as cart_total
FROM
    cart c
JOIN cart_items ci ON
    c.cart_id = ci.cart_id
JOIN products p ON
    p.product_id = ci.product_id
WHERE
    c.user_id = ?
GROUP By p.name`,
      [user_id],
    );
    return rows;
  },

  updateCartItems: async (user_id, product_id, quantityChange) => {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // 1. Ensure the cart exists and get the cart_id (Matches image_261b8d.png)
      await connection.query("INSERT IGNORE INTO cart (user_id) VALUES (?)", [
        user_id,
      ]);
      const [[cart]] = await connection.query(
        "SELECT cart_id FROM cart WHERE user_id = ?",
        [user_id],
      );
      const cartId = cart.cart_id;
      if (quantityChange === -1) {
        // 1. Delete immediately if quantity is 1 (or somehow less)
        // This ensures the row is gone BEFORE it can ever hit 0.
        const [deleteResult] = await connection.query(
          "DELETE FROM cart_items WHERE cart_id = ? AND product_id = ? AND quantity <= 1",
          [cartId, product_id],
        );

        // 2. If nothing was deleted, it means quantity was > 1, so we decrement
        if (deleteResult.affectedRows === 0) {
          await connection.query(
            "UPDATE cart_items SET quantity = quantity - 1 WHERE cart_id = ? AND product_id = ?",
            [cartId, product_id],
          );
        }
      } else {
        // 3. Upsert logic (Matches image_261b6a.png)
        // We use ON DUPLICATE KEY UPDATE to handle existing items
        await connection.query(
          `INSERT INTO cart_items (cart_id, product_id, quantity)
         VALUES (?, ?, 1)
         ON DUPLICATE KEY UPDATE 
            quantity = quantity + 1,
            added_at = CURRENT_TIMESTAMP`,
          [cartId, product_id],
        );
      }

      await connection.commit();

      // 4. Return the fresh state
      return (await OrderService.getCartItems(user_id)) ?? { cartItems: [] };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },
  getWishlistItems: async (user_id) => {
    const [rows] = await db.query(
      `SELECT
    p.product_id,
    p.name,
    p.description,
    p.price,
    p.image_url
FROM
    products p
LEFT JOIN wishlist w ON w.product_id = p.product_id 
WHERE 
    w.user_id = ?;`,
      [user_id],
    );
    return rows;
  },

  updateWishlistItems: async (user_id, product_id) => {
    // Check if item already exists in wishlist
    const [existingItem] = await db.query(
      `SELECT * FROM wishlist WHERE user_id = ? AND product_id = ?;`,
      [user_id, product_id],
    );

    if (existingItem.length > 0) {
      // If exists, remove it
      const [rows] = await db.query(
        `DELETE FROM wishlist WHERE user_id = ? AND product_id = ?;`,
        [user_id, product_id],
      );
    } else {
      // If not exists, add it
      const [rows] = await db.query(
        `INSERT INTO wishlist (user_id, product_id) VALUES (?, ?);`,
        [user_id, product_id],
      );
    }

    const updatedWishlistItems = OrderService.getWishlistItems(user_id);
    return updatedWishlistItems ?? { wishlistItems: [] };
  },
};
