import { Router } from "express";
import { requireAdminAuth, requireAdminRole } from "../../middleware/adminAuth";
import * as adminSettingsService from "./adminSettings.service";
import { createBannedKeywordSchema } from "./adminSettings.schemas";

export const adminBannedKeywordsRouter = Router();

adminBannedKeywordsRouter.use(requireAdminAuth);
adminBannedKeywordsRouter.use(requireAdminRole()); // SUPER_ADMIN only

adminBannedKeywordsRouter.get("/", async (_req, res) => {
  const keywords = await adminSettingsService.listBannedKeywords();
  res.json({ keywords });
});

adminBannedKeywordsRouter.post("/", async (req, res) => {
  const { keyword } = createBannedKeywordSchema.parse(req.body);
  const created = await adminSettingsService.addBannedKeyword(keyword);
  res.status(201).json({ keyword: created });
});

adminBannedKeywordsRouter.delete("/:id", async (req, res) => {
  await adminSettingsService.removeBannedKeyword(req.params.id);
  res.status(204).send();
});
