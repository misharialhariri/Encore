import { Router } from "express";
import { requireAdminAuth, requireAdminRole } from "../../middleware/adminAuth";
import * as adminUsersService from "./adminUsers.service";
import { listUsersQuerySchema } from "./adminUsers.schemas";

export const adminUsersRouter = Router();

adminUsersRouter.use(requireAdminAuth);
adminUsersRouter.use(requireAdminRole("OPS", "SUPPORT"));

adminUsersRouter.get("/", async (req, res) => {
  const { query } = listUsersQuerySchema.parse(req.query);
  const users = await adminUsersService.searchUsers(query);
  res.json({ users });
});

adminUsersRouter.get("/:id", async (req, res) => {
  const user = await adminUsersService.getUserDetail(req.params.id);
  res.json({ user });
});

adminUsersRouter.post("/:id/suspend", async (req, res) => {
  const user = await adminUsersService.suspendUser(req.params.id);
  res.json({ user });
});

adminUsersRouter.post("/:id/ban", async (req, res) => {
  const user = await adminUsersService.banUser(req.params.id);
  res.json({ user });
});

adminUsersRouter.post("/:id/reactivate", async (req, res) => {
  const user = await adminUsersService.reactivateUser(req.params.id);
  res.json({ user });
});
