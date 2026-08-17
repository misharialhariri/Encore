import { Router } from "express";
import { adminAuthRouter } from "./adminAuth.routes";
import { adminListingsRouter } from "./adminListings.routes";
import { adminReportsRouter } from "./adminReports.routes";
import { adminDisputesRouter } from "./adminDisputes.routes";
import { adminVerificationRouter } from "./adminVerification.routes";
import { adminPayoutsRouter } from "./adminPayouts.routes";
import { adminPlatformSettingsRouter } from "./adminPlatformSettings.routes";
import { adminBannedKeywordsRouter } from "./adminBannedKeywords.routes";
import { adminUsersRouter } from "./adminUsers.routes";
import { adminStatsRouter } from "./adminStats.routes";

export const adminRouter = Router();

// Every sub-router below is mounted at its own distinct path. None of them
// may be mounted at "/" — Express runs a router's own .use() middleware
// (auth, role gates) for *any* request whose path starts with its mount
// prefix, not just requests matching its own routes, so two routers
// sharing "/" would both run their gates on every admin request.
adminRouter.use("/auth", adminAuthRouter);
adminRouter.use("/listings", adminListingsRouter);
adminRouter.use("/reports", adminReportsRouter);
adminRouter.use("/disputes", adminDisputesRouter);
adminRouter.use("/verification-requests", adminVerificationRouter);
adminRouter.use("/payouts", adminPayoutsRouter);
adminRouter.use("/settings", adminPlatformSettingsRouter);
adminRouter.use("/banned-keywords", adminBannedKeywordsRouter);
adminRouter.use("/users", adminUsersRouter);
adminRouter.use("/stats", adminStatsRouter);
