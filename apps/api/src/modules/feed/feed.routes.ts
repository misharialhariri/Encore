import { Router } from "express";
import { optionalAuth } from "../../middleware/auth";
import { getHomeFeed } from "./feed.service";

export const feedRouter = Router();

feedRouter.get("/home", optionalAuth, async (req, res) => {
  const feed = await getHomeFeed(req.userId);
  res.json(feed);
});
