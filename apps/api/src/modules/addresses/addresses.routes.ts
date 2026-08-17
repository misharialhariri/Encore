import { Router } from "express";
import { prisma } from "../../config/prisma";
import { requireAuth } from "../../middleware/auth";
import { AppError } from "../../utils/AppError";
import { createAddressSchema } from "./addresses.schemas";

export const addressesRouter = Router();

addressesRouter.use(requireAuth);

addressesRouter.get("/", async (req, res) => {
  const addresses = await prisma.address.findMany({
    where: { userId: req.userId! },
    include: { city: { include: { region: true } } },
    orderBy: { id: "desc" },
  });
  res.json({ addresses });
});

addressesRouter.post("/", async (req, res) => {
  const input = createAddressSchema.parse(req.body);
  const address = await prisma.address.create({
    data: { ...input, userId: req.userId! },
    include: { city: { include: { region: true } } },
  });
  res.status(201).json({ address });
});

addressesRouter.delete("/:id", async (req, res) => {
  const address = await prisma.address.findUnique({ where: { id: req.params.id } });
  if (!address) throw AppError.notFound("ADDRESS_NOT_FOUND", "Address not found");
  if (address.userId !== req.userId) throw AppError.forbidden("NOT_ADDRESS_OWNER", "You do not own this address");

  await prisma.address.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
