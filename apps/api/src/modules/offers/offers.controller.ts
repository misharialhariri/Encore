import { RequestHandler } from "express";
import * as offersService from "./offers.service";
import { counterOfferSchema, createOfferSchema } from "./offers.schemas";
import { AppError } from "../../utils/AppError";

export const create: RequestHandler = async (req, res) => {
  const { listingId, offerPrice } = createOfferSchema.parse(req.body);
  const offer = await offersService.createOffer(req.userId!, listingId, offerPrice);
  res.status(201).json({ offer });
};

export const listMine: RequestHandler = async (req, res) => {
  const offers = await offersService.listMineAsBuyer(req.userId!);
  res.json({ offers });
};

export const listReceived: RequestHandler = async (req, res) => {
  const offers = await offersService.listReceivedAsReseller(req.userId!);
  res.json({ offers });
};

export const getDetail: RequestHandler = async (req, res) => {
  const offer = await offersService.getOfferDetail(req.userId!, req.params.id);
  res.json({ offer });
};

export const accept: RequestHandler = async (req, res) => {
  const offer = await offersService.respondToOffer(req.userId!, req.params.id, "accept");
  res.json({ offer });
};

export const decline: RequestHandler = async (req, res) => {
  const offer = await offersService.respondToOffer(req.userId!, req.params.id, "decline");
  res.json({ offer });
};

export const counter: RequestHandler = async (req, res) => {
  const { offerPrice } = counterOfferSchema.parse(req.body);
  if (!offerPrice) throw AppError.badRequest("COUNTER_PRICE_REQUIRED", "A counter offer price is required");
  const offer = await offersService.respondToOffer(req.userId!, req.params.id, "counter", offerPrice);
  res.json({ offer });
};
