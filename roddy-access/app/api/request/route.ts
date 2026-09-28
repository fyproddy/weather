// Receives a request from the planner and delivers it to RODDY ACCESS
// directly. The visitor doesn't need to open WhatsApp.
//
// Delivery channels (configure one or both; see README):
//   WhatsApp → CALLMEBOT_APIKEY   (message arrives on the RODDY ACCESS WhatsApp)
//   Email    → RESEND_API_KEY     (+ optional REQUEST_EMAIL_TO / REQUEST_EMAIL_FROM)
import { NextResponse } from "next/server";
import { site } from "@/content/site";
import { planningTypes } from "@/content/plan";
import { cleanPlan, labelOf, ownerMessage, type Plan } from "@/lib/request";

export const runtime = "nodejs";

// best-effort flood protection per server instance
const recent = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  hits.push(now);
  recent.set(ip, hits);
  return hits.length > 5;
}

async function sendWhatsApp(text: string) {
  const apikey = process.env.CALLMEBOT_APIKEY;
  if (!apikey) return null;
  const url =
    `https://api.callmebot.com/whatsapp.php?phone=%2B${site.whatsapp}` +
    `&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(apikey)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  const body = await res.text();
  // CallMeBot answers 200 with an HTML page; failures mention an error in the body
  if (!res.ok || /error|invalid|not\s+activated/i.test(body)) throw new Error(`whatsapp: ${res.status}`);
  return "whatsapp";
}

async function sendEmail(plan: Plan, text: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.REQUEST_EMAIL_FROM || "RODDY ACCESS <onboarding@resend.dev>",
      to: [process.env.REQUEST_EMAIL_TO || site.email],
      reply_to: plan.email || undefined,
      subject: `New request — ${plan.name} · ${labelOf(planningTypes, plan.type) || "Enquiry"}`,
      text,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`email: ${res.status}`);
  return "email";
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  // honeypot: people never see this field, bots fill it in
  if (typeof body.website === "string" && body.website) return NextResponse.json({ ok: true });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (limited(ip)) return NextResponse.json({ ok: false, error: "too_many" }, { status: 429 });

  const plan = cleanPlan(body.plan);
  if (!plan) return NextResponse.json({ ok: false, error: "invalid" }, { status: 422 });

  const text = ownerMessage(plan);
  const results = await Promise.allSettled([sendWhatsApp(text), sendEmail(plan, text)]);
  const delivered = results.flatMap((r) => (r.status === "fulfilled" && r.value ? [r.value] : []));
  results.forEach((r) => r.status === "rejected" && console.error("[request]", r.reason));

  if (!delivered.length) {
    const configured = results.some((r) => r.status === "rejected");
    return NextResponse.json(
      { ok: false, error: configured ? "delivery_failed" : "not_configured" },
      { status: configured ? 502 : 503 }
    );
  }
  return NextResponse.json({ ok: true, delivered });
}
