import { Router } from "express";
import { userController } from "./users.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { updateProfileSchema } from "./users.request";
import { requireRole } from "../../middleware/requireRole";
import { CatchWrapper } from "../../utils/CatchWrapper";

const router = Router();

router.get("/profile/me", userController.getProfile);
router.put(
  "/profile/me",
  validateRequest(updateProfileSchema),
  CatchWrapper(userController.updateProfile)
);
router.get(
  "/customers",
  requireRole("ADMIN", "SUPERADMIN"),
  CatchWrapper(userController.getCustomers)
);

export default router;
