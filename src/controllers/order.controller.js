import { OrderService } from "../services/order.service.js";

export const insertOrder = async (req, res, next) => {
  try {
    const result = await OrderService.insertOrder(req.body);
    res.status(201).json({
      status: true,
      statusCode: 201,
      message: "Order placed successfully",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const getUserAllOrders = async (req, res, next) => {
  try {
    const orders = await OrderService.getUserAllOrders(req.params.user_id);
    res.status(200).json({
      status: true,
      statusCode: 200,
      message: "Orders fetched successfully",
      data: orders,
    });
  } catch (err) {
    next(err);
  }
};

export const getParticularOrder = async (req, res, next) => {
  try {
    const order = await OrderService.getParticularOrder(req.params.order_id);
    res.status(200).json({
      status: true,
      statusCode: 200,
      message: "Order details fetched",
      data: order,
    });
  } catch (err) {
    next(err);
  }
};

export const cancelOrder = async (req, res, next) => {
  try {
    const order = await OrderService.cancelParticularOrder(
      req.body.order_id,
      req.body.order_item_id,
    );
    res.status(200).json({
      status: true,
      statusCode: 200,
      message: "Order cancelled successfully",
      data: order,
    });
  } catch (err) {
    next(err);
  }
};

export const getUserAllAddress = async (req, res, next) => {
  try {
    const addresses = await OrderService.getUserAllAddress(req.params.user_id);
    res.status(200).json({
      status: true,
      statusCode: 200,
      message: "Addresses fetched successfully",
      data: addresses,
    });
  } catch (err) {
    next(err);
  }
};

export const addUserAddress = async (req, res, next) => {
  try {
    const address = await OrderService.addUserAddress(
      req.params.user_id,
      req.body,
    );
    res.status(200).json({
      status: true,
      statusCode: 200,
      message: "Address added successfully",
      // data: address
    });
  } catch (err) {
    next(err);
  }
};

export const updateParticularAddress = async (req, res, next) => {
  try {
    const result = await OrderService.updateParticularAddress(
      req.params.address_id,
      req.body,
    );
    res.status(200).json({
      status: true,
      statusCode: 200,
      message: "Address updated successfully",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const getCartItems = async (req, res, next) => {
  try {
    const cartItems = await OrderService.getCartItems(req.params.user_id);
    res.status(200).json({
      status: true,
      statusCode: 200,
      message: "Cart items fetched",
      data: cartItems,
    });
  } catch (err) {
    next(err);
  }
};

export const updateCartItems = async (req, res, next) => {
  try {
    // console.log(req.params.user_id,req.body.product_id,req.body.quantity)

    const updatedCart = await OrderService.updateCartItems(
      req.params.user_id,
      req.body.productId,
      req.body.quantity,
    );
    res.status(200).json({
      status: true,
      statusCode: 200,
      message: "Cart updated successfully",
      data: updatedCart,
    });
  } catch (err) {
    next(err);
  }
};

export const getWishlistItems = async (req, res, next) => {
  try {
    const wishlist = await OrderService.getWishlistItems(req.params.user_id);
    res.status(200).json({
      status: true,
      statusCode: 200,
      message: "Wishlist fetched",
      data: wishlist,
    });
  } catch (err) {
    next(err);
  }
};

export const updateWishlistItems = async (req, res, next) => {
  try {
    const updatedWishlist = await OrderService.updateWishlistItems(
      req.params.user_id,
      req.body.productId,
    );
    res.status(200).json({
      status: true,
      statusCode: 200,
      message: "Wishlist updated",
      data: updatedWishlist,
    });
  } catch (err) {
    next(err);
  }
};
