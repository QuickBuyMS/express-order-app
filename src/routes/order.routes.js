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
} from "../controllers/order.controller.js";
import { verifyTokenMiddleware } from "../middlewares/verifyToken.js";

const router = express.Router();

// Orders
router.post("/place-order", verifyTokenMiddleware, insertOrder);
router.get("/orders/:user_id", verifyTokenMiddleware, getUserAllOrders);
router.get("/order/:order_id", verifyTokenMiddleware, getParticularOrder);

// Addresses
router.get("/addresses/:user_id", verifyTokenMiddleware, getUserAllAddress);
router.post(
  "/address/:user_id",
  verifyTokenMiddleware,
  addUserAddress
);
router.put(
  "/address/:address_id",
  verifyTokenMiddleware,
  updateParticularAddress
);

// Cart
router.get("/cart/:user_id", verifyTokenMiddleware, getCartItems);
router.put("/cart/:user_id", verifyTokenMiddleware, updateCartItems);

// Wishlist
router.get("/wishlist/:user_id", verifyTokenMiddleware, getWishlistItems);
router.put("/wishlist/:user_id", verifyTokenMiddleware, updateWishlistItems);

export default router;
