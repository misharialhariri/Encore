import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { getPlatformSettingNumber } from "../../services/platformSettings";
import { createInvoice, getInvoice, moyasarConfigured } from "../../services/moyasar";
import { notify, NotificationType } from "../../services/notifications";
import { env, isProduction } from "../../config/env";
import type { Order, Prisma } from "@prisma/client";
import type { z } from "zod";
import type { createOrderSchema, shipOrderSchema } from "./orders.schemas";

const ORDER_INCLUDE = {
  listing: { include: { images: { orderBy: { position: "asc" as const }, take: 1 } } },
  address: { include: { city: true } },
  payment: true,
  buyer: { select: { id: true, displayName: true, profilePhotoUrl: true, phoneNumber: true } },
  reseller: { select: { id: true, displayName: true, profilePhotoUrl: true, phoneNumber: true } },
} satisfies Prisma.OrderInclude;

type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>;

function toPublicOrder(order: OrderWithRelations) {
  return {
    id: order.id,
    status: order.status,
    listing: {
      id: order.listing.id,
      title: order.listing.title,
      coverImageUrl: order.listing.images[0]?.url ?? null,
    },
    buyer: order.buyer,
    reseller: order.reseller,
    itemPrice: order.itemPrice.toNumber(),
    shippingFee: order.shippingFee.toNumber(),
    platformFee: order.platformFee.toNumber(),
    totalAmount: order.totalAmount.toNumber(),
    deliveryMethod: order.deliveryMethod,
    address: order.address
      ? {
          id: order.address.id,
          label: order.address.label,
          district: order.address.district,
          street: order.address.street,
          city: order.address.city.nameEn,
        }
      : null,
    meetupLat: order.meetupLat,
    meetupLng: order.meetupLng,
    meetupDescription: order.meetupDescription,
    trackingNumber: order.trackingNumber,
    courierName: order.courierName,
    estimatedDeliveryDate: order.estimatedDeliveryDate,
    payment: order.payment
      ? { status: order.payment.status, escrowStatus: order.payment.escrowStatus, method: order.payment.method }
      : null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

type CreateOrderInput = z.infer<typeof createOrderSchema>;
type ShipOrderInput = z.infer<typeof shipOrderSchema>;

export async function createOrder(buyerId: string, input: CreateOrderInput) {
  const listing = await prisma.listing.findUnique({ where: { id: input.listingId } });
  if (!listing) throw AppError.notFound("LISTING_NOT_FOUND", "Listing not found");
  if (listing.resellerId === buyerId) {
    throw AppError.badRequest("CANNOT_BUY_OWN_LISTING", "You cannot buy your own listing");
  }
  if (listing.status !== "ACTIVE") {
    throw AppError.badRequest("LISTING_NOT_AVAILABLE", "This listing is no longer available");
  }

  let itemPrice = listing.askingPrice.toNumber();

  if (input.offerId) {
    const offer = await prisma.offer.findUnique({ where: { id: input.offerId } });
    if (!offer || offer.listingId !== listing.id || offer.buyerId !== buyerId) {
      throw AppError.badRequest("INVALID_OFFER", "This offer does not apply to this listing/buyer");
    }
    if (offer.status !== "ACCEPTED") {
      throw AppError.badRequest("OFFER_NOT_ACCEPTED", "This offer has not been accepted by the reseller");
    }
    itemPrice = offer.offerPrice.toNumber();
  }

  if (input.deliveryMethod === "SHIPPING") {
    if (!listing.shippingAvailable) {
      throw AppError.badRequest("SHIPPING_NOT_AVAILABLE", "This reseller does not offer shipping for this item");
    }
    const address = await prisma.address.findUnique({ where: { id: input.addressId! } });
    if (!address || address.userId !== buyerId) {
      throw AppError.badRequest("INVALID_ADDRESS", "Address not found for this buyer");
    }
  }

  const shippingFee = input.deliveryMethod === "SHIPPING" ? await getPlatformSettingNumber("flat_shipping_fee_sar", 0) : 0;
  const serviceFeePct = await getPlatformSettingNumber("service_fee_pct", 10);
  const platformFee = Math.round(itemPrice * (serviceFeePct / 100) * 100) / 100;
  const totalAmount = Math.round((itemPrice + shippingFee + platformFee) * 100) / 100;

  const [order] = await prisma.$transaction([
    prisma.order.create({
      data: {
        buyerId,
        resellerId: listing.resellerId,
        listingId: listing.id,
        offerId: input.offerId,
        itemPrice,
        shippingFee,
        platformFee,
        totalAmount,
        deliveryMethod: input.deliveryMethod,
        addressId: input.deliveryMethod === "SHIPPING" ? input.addressId : undefined,
        meetupLat: input.deliveryMethod === "MEETUP" ? input.meetupLat : undefined,
        meetupLng: input.deliveryMethod === "MEETUP" ? input.meetupLng : undefined,
        meetupDescription: input.deliveryMethod === "MEETUP" ? input.meetupDescription : undefined,
        status: "PLACED",
      },
      include: ORDER_INCLUDE,
    }),
    prisma.listing.update({ where: { id: listing.id }, data: { status: "SOLD" } }),
  ]);

  return toPublicOrder(order);
}

async function requireParticipant(userId: string, orderId: string): Promise<OrderWithRelations> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: ORDER_INCLUDE });
  if (!order) throw AppError.notFound("ORDER_NOT_FOUND", "Order not found");
  if (userId !== order.buyerId && userId !== order.resellerId) {
    throw AppError.forbidden("NOT_ORDER_PARTICIPANT", "You are not part of this order");
  }
  return order;
}

