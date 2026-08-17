import { Router } from "express";
import { optionalAuth } from "../../middleware/auth";
import { searchQuerySchema, suggestionsQuerySchema } from "./search.schemas";
import { getSuggestions, searchListings } from "./search.service";

export const searchRouter = Router();

searchRouter.get("/listings", optionalAuth, async (req, res) => {
  const filters = searchQuerySchema.parse(req.query);
  const result = await searchListings(filters, req.userId);
  res.json(result);
});

searchRouter.get("/suggestions", async (req, res) => {
  const { q } = suggestionsQuerySchema.parse(req.query);
  const suggestions = await getSuggestions(q);
  res.json({ suggestions });
});
