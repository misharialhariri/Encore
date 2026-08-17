import { RequestHandler } from "express";
import { z } from "zod";
import * as ordersService from "./orders.service";
import { createOrderSchema, shipOrderSchema } from "./orders.schemas";

const listQuerySchema = z.object({
  status: z.enum(["PLACED", "CONFIRMED", "SHIPPED", "DELIVERED", "COMPLETED", "CANCELLED", "DISPUTED"]).optional(),
});

export const create: RequestHandler = async (req, res) => {
  const input = createOrderSchema.parse(req.body);
  const order = await ordersService.createOrder(req.userId!, input);
  res.status(201).json({ order });
};

export const listMine: RequestHandler = async (req, res) => {
  const { status } = listQuerySchema.parse(req.query);
  const orders = await ordersService.listMineAsBuyer(req.userId!, status);
  res.json({ orders });
};

export const listSelling: RequestHandler = async (req, res) => {
  const { status } = listQuerySchema.parse(req.query);
  const orders = await ordersService.listMineAsReseller(req.userId!, status);
  res.json({ orders });
};

export const getDetail: RequestHandler = async (req, res) => {
  const order = await ordersService.getOrderDetail(req.userId!, req.params.id);
  res.json({ order });
};

export const checkout: RequestHandler = async (req, res) => {
  const result = await ordersService.initiateCheckout(req.userId!, req.params.id);
  res.json(result);
};

export const paymentCallback: RequestHandler = async (req, res) => {
  const result = await ordersService.verifyAndApplyPayment(req.params.id);
  res.send(`<!doctype html>
<html><body style="font-family: -apple-system, sans-serif; text-align: center; padding: 48px;">
  <h2>${result.applied ? "Payment received" : "Payment not completed"}</h2>
  <p>You can close this window and return to the Encore app.</p>
</body></html>`);
};

export const refreshPaymentStatus: RequestHandler = async (req, res) => {
  const result = await ordersService.verifyAndApplyPayment(req.params.id);
  res.json(result);
};

export const devSimulatePayment: RequestHandler = async (req, res) => {
  const result = await ordersService.devSimulatePayment(req.userId!, req.params.id);
  res.json(result);
};

export const confirm: RequestHandler = async (req, res) => {
  const order = await ordersService.confirmOrder(req.userId!, req.params.id);
  res.json({ order });
};

export const ship: RequestHandler = async (req, res) => {
  const input = shipOrderSchema.parse(req.body);
  const order = await ordersService.shipOrder(req.userId!, req.params.id, input);
  res.json({ order });
};

export const deliver: RequestHandler = async (req, res) => {
  const order = await ordersService.markDelivered(req.userId!, req.params.id);
  res.json({ order });
};

export const confirmReceipt: RequestHandler = async (req, res) => {
  const order = await ordersService.confirmReceipt(req.userId!, req.params.id);
  res.json({ order });
};
