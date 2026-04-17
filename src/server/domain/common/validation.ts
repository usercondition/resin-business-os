import { z } from "zod";

export const customerInputSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  preferredContactChannel: z.string().optional(),
  defaultAddress: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export const leadInputSchema = z.object({
  customerId: z.string().cuid().optional(),
  source: z.string().min(2),
  externalSourceId: z.string().optional(),
  title: z.string().min(2),
  description: z.string().optional(),
  estimatedValue: z.number().nonnegative().optional(),
  nextFollowUpAt: z.coerce.date().optional(),
});

export const paymentInputSchema = z.object({
  orderId: z.string().cuid(),
  customerId: z.string().cuid(),
  amount: z.number().positive(),
  method: z.enum(["CASH_APP", "VENMO", "ZELLE"]),
  paidAt: z.coerce.date(),
  referenceCode: z.string().optional(),
  notes: z.string().optional(),
});
