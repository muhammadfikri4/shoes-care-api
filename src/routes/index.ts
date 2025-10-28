import { Router, type Request, type Response } from "express";
import { MESSAGE_CODE } from "../utils/error-code";
import { MESSAGES } from "../utils/Messages";
// import { WebSocket } from "ws";
// import { wss } from "..";
import authRoutes from "../app/auth/auth.route";
import userRoutes from "../app/users/users.route";
import { VerifyToken } from "../middleware/verifyToken";
import racksRoute from "../app/racks/racks.route";
import transactionsRoute from "../app/transactions/transactions.route";
import promosRoute from "../app/promos/promos.route";

const route = Router();

// Gabungkan semua route di sini
route.use('/auth',authRoutes);
route.use('/users', VerifyToken(), userRoutes);
route.use('/racks', racksRoute);
route.use('/transactions', transactionsRoute);
route.use('/promos', promosRoute);

route.get("/", (req: Request, res: Response) => {
  return res.json({ message: "Hello World 🚀" });
});

route.use("*", (req: Request, res: Response) => {
  return res.status(404).json({
    status: 404,
    code: MESSAGE_CODE.NOT_FOUND,
    message: MESSAGES.ERROR.NOT_FOUND.ROUTE,
  });
});

export default route;
