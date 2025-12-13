import { Router } from "express";
import { CatchWrapper } from "../../utils/CatchWrapper";
import {
  upsertPromoConfigurationController,
  getPromoConfigurationController,
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
  console.log({ providedKey, secret: config.JWT_SECRET });
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
    promoConfigBackdoorAuth,
    CatchWrapper(getPromoConfigurationController)
  )
  .post(
    "/",
    promoConfigBackdoorAuth,
    CatchWrapper(upsertPromoConfigurationController)
  );

export default router;