export async function getOrderDetail(userId: string, orderId: string) {
  const order = await requireParticipant(userId, orderId);
  return toPublicOrder(order);
}

export async function listMineAsBuyer(buyerId: string, status?: Order["status"]) {
  const orders = await prisma.order.findMany({
    where: { buyerId, ...(status ? { status } : {}) },
    include: ORDER_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return orders.map(toPublicOrder);
}

export async function listMineAsReseller(resellerId: string, status?: Order["status"]) {
  const orders = await prisma.order.findMany({
    where: { resellerId, ...(status ? { status } : {}) },
    include: ORDER_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return orders.map(toPublicOrder);
}

export async function initiateCheckout(buyerId: string, orderId: string) {
  const order = await requireParticipant(buyerId, orderId);
  if (order.buyerId !== buyerId) throw AppError.forbidden("NOT_ORDER_BUYER", "Only the buyer can pay for this order");
  if (order.payment?.status === "CAPTURED") {
    throw AppError.badRequest("ALREADY_PAID", "This order has already been paid");
  }

  const callbackUrl = `${env.API_PUBLIC_URL}/api/orders/${order.id}/payment-callback`;
  const invoice = await createInvoice(order.totalAmount.toNumber(), `Encore order ${order.id}`, callbackUrl);

  await prisma.payment.upsert({
    where: { orderId: order.id },
    update: { providerPaymentId: invoice.id, status: "AUTHORIZED" },
    create: {
      orderId: order.id,
      provider: "MOYASAR",
      providerPaymentId: invoice.id,
      amount: order.totalAmount,
      method: "CARD",
      status: "AUTHORIZED",
    },
  });

  return { checkoutUrl: invoice.url, devMode: !moyasarConfigured, invoiceId: invoice.id };
}

export async function verifyAndApplyPayment(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { payment: true } });
  if (!order?.payment) return { applied: false };
  if (order.payment.status === "CAPTURED") return { applied: true };
  if (order.payment.providerPaymentId.startsWith("dev_")) return { applied: false };

  const invoice = await getInvoice(order.payment.providerPaymentId);

  if (invoice.status === "paid") {
    await prisma.payment.update({
      where: { orderId },
      data: { status: "CAPTURED", escrowStatus: "HELD" },
    });
    await notify(order.resellerId, NotificationType.ORDER_STATUS_UPDATE, {
      title: "New order",
      body: "You have a new paid order to confirm",
      data: { orderId, status: "PLACED" },
    });
    return { applied: true };
  }

  if (invoice.status === "failed" || invoice.status === "canceled") {
    await prisma.$transaction([
      prisma.payment.update({ where: { orderId }, data: { status: "FAILED" } }),
      prisma.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } }),
      prisma.listing.update({ where: { id: order.listingId }, data: { status: "ACTIVE" } }),
    ]);
    return { applied: false };
  }

  return { applied: false };
}

/** Dev-only: simulates a successful Moyasar callback when no merchant
 * account is configured, so the rest of the order lifecycle (confirm,
 * ship, deliver, confirm-receipt, escrow release) stays testable. */
