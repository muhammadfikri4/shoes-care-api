import { Router } from "express";
import {
  createTransactionController,
  listAllTransactionsController,
  listMyTransactionsController,
  lookupTransactionController,
  scanPickupController,
  verifyPromoController,
} from "./transactions.controller";
import multer from 'multer';
import { fileFilter } from "../../utils/FileFilter";
import { validateRequest } from "../../middleware/validateRequest";
import { createTransactionSchema, scanSchema } from "./transactions.request";
import { VerifyToken } from "../../middleware/verifyToken";
import { requireRole } from "../../middleware/requireRole";

const router = Router();

// Admin endpoints
const upload = multer({ storage: multer.memoryStorage(), fileFilter });

router
  .get("/", VerifyToken(), requireRole('ADMIN','SUPERADMIN'), listAllTransactionsController)
  .post("/", VerifyToken(), requireRole('ADMIN','SUPERADMIN'), upload.array('photos'), createTransactionController)
  .post("/scan", VerifyToken(), requireRole('ADMIN','SUPERADMIN'), validateRequest(scanSchema), scanPickupController)
  .get("/lookup", VerifyToken(), lookupTransactionController)
  .post("/promo/verify", VerifyToken(), verifyPromoController);

// Customer endpoint
router.get("/my", VerifyToken(), listMyTransactionsController);

export default router;
