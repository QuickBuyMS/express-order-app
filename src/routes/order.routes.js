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
router.get("/all-order", verifyTokenMiddleware, getUserAllOrders);
router.get("/order-details/:order_id", verifyTokenMiddleware, getParticularOrder);
router.post("/cancel-order", verifyTokenMiddleware, cancelOrder);

// Addresses
router.get("/addresses", verifyTokenMiddleware, getUserAllAddress);
router.post(
  "/add-address",
  verifyTokenMiddleware,
  addUserAddress
);
router.put(
  "/update-address/:address_id",
  verifyTokenMiddleware,
  updateParticularAddress
);

// Cart
router.get("/cartdetails", verifyTokenMiddleware, getCartItems);
router.patch("/updatecart", verifyTokenMiddleware, updateCartItems);

// Wishlist
router.get("/wishlistdetails", verifyTokenMiddleware, getWishlistItems);
router.patch("/updatewishlist", verifyTokenMiddleware, updateWishlistItems);

export default router;
