import { z } from "zod";

export const createOrderSchema = z
  .object({
    listingId: z.string().uuid(),
    offerId: z.string().uuid().optional(),
    deliveryMethod: z.enum(["SHIPPING", "MEETUP"]),
    addressId: z.string().uuid().optional(),
    meetupLat: z.number().optional(),
    meetupLng: z.number().optional(),
    meetupDescription: z.string().trim().max(200).optional(),
  })
  .refine(
    (data) =>
      data.deliveryMethod === "SHIPPING"
        ? Boolean(data.addressId)
        : data.meetupLat != null && data.meetupLng != null,
    { message: "addressId is required for shipping; meetupLat/meetupLng are required for a meetup" }
  );

export const shipOrderSchema = z.object({
  trackingNumber: z.string().trim().min(1).max(100),
  courierName: z.string().trim().min(1).max(100),
  estimatedDeliveryDate: z.string().datetime().optional(),
});
