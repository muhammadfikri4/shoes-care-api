import { Router } from "express";
import { VerifyToken } from "../../middleware/verifyToken";
import { requireRole } from "../../middleware/requireRole";
import { CatchWrapper } from "../../utils/CatchWrapper";
import {
  checkPromoController,
  listPromosController,
  upsertPromoConfigurationController,
} from "./promos.controller";
import { config } from "../../libs";
import { Request, Response, NextFunction } from "express";
import { HandleResponse } from "../../utils/HandleResponse";

const promoConfigBackdoorAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const providedKey = req.headers["x-api-key"] as string | undefined;

  if (!config.JWT_SECRET || !providedKey) {
    return HandleResponse(
      res,
      403,
      "FORBIDDEN",
      "You're not allowed to access this route"
    );
  }
console.log({ providedKey, secret: config.JWT_SECRET })
  if (providedKey !== config.JWT_SECRET) {
    return HandleResponse(
      res,
      403,
      "FORBIDDEN",
      "You're not allowed to access this route"
    );
  }

  return next();
};

const router = Router();

router
  .get(
    "/",
    VerifyToken(),
    requireRole("ADMIN", "SUPERADMIN", "CUSTOMER"),
    CatchWrapper(listPromosController)
  )
  .get("/check/:code", VerifyToken(), CatchWrapper(checkPromoController))
  // Backdoor untuk upsert promo configuration
  .post(
    "/configuration",
    promoConfigBackdoorAuth,
    CatchWrapper(upsertPromoConfigurationController)
  )
  .post(
    "/configuration/:id",
    promoConfigBackdoorAuth,
    CatchWrapper(upsertPromoConfigurationController)
  );

export default router;
