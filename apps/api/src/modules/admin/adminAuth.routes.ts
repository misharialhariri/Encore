import { Router } from "express";
import { requireAdminAuth } from "../../middleware/adminAuth";
import { adminLoginRateLimiter } from "../../middleware/rateLimiter";
import * as adminAuthService from "./adminAuth.service";
import { adminLoginSchema } from "./adminAuth.schemas";

export const adminAuthRouter = Router();

adminAuthRouter.post("/login", adminLoginRateLimiter, async (req, res) => {
  const { email, password } = adminLoginSchema.parse(req.body);
  const result = await adminAuthService.login(email, password);
  res.json(result);
});

adminAuthRouter.get("/me", requireAdminAuth, async (req, res) => {
  const admin = await adminAuthService.getAdminById(req.adminId!);
  res.json({ admin });
});
