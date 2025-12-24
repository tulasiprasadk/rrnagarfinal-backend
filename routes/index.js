import express from "express";
import products from "./products.js";
import categories from "./categories.js";
import ads from "./ads.js";
import admin from "./admin.js";

const router = express.Router();

router.use("/products", products);
router.use("/categories", categories);
router.use("/ads", ads);
router.use("/admin", admin);

export default router;
