import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import * as ordersController from "./orders.controller";

export const ordersRouter = Router();

// Public: Moyasar redirects the buyer's browser here after hosted checkout.
ordersRouter.get("/:id/payment-callback", ordersController.paymentCallback);

ordersRouter.use(requireAuth);

ordersRouter.post("/", ordersController.create);
ordersRouter.get("/mine", ordersController.listMine);
ordersRouter.get("/selling", ordersController.listSelling);
ordersRouter.get("/:id", ordersController.getDetail);
ordersRouter.post("/:id/checkout", ordersController.checkout);
ordersRouter.post("/:id/refresh-payment-status", ordersController.refreshPaymentStatus);
ordersRouter.post("/:id/dev-simulate-payment", ordersController.devSimulatePayment);
ordersRouter.post("/:id/confirm", ordersController.confirm);
ordersRouter.post("/:id/ship", ordersController.ship);
ordersRouter.post("/:id/deliver", ordersController.deliver);
ordersRouter.post("/:id/confirm-receipt", ordersController.confirmReceipt);
