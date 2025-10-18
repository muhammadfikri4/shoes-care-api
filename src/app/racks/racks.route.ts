import { Router } from "express";
import { createRackController, listRacksController, removeRackController, updateRackController } from "./racks.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { createRackSchema, updateRackSchema } from "./racks.request";
import { VerifyToken } from "../../middleware/verifyToken";
import { requireRole } from "../../middleware/requireRole";

const router = Router();

router
  .get("/", VerifyToken(), requireRole('ADMIN','SUPERADMIN'), listRacksController)
  .post("/", VerifyToken(), requireRole('ADMIN','SUPERADMIN'), validateRequest(createRackSchema), createRackController)
  .put("/:id", VerifyToken(), requireRole('ADMIN','SUPERADMIN'), validateRequest(updateRackSchema), updateRackController)
  .delete("/:id", VerifyToken(), requireRole('ADMIN','SUPERADMIN'), removeRackController);

export default router;
