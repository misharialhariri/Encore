import { Router } from "express";
import * as listingsController from "./listings.controller";
import { requireAuth, optionalAuth } from "../../middleware/auth";

export const listingsRouter = Router();

listingsRouter.get("/meta", listingsController.getMeta);
listingsRouter.get("/mine", requireAuth, listingsController.listMine);
listingsRouter.post("/photo-upload-url", requireAuth, listingsController.presignPhoto);

listingsRouter.post("/", requireAuth, listingsController.create);
listingsRouter.get("/:id", optionalAuth, listingsController.getDetail);
listingsRouter.put("/:id", requireAuth, listingsController.update);
listingsRouter.patch("/:id/status", requireAuth, listingsController.setStatus);
