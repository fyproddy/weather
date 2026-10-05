import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { LIMITS, TARGET_COUNTS } from "@/lib/ad-copy";

export const AD_WRITER_MODEL = "claude-opus-5-5";

/** What Claude must return. Length limits are enforced after, by checkAdLine. */
const line = z.object({
  text: z.string(),
  fact_ids: z.array(z.string()).describe("Labels (F1, F2…) of the verified facts this line relies on; empty if it uses none."),
});
export const AdCopySchema = z.object({
  headlines: z.array(line),
  descriptions: z.array(line),
  callouts: z.array(line),
  notes: z.string().describe("Anything the reviewer should know, e.g. claims you avoided because no verified fact supported them."),
});
export type AdCopy = z.infer<typeof AdCopySchema>;

export type AdWriterInput = {
  clientName: string;
  industry: string | null;
  website: string | null;
  services: string[];
  locations: string[];
  facts: { id: string; text: string }[];
  focus: string;
  instructions: string | null;
  keywords: string[];
};

export type AdWriter = (input: AdWriterInput) => Promise<AdCopy>;

export class AdWriterError extends Error {}

const SYSTEM = `You write Google Ads search ad copy for a South African digital marketing agency's clients.

Truthfulness is the most important rule. The client's verified facts are the only claims you may make. Never invent or imply prices, discounts, guarantees, warranties, certifications, accreditations, insurance, awards, ratings, years of experience, response times, availability (such as 24/7 or same-day), services, or service areas that are not in the verified facts, services list or areas list you are given. If a persuasive line would need a claim you don't have, write a different line and mention the gap in notes. Superlatives like "best", "#1" or "leading" count as claims.

Write in South African English. Be specific and benefit-led, mention services and areas where useful, and vary the angles (service, area, problem solved, verified offer, call to action) so Google can rotate them. Respect Google's limits exactly: headlines at most ${LIMITS.headline} characters, descriptions at most ${LIMITS.description}, callouts at most ${LIMITS.callout}. Count characters including spaces.`;

function userPrompt(i: AdWriterInput) {
  const list = (xs: string[]) => (xs.length ? xs.map((x) => `- ${x}`).join("\n") : "- (none provided)");
  return `Client: ${i.clientName}
Industry: ${i.industry ?? "not specified"}
Website: ${i.website ?? "not specified"}

Services the client offers:
${list(i.services)}

Areas the client serves:
${list(i.locations)}

Verified facts (the only claims you may make):
${i.facts.length ? i.facts.map((f) => `${f.id}: ${f.text}`).join("\n") : "(none — write only plain descriptive copy with no claims)"}

${i.keywords.length ? `Keywords currently converting in their account (use naturally where they fit):\n${list(i.keywords)}\n\n` : ""}Focus for this ad: ${i.focus}
${i.instructions ? `Extra instructions from the agency: ${i.instructions}\n` : ""}
Write ${TARGET_COUNTS.headline} headlines, ${TARGET_COUNTS.description} descriptions and ${TARGET_COUNTS.callout} callouts. For each line, list the labels of the verified facts it relies on.`;
}

/** Calls Claude. Reads ANTHROPIC_API_KEY (and ANTHROPIC_BASE_URL, used by tests) from the environment. */
export const claudeAdWriter: AdWriter = async (input) => {
  if (!process.env.ANTHROPIC_API_KEY) throw new AdWriterError("The AI ad writer isn't set up: add ANTHROPIC_API_KEY to the server settings.");
  const client = new Anthropic({ timeout: 120_000 });
  try {
    const response = await client.beta.messages.parse({
      model: AD_WRITER_MODEL,
      max_tokens: 16000,
      // A request declined by safety classifiers is retried server-side on Anthropic's recommended fallback.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(AdCopySchema) },
      system: SYSTEM,
      messages: [{ role: "user", content: userPrompt(input) }],
    });
    if (response.stop_reason === "refusal") throw new AdWriterError("The AI declined to write this ad. Try rewording the focus or instructions.");
    if (response.stop_reason === "max_tokens") throw new AdWriterError("The AI's answer was cut off. Please try again.");
    if (!response.parsed_output) throw new AdWriterError("The AI returned something unexpected. Please try again.");
    return response.parsed_output;
  } catch (e) {
    if (e instanceof AdWriterError) throw e;
    if (e instanceof Anthropic.AuthenticationError) throw new AdWriterError("The Anthropic API key was rejected. Check ANTHROPIC_API_KEY in the server settings.");
    if (e instanceof Anthropic.PermissionDeniedError) throw new AdWriterError("This Anthropic API key doesn't have access to the model. Check the key's workspace.");
    if (e instanceof Anthropic.RateLimitError) throw new AdWriterError("The AI is busy right now. Wait a minute and try again.");
    if (e instanceof Anthropic.BadRequestError) throw new AdWriterError(`The AI rejected the request: ${e.message}`);
    if (e instanceof Anthropic.APIConnectionError) throw new AdWriterError("Couldn't reach the AI service. Check the connection and try again.");
    if (e instanceof Anthropic.APIError) throw new AdWriterError(`The AI service had a problem (${e.status}). Please try again.`);
    throw e;
  }
};
