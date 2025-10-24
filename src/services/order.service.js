import db from '../config/db.config.js';

export const OrderService = {
  insertOrder: async (orderData) => {
    const { user_id, address_id, total_amount, status } = orderData;

    let payment_status = "";

    const [result] = await db.query(
      "INSERT INTO orders (user_id, address_id, total_amount, status) VALUES (?, ?, ?, ?);",
      [user_id, address_id, total_amount, status]
    );

    const [paymentResult] = await db.query(
      "INSERT INTO payment (order_id, user_id, payment_method, amount, payment_status, transaction_id, paid_at) VALUES (?, ?, ?, ?, ?, ?, ?);",
      [
        result.insertId,
        user_id,
        orderData.payment_method,
        total_amount,
        payment_status,
        orderData.transaction_id,
        new Date(),
      ]
    );

    return { result, paymentResult };
  },

  getUserAllOrders: async (user_id) => {
    const [rows] = await db.query(
      "SELECT p.product_id, p.image_url, p.name, u.user_id, o.order_id, o.created_at, o.status, o.total_amount FROM orders o JOIN order_items oi ON oi.order_id = o.order_id JOIN users u ON u.user_id = o.user_id JOIN products p ON p.product_id = oi.product_id WHERE u.user_id = ?;",
      [user_id]
    );
    return rows;
  },

  getParticularOrder: async (order_id) => {
    const [orderDetails] = await db.query(
      "SELECT p.product_id, p.image_url, p.name, u.user_id, oi.quantity, oi.price, o.order_id, o.status, o.total_amount, o.created_at FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.order_id LEFT JOIN users u ON u.user_id = o.user_id LEFT JOIN products p ON p.product_id = oi.product_id where o.order_id = ?;",
      [order_id]
    );

    const [addressDetails] = await db.query(
      "SELECT a.address_id, a.city, a.state, a.pincode, a.country FROM addresses a JOIN orders o ON o.address_id = a.address_id WHERE o.order_id = ?;",
      [order_id]
    );

    const [paymentDetails] = await db.query(
      "SELECT o.order_id, pay.user_id, pay.payment_id, pay.payment_method, pay.amount, pay.payment_status, pay.transaction_id, pay.paid_at FROM payment pay LEFT JOIN orders o ON o.order_id = pay.order_id WHERE o.order_id = ?; ",
      [order_id]
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
      [user_id]
    );
    return rows;
  },

  getUserParticularAddress: async (address_id, user_id) => {
    const [rows] = await db.query(
      "SELECT * FROM addresses WHERE user_id = ? AND address_id = ?;",
      [user_id, address_id]
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
    } = addressData;
    const [rows] = await db.query(
      "UPDATE addresses SET address_line1 = ?,address_line2 = ?, city = ?, state = ?, pincode = ?, country = ?, is_default=?, address_type=? WHERE address_id = ?;",
      [
        address_line1,
        address_line2,
        city,
        state,
        pincode,
        country,
        is_default,
        address_type,
        address_id,
      ]
    );
    return rows;
  },

  getUserParticularAddress: async (address_id) => {
    const [rows] = await db.query(
      "SELECT * FROM addresses WHERE address_id = ?;",
      [address_id]
    );
    return rows[0];
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
      [user_id]
    );
    return rows;
  },

  updateCartItems: async (user_id, product_id, quantity) => {
    // If quantity is -1, remove the item from cart else update the quantity
    if (quantity == -1) {
      // if quantity is > 1
      const [rows] = await db.query(
        `UPDATE cart_items ci
JOIN cart c ON ci.cart_id = c.cart_id
SET ci.quantity = ci.quantity - 1
WHERE c.user_id = ? AND ci.product_id = ? AND ci.quantity > 1;`,
        [user_id, product_id]
      );

      // if quantity is 1, remove the item from cart

      const [deleteRows] = await db.query(
        `DELETE ci
FROM cart_items ci
JOIN cart c ON ci.cart_id = c.cart_id
WHERE c.user_id = ? AND ci.product_id = ? AND ci.quantity <= 1;`,
        [user_id, product_id]
      );
    } else {
      // Check if cart exists for the user else create one for the user_id
      const [cart] = await db.query(
        "INSERT IGNORE INTO cart (user_id) VALUES (?);",
        [user_id]
      );

      // Insert or Update the cart items

      const [rows] = await db.query(
        `INSERT INTO cart_items (cart_id, product_id, quantity)
                        SELECT c.cart_id, ? , 1
                        FROM cart_new c
                        WHERE c.user_id = ?
                        ON DUPLICATE KEY UPDATE
                    quantity = quantity + VALUES(quantity),
                    added_at = CURRENT_TIMESTAMP;
`,
        [product_id, user_id]
      );
    }

    const updatedCartItems = OrderService.getCartItems(user_id);
    return updatedCartItems ?? { cartItems: [] };
  },

  getWishlistItems: async (user_id) => {
    const [rows] = await db.query(`SELECT * FROM wishlist WHERE user_id = ?;`, [
      user_id,
    ]);
    return rows;
  },

  updateWishlistItems: async (user_id, product_id) => {
    // Check if item already exists in wishlist
    const [existingItem] = await db.query(
      `SELECT * FROM wishlist WHERE user_id = ? AND product_id = ?;`,
      [user_id, product_id]
    );

    if (existingItem.length > 0) {
      // If exists, remove it
      const [rows] = await db.query(
        `DELETE FROM wishlist WHERE user_id = ? AND product_id = ?;`,
        [user_id, product_id]
      );
    } else {
      // If not exists, add it
      const [rows] = await db.query(
        `INSERT INTO wishlist (user_id, product_id) VALUES (?, ?);`,
        [user_id, product_id]
      );
    }

    const updatedWishlistItems = OrderService.getWishlistItems(user_id);
    return updatedWishlistItems ?? { wishlistItems: [] };
  },
};
