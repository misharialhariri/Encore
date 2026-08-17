import { z } from "zod";

export const listUsersQuerySchema = z.object({
  query: z.string().trim().max(200).optional(),
});
