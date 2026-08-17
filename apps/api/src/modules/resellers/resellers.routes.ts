import { Router } from "express";
import { getResellerProfile } from "./resellers.service";

export const resellersRouter = Router();

resellersRouter.get("/:id", async (req, res) => {
  const profile = await getResellerProfile(req.params.id);
  res.json({ reseller: profile });
});