export async function devSimulatePayment(buyerId: string, orderId: string) {
  if (moyasarConfigured || isProduction) {
    throw AppError.badRequest("DEV_SIMULATION_DISABLED", "Moyasar is configured — use the real checkout flow");
  }
  const order = await requireParticipant(buyerId, orderId);
  if (order.buyerId !== buyerId) throw AppError.forbidden("NOT_ORDER_BUYER", "Only the buyer can pay for this order");

  await prisma.payment.upsert({
    where: { orderId },
    update: { status: "CAPTURED", escrowStatus: "HELD" },
    create: {
      orderId,
      provider: "MOYASAR",
      providerPaymentId: `dev_${orderId}`,
      amount: order.totalAmount,
      method: "CARD",
      status: "CAPTURED",
      escrowStatus: "HELD",
    },
  });

  await notify(order.resellerId, NotificationType.ORDER_STATUS_UPDATE, {
    title: "New order",
    body: "You have a new paid order to confirm",
    data: { orderId, status: "PLACED" },
  });

  return { applied: true };
}

function requirePaid(order: OrderWithRelations) {
  if (order.payment?.status !== "CAPTURED") {
    throw AppError.badRequest("ORDER_NOT_PAID", "This order has not been paid for yet");
  }
}

export async function confirmOrder(resellerId: string, orderId: string) {
  const order = await requireParticipant(resellerId, orderId);
  if (order.resellerId !== resellerId) throw AppError.forbidden("NOT_ORDER_RESELLER", "Only the reseller can confirm this order");
  if (order.status !== "PLACED") throw AppError.badRequest("INVALID_ORDER_STATUS", `Cannot confirm an order in status ${order.status}`);
  requirePaid(order);

  const updated = await prisma.order.update({ where: { id: orderId }, data: { status: "CONFIRMED" }, include: ORDER_INCLUDE });
  await notify(order.buyerId, NotificationType.ORDER_STATUS_UPDATE, {
    title: "Order confirmed",
    body: `The reseller confirmed your order for "${order.listing.title}"`,
    data: { orderId, status: "CONFIRMED" },
  });
  return toPublicOrder(updated);
}

export async function shipOrder(resellerId: string, orderId: string, input: ShipOrderInput) {
  const order = await requireParticipant(resellerId, orderId);
  if (order.resellerId !== resellerId) throw AppError.forbidden("NOT_ORDER_RESELLER", "Only the reseller can ship this order");
  if (order.status !== "CONFIRMED") throw AppError.badRequest("INVALID_ORDER_STATUS", `Cannot ship an order in status ${order.status}`);

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "SHIPPED",
      trackingNumber: input.trackingNumber,
      courierName: input.courierName,
      estimatedDeliveryDate: input.estimatedDeliveryDate ? new Date(input.estimatedDeliveryDate) : undefined,
    },
    include: ORDER_INCLUDE,
  });
  await notify(order.buyerId, NotificationType.ORDER_STATUS_UPDATE, {
    title: "Order shipped",
    body: `"${order.listing.title}" has shipped — tracking: ${input.trackingNumber}`,
    data: { orderId, status: "SHIPPED" },
  });
  return toPublicOrder(updated);
}

export async function markDelivered(resellerId: string, orderId: string) {
  const order = await requireParticipant(resellerId, orderId);
  if (order.resellerId !== resellerId) throw AppError.forbidden("NOT_ORDER_RESELLER", "Only the reseller can mark this order delivered");
  if (order.status !== "SHIPPED") throw AppError.badRequest("INVALID_ORDER_STATUS", `Cannot mark an order in status ${order.status} as delivered`);

  const updated = await prisma.order.update({ where: { id: orderId }, data: { status: "DELIVERED" }, include: ORDER_INCLUDE });
  await notify(order.buyerId, NotificationType.ORDER_STATUS_UPDATE, {
    title: "Order delivered",
    body: `"${order.listing.title}" was marked as delivered — confirm receipt when you have it`,
    data: { orderId, status: "DELIVERED" },
  });
  return toPublicOrder(updated);
}

export async function confirmReceipt(buyerId: string, orderId: string) {
  const order = await requireParticipant(buyerId, orderId);
  if (order.buyerId !== buyerId) throw AppError.forbidden("NOT_ORDER_BUYER", "Only the buyer can confirm receipt");
  if (order.status !== "SHIPPED" && order.status !== "DELIVERED") {
    throw AppError.badRequest("INVALID_ORDER_STATUS", `Cannot confirm receipt for an order in status ${order.status}`);
  }

  await prisma.$transaction([
    prisma.order.update({ where: { id: orderId }, data: { status: "COMPLETED" } }),
    prisma.payment.update({ where: { orderId }, data: { escrowStatus: "RELEASED" } }),
  ]);

  const updated = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: ORDER_INCLUDE });
  await notify(order.resellerId, NotificationType.ORDER_STATUS_UPDATE, {
    title: "Payment released",
    body: `The buyer confirmed receipt of "${order.listing.title}" — funds are on their way to you`,
    data: { orderId, status: "COMPLETED" },
  });
  return toPublicOrder(updated);
}
