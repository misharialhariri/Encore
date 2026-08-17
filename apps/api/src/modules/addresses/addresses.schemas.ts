import { z } from "zod";

export const createAddressSchema = z.object({
  label: z.string().trim().min(1).max(50),
  cityId: z.string().uuid(),
  district: z.string().trim().min(1).max(100),
  street: z.string().trim().min(1).max(200),
  lat: z.number().optional(),
  lng: z.number().optional(),
});
