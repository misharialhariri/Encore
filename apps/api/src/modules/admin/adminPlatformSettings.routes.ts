import { Router } from "express";
import { requireAdminAuth, requireAdminRole } from "../../middleware/adminAuth";
import * as adminSettingsService from "./adminSettings.service";
import { updateSettingSchema } from "./adminSettings.schemas";

export const adminPlatformSettingsRouter = Router();

adminPlatformSettingsRouter.use(requireAdminAuth);
adminPlatformSettingsRouter.use(requireAdminRole()); // SUPER_ADMIN only

adminPlatformSettingsRouter.get("/", async (_req, res) => {
  const settings = await adminSettingsService.listSettings();
  res.json({ settings });
});

adminPlatformSettingsRouter.put("/:key", async (req, res) => {
  const { value } = updateSettingSchema.parse(req.body);
  const setting = await adminSettingsService.updateSetting(req.adminId!, req.params.key, value);
  res.json({ setting });
});
