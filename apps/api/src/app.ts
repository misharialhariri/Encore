import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env, isTest } from "./config/env";
import { apiRateLimiter } from "./middleware/rateLimiter";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { authRouter } from "./modules/auth/auth.routes";
import { usersRouter } from "./modules/users/users.routes";
import { regionsRouter } from "./modules/users/regions.routes";
import { brandsRouter } from "./modules/catalog/brands.routes";
import { styleTagsRouter } from "./modules/catalog/styleTags.routes";
import { sizeChartRouter } from "./modules/catalog/sizeChart.routes";
import { listingsRouter } from "./modules/listings/listings.routes";
import { resellersRouter } from "./modules/resellers/resellers.routes";
import { searchRouter } from "./modules/search/search.routes";
import { wishlistRouter } from "./modules/wishlist/wishlist.routes";
import { feedRouter } from "./modules/feed/feed.routes";
import { reportsRouter } from "./modules/reports/reports.routes";
import { offersRouter } from "./modules/offers/offers.routes";
import { addressesRouter } from "./modules/addresses/addresses.routes";
import { ordersRouter } from "./modules/orders/orders.routes";
import { payoutsRouter } from "./modules/payouts/payouts.routes";
import { devicesRouter } from "./modules/devices/devices.routes";
import { notificationsRouter } from "./modules/notifications/notifications.routes";
import { chatRouter } from "./modules/chat/chat.routes";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(","), credentials: true }));
  app.use(express.json({ limit: "2mb" }));
  if (!isTest) {
    app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
  }
  app.use(apiRateLimiter);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "encore-api", time: new Date().toISOString() });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/regions", regionsRouter);
  app.use("/api/brands", brandsRouter);
  app.use("/api/style-tags", styleTagsRouter);
  app.use("/api/size-chart", sizeChartRouter);
  app.use("/api/listings", listingsRouter);
  app.use("/api/resellers", resellersRouter);
  app.use("/api/search", searchRouter);
  app.use("/api/wishlist", wishlistRouter);
  app.use("/api/feed", feedRouter);
  app.use("/api/reports", reportsRouter);
  app.use("/api/offers", offersRouter);
  app.use("/api/addresses", addressesRouter);
  app.use("/api/orders", ordersRouter);
  app.use("/api/payouts", payoutsRouter);
  app.use("/api/devices", devicesRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/chat", chatRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
