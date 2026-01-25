import express from "express";
import {
  insertOrder,
  getUserAllOrders,
  getParticularOrder,
  getUserAllAddress,
  updateParticularAddress,
  getCartItems,
  updateCartItems,
  getWishlistItems,
  updateWishlistItems,
  addUserAddress,
  cancelOrder,
} from "../controllers/order.controller.js";
import { verifyTokenMiddleware } from "../middlewares/verifyToken.js";

const router = express.Router();

// Orders
router.post("/place-order", verifyTokenMiddleware, insertOrder);
router.get("/all-order/:user_id", verifyTokenMiddleware, getUserAllOrders);
router.get("/order-details/:order_id", verifyTokenMiddleware, getParticularOrder);
router.post("/cancel-order", verifyTokenMiddleware, cancelOrder);

// Addresses
router.get("/addresses/:user_id", verifyTokenMiddleware, getUserAllAddress);
router.post(
  "/add-address/:user_id",
  verifyTokenMiddleware,
  addUserAddress
);
router.put(
  "/update-address/:address_id",
  verifyTokenMiddleware,
  updateParticularAddress
);

// Cart
router.get("/cartdetails/:user_id", verifyTokenMiddleware, getCartItems);
router.patch("/updatecart/:user_id", verifyTokenMiddleware, updateCartItems);

// Wishlist
router.get("/wishlistdetails/:user_id", verifyTokenMiddleware, getWishlistItems);
router.patch("/updatewishlist/:user_id", verifyTokenMiddleware, updateWishlistItems);

export default router;
