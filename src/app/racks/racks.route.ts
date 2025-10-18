import { Router } from "express";
import { racksController } from "./racks.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { createRackSchema, updateRackSchema } from "./racks.request";
import { VerifyToken } from "../../middleware/verifyToken";
import { requireRole } from "../../middleware/requireRole";

const router = Router();

router
  .get("/", VerifyToken(), requireRole('ADMIN','SUPERADMIN'), racksController.list)
  .post("/", VerifyToken(), requireRole('ADMIN','SUPERADMIN'), validateRequest(createRackSchema), racksController.create)
  .put("/:id", VerifyToken(), requireRole('ADMIN','SUPERADMIN'), validateRequest(updateRackSchema), racksController.update)
  .delete("/:id", VerifyToken(), requireRole('ADMIN','SUPERADMIN'), racksController.remove);

export default router;
