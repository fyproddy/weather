// The shape of a plan request, and how it's turned into readable text.
// Shared by the planner (browser) and /api/request (server).
import { areas, budgets, groupSizes, needs, occasions, planningTypes, type Option } from "@/content/plan";

export type Plan = {
  type: string;
  dateFrom: string;
  dateTo: string;
  flexible: boolean;
  dateNote: string;
  group: string;
  occasion: string;
  occasionOther: string;
  needs: string[];
  area: string;
  budget: string;
  notes: string;
  name: string;
  phone: string;
  email: string;
};

export const emptyPlan: Plan = {
  type: "",
  dateFrom: "",
  dateTo: "",
  flexible: false,
  dateNote: "",
  group: "",
  occasion: "",
  occasionOther: "",
  needs: [],
  area: "",
  budget: "",
  notes: "",
  name: "",
  phone: "",
  email: "",
};

export const labelOf = (options: Option[], value: string) => options.find((o) => o.value === value)?.label ?? value;

export const fmtDate = (d: string) =>
  d
    ? new Date(d + "T12:00:00").toLocaleDateString("en-ZA", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Africa/Johannesburg",
      })
    : "";

export const phoneOk = (p: string) => p.replace(/\D/g, "").length >= 9;
export const emailOk = (e: string) => !e || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export function summarise(p: Plan): [string, string][] {
  const when = p.dateFrom
    ? `${fmtDate(p.dateFrom)}${p.dateTo && p.dateTo !== p.dateFrom ? ` – ${fmtDate(p.dateTo)}` : ""}${p.flexible ? " (flexible)" : ""}`
    : p.flexible
      ? `Flexible${p.dateNote ? ` — ${p.dateNote}` : ""}`
      : "";
  return (
    [
      ["Planning", labelOf(planningTypes, p.type)],
      ["When", when],
      ["Group", labelOf(groupSizes, p.group)],
      ["Occasion", p.occasion === "other" && p.occasionOther ? p.occasionOther : labelOf(occasions, p.occasion)],
      ["Needs", p.needs.map((n) => labelOf(needs, n)).join(", ")],
      ["Area", labelOf(areas, p.area)],
      ["Budget", labelOf(budgets, p.budget)],
      ["Notes", p.notes.trim()],
    ] as [string, string][]
  ).filter(([, v]) => v);
}

const contactLines = (p: Plan) => [`Name: ${p.name}`, `Phone: ${p.phone}`, ...(p.email ? [`Email: ${p.email}`] : [])];

/** What the visitor sends if they message us themselves. */
export function visitorMessage(p: Plan) {
  return ["Hi RODDY ACCESS — here's what I'm planning:", "", ...summarise(p).map(([k, v]) => `${k}: ${v}`), "", ...contactLines(p)].join(
    "\n"
  );
}

/** The notification that lands on the RODDY ACCESS phone / inbox. */
export function ownerMessage(p: Plan) {
  const digits = p.phone.replace(/\D/g, "").replace(/^0/, "27");
  return [
    "NEW REQUEST — RODDY ACCESS",
    "",
    ...contactLines(p),
    `Reply on WhatsApp: https://wa.me/${digits}`,
    "",
    ...summarise(p).map(([k, v]) => `${k}: ${v}`),
  ].join("\n");
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const oneOf = (v: unknown, options: Option[]) => (options.some((o) => o.value === v) ? (v as string) : "");
const date = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");

/** Server-side: accept only known values and sensible lengths. */
export function cleanPlan(input: unknown): Plan | null {
  if (!input || typeof input !== "object") return null;
  const i = input as Record<string, unknown>;
  const plan: Plan = {
    type: oneOf(i.type, planningTypes),
    dateFrom: date(i.dateFrom),
    dateTo: date(i.dateTo),
    flexible: i.flexible === true,
    dateNote: str(i.dateNote, 120),
    group: oneOf(i.group, groupSizes),
    occasion: oneOf(i.occasion, occasions),
    occasionOther: str(i.occasionOther, 120),
    needs: Array.isArray(i.needs) ? i.needs.filter((n) => needs.some((o) => o.value === n)).slice(0, 12) : [],
    area: oneOf(i.area, areas),
    budget: oneOf(i.budget, budgets),
    notes: str(i.notes, 2000),
    name: str(i.name, 120),
    phone: str(i.phone, 40),
    email: str(i.email, 160),
  };
  if (!plan.name || !phoneOk(plan.phone) || !emailOk(plan.email)) return null;
  return plan;
}
