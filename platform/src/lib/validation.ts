import { z } from "zod";

/** Empty form fields arrive as "" — store them as null. */
const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null);

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .transform((v) => {
    if (v === "") return null;
    return /^https?:\/\//i.test(v) ? v : `https://${v}`;
  })
  .pipe(z.url({ message: "Enter a valid website address" }).nullable())
  .nullable()
  .optional()
  .transform((v) => v ?? null);

const optionalEmail = z
  .string()
  .trim()
  .max(320)
  .transform((v) => (v === "" ? null : v.toLowerCase()))
  .pipe(z.email({ message: "Enter a valid email address" }).nullable())
  .nullable()
  .optional()
  .transform((v) => v ?? null);

const optionalPhone = z
  .string()
  .trim()
  .max(40)
  .refine((v) => v === "" || /^[+\d][\d\s()-]{5,}$/.test(v), "Enter a valid phone number")
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional()
  .transform((v) => v ?? null);

export const clientInput = z.object({
  name: z.string().trim().min(1, "Business name is required").max(200),
  industry: optionalText(120),
  website: optionalUrl,
  phone: optionalPhone,
  whatsapp: optionalPhone,
  email: optionalEmail,
  address: optionalText(300),
  city: optionalText(120),
  region: optionalText(120),
  country: z.string().trim().min(1).max(120).default("South Africa"),
  notes: optionalText(5000),
});
export type ClientInput = z.infer<typeof clientInput>;

export const serviceInput = z.object({
  name: z.string().trim().min(1, "Service name is required").max(200),
  description: optionalText(1000),
});

export const locationInput = z.object({
  name: z.string().trim().min(1, "Location is required").max(200),
  radiusKm: z
    .union([z.literal(""), z.coerce.number().int().min(1).max(500)])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
});

export const competitorInput = z.object({
  name: z.string().trim().min(1, "Competitor name is required").max(200),
  website: optionalUrl,
  notes: optionalText(1000),
});

export const factInput = z.object({
  category: z.enum([
    "service",
    "price",
    "guarantee",
    "certification",
    "award",
    "location",
    "claim",
    "other",
  ]),
  statement: z.string().trim().min(3, "Write the fact in a sentence").max(500),
  source: optionalText(300),
});

export const userInput = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().toLowerCase().pipe(z.email({ message: "Enter a valid email address" })),
  password: z.string().min(10, "Password must be at least 10 characters").max(200),
  role: z.enum(["admin", "manager", "viewer"]),
});

export const setupInput = z.object({
  agencyName: z.string().trim().min(1, "Agency name is required").max(200),
  name: z.string().trim().min(1, "Your name is required").max(120),
  email: z.string().trim().toLowerCase().pipe(z.email({ message: "Enter a valid email address" })),
  password: z.string().min(10, "Password must be at least 10 characters").max(200),
});

/** Flatten zod issues into { field: message } for forms. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
