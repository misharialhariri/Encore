import { Router } from "express";
import { SIZE_CHART } from "./sizeChart";

export const sizeChartRouter = Router();

sizeChartRouter.get("/", (_req, res) => {
  res.json({ sizeChart: SIZE_CHART });
});
