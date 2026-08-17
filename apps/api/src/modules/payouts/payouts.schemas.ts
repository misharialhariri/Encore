import { z } from "zod";

export const bankAccountSchema = z.object({
  iban: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^SA\d{22}$/, "Enter a valid Saudi IBAN (SA followed by 22 digits)"),
  bankName: z.string().trim().min(1).max(100),
  accountHolderName: z.string().trim().min(1).max(100),
});

export const requestPayoutSchema = z.object({
  amount: z.number().positive(),
});
