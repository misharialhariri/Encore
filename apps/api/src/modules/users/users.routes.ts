import { Router } from "express";
import * as usersController from "./users.controller";
import { requireAuth } from "../../middleware/auth";

export const usersRouter = Router();

usersRouter.use(requireAuth);
usersRouter.get("/me", usersController.getMe);
usersRouter.put("/me", usersController.updateMe);
usersRouter.post("/me/photo-upload-url", usersController.presignPhoto);
