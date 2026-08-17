import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import * as offersController from "./offers.controller";

export const offersRouter = Router();

offersRouter.use(requireAuth);

offersRouter.post("/", offersController.create);
offersRouter.get("/mine", offersController.listMine);
offersRouter.get("/received", offersController.listReceived);
offersRouter.get("/:id", offersController.getDetail);
offersRouter.post("/:id/accept", offersController.accept);
offersRouter.post("/:id/decline", offersController.decline);
offersRouter.post("/:id/counter", offersController.counter);
