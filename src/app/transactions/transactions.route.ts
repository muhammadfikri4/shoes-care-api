import { Router } from "express";
import { transactionsController } from "./transactions.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { createTransactionSchema, scanSchema } from "./transactions.request";
import { VerifyToken } from "../../middleware/verifyToken";
import { requireRole } from "../../middleware/requireRole";

const router = Router();

// Admin endpoints
router
  .get("/", VerifyToken(), requireRole('ADMIN','SUPERADMIN'), transactionsController.listAll)
  .post("/", VerifyToken(), requireRole('ADMIN','SUPERADMIN'), validateRequest(createTransactionSchema), transactionsController.create)
  .post("/scan", VerifyToken(), requireRole('ADMIN','SUPERADMIN'), validateRequest(scanSchema), transactionsController.scanPickup)
  .get("/lookup", VerifyToken(), transactionsController.lookup);

// Customer endpoint
router.get("/my", VerifyToken(), transactionsController.listMine);

export default router;
