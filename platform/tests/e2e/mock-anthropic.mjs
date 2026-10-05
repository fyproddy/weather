// Stand-in for the Anthropic Messages API, used by the e2e tests.
// Returns fixed ad copy, records the last request (GET /last), and
// returns a 401 when the prompt contains "trigger-auth-error".
import http from "node:http";

let last = null;
const copy = {
  headlines: [
    { text: "Roof Repairs Johannesburg", fact_ids: [] },
    { text: "Free Roof Inspection", fact_ids: ["F1"] },
    { text: "Best Roofers in Pretoria", fact_ids: [] },
    { text: "Waterproofing Specialists Johannesburg", fact_ids: [] },
  ],
  descriptions: [
    { text: "Liquid rubber waterproofing for flat and pitched roofs. Book your free inspection.", fact_ids: ["F1"] },
    { text: "Roof repairs from R999 with a 10 year guarantee.", fact_ids: [] },
  ],
  callouts: [
    { text: "Free Inspection", fact_ids: ["F1"] },
    { text: "Gauteng Wide", fact_ids: [] },
  ],
  notes: "No verified prices or guarantees, so price-led headlines were avoided.",
};

http
  .createServer((req, res) => {
    if (req.method === "GET" && req.url === "/last") {
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(last));
    }
    if (req.method === "GET" && req.url === "/health") return res.end("ok");
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      last = { headers: req.headers, body: JSON.parse(body || "{}") };
      if (body.includes("trigger-auth-error")) {
        res.writeHead(401, { "content-type": "application/json" });
        return res.end(JSON.stringify({ type: "error", error: { type: "authentication_error", message: "invalid x-api-key" } }));
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          id: "msg_test",
          type: "message",
          role: "assistant",
          model: "claude-opus-5-5",
          content: [{ type: "text", text: JSON.stringify(copy) }],
          stop_reason: "end_turn",
          stop_sequence: null,
          usage: { input_tokens: 1000, output_tokens: 500 },
        }),
      );
    });
  })
  .listen(3199);
