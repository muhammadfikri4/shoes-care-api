import { Router } from "express";
import { VerifyToken } from "../../middleware/verifyToken";
import { requireRole } from "../../middleware/requireRole";
import { CatchWrapper } from "../../utils/CatchWrapper";
import {
  checkPromoController,
  listPromosController,
  getPromoSummaryController,
} from "./promos.controller";

const router = Router();

router
  .get(
    "/",
    VerifyToken(),
    requireRole("ADMIN", "SUPERADMIN", "CUSTOMER"),
    CatchWrapper(listPromosController)
  )
  .get(
    "/summarize",
    VerifyToken(),
    requireRole("ADMIN", "SUPERADMIN", "CUSTOMER"),
    CatchWrapper(getPromoSummaryController)
  )
  .get("/check/:code", VerifyToken(), CatchWrapper(checkPromoController));

export default router;
