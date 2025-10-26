import { Router } from "express";
import multer from "multer";
import { requireRole } from "../../middleware/requireRole";
import { validateRequest } from "../../middleware/validateRequest";
import { VerifyToken } from "../../middleware/verifyToken";
import { fileFilter } from "../../utils/FileFilter";
import {
  createTransactionController,
  listAllTransactionsController,
  listMyTransactionsController,
  lookupTransactionController,
  scanPickupController,
  verifyPromoController,
  midtransNotifyController,
  getDetailTransaction,
  readyToPickupController,
  completeController,
} from "./transactions.controller";
import { scanSchema } from "./transactions.request";
import { CatchWrapper } from "../../utils/CatchWrapper";

const router = Router();

// Admin endpoints
const upload = multer({ storage: multer.memoryStorage(), fileFilter });

router
  .get(
    "/",
    VerifyToken(),
    requireRole("ADMIN", "SUPERADMIN"),
    CatchWrapper(listAllTransactionsController)
  )
  // Customer endpoint
  .get("/my", VerifyToken(), CatchWrapper(listMyTransactionsController))
  .get("/lookup", VerifyToken(), CatchWrapper(lookupTransactionController))
  .get("/:transactionId", VerifyToken(), CatchWrapper(getDetailTransaction))
  .post(
    "/",
    VerifyToken(),
    requireRole("ADMIN", "SUPERADMIN"),
    upload.any(),
    CatchWrapper(createTransactionController)
  )
  .post(
    "/scan",
    VerifyToken(),
    requireRole("ADMIN", "SUPERADMIN"),
    validateRequest(scanSchema),
    CatchWrapper(scanPickupController)
  )
  .post(
    "/ready-to-pickup",
    VerifyToken(),
    requireRole("ADMIN", "SUPERADMIN"),
    CatchWrapper(readyToPickupController)
  )
  .post(
    "/complete",
    VerifyToken(),
    requireRole("ADMIN", "SUPERADMIN"),
    CatchWrapper(completeController)
  )
  .post("/promo/verify", VerifyToken(), CatchWrapper(verifyPromoController));

// Midtrans notification (public)
router.post("/midtrans/notify", CatchWrapper(midtransNotifyController));

export default router;
