import { Router } from "express";
import { requireAdminAuth, requireAdminRole } from "../../middleware/adminAuth";
import * as moderationService from "./adminModeration.service";
import { rejectListingSchema } from "./adminModeration.schemas";

export const adminListingsRouter = Router();

adminListingsRouter.use(requireAdminAuth);
adminListingsRouter.use(requireAdminRole("OPS", "SUPPORT"));

adminListingsRouter.get("/", async (_req, res) => {
  const listings = await moderationService.listPendingListings();
  res.json({ listings });
});

adminListingsRouter.post("/:id/approve", async (req, res) => {
  const listing = await moderationService.approveListing(req.params.id);
  res.json({ listing });
});

adminListingsRouter.post("/:id/reject", async (req, res) => {
  const input = rejectListingSchema.parse(req.body);
  const listing = await moderationService.rejectListing(req.params.id, input);
  res.json({ listing });
});
