import test from "node:test";
import assert from "node:assert/strict";
import worker from "./ai-worker.js";

const ORIGIN = "https://keito0518.github.io";
const ENDPOINT = "https://speakingym-test.workers.dev/";
const goodLimit = { limit: async () => ({ success: true }) };
const enabled = () => ({
  GEMINI_API_KEY: "test-key-not-real",
  ALLOW_AI: "true",
  USER_LIMIT: goodLimit,
  GLOBAL_LIMIT: goodLimit
});
const payload = {
  level: "standard",
  userText: "Excuse me, I ordered an iced oat latte. Could you remake it?",
  facts: { problem: false, iced: false, oat: false, fix: false },
  history: [{ role: "assistant", content: "Is everything okay?" }]
};
const request = (data = payload, origin = ORIGIN) =>
  new Request(ENDPOINT, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

test("health only indicates ready with key AND owner opt-in", async () => {
  const req = new Request(ENDPOINT + "health", { method: "GET" });
  const disabledResult = await worker.fetch(req, { ...enabled(), ALLOW_AI: "false" });
  assert.equal((await disabledResult.json()).aiConfigured, false);
  const readyResult = await worker.fetch(req, enabled());
  assert.equal((await readyResult.json()).aiConfigured, true);
});

test("Gemini remains disabled by default even when API key exists", async (t) => {
  const upstream = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("Should never contact Gemini");
  });
  const result = await worker.fetch(request(), { ...enabled(), ALLOW_AI: undefined });
  assert.equal(result.status, 503);
  assert.equal((await result.json()).error, "ai_disabled");
  assert.equal(upstream.mock.callCount(), 0);
});

test("requests from other web origins are rejected", async () => {
  const result = await worker.fetch(request(payload, "https://attacker.example"), enabled());
  assert.equal(result.status, 403);
});

test("invalid or oversized user speech cannot use the AI", async (t) => {
  const upstream = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("Should never contact Gemini");
  });
  const empty = await worker.fetch(request({ ...payload, userText: " " }), enabled());
  assert.equal(empty.status, 400);
  const large = await worker.fetch(request({ ...payload, userText: "a".repeat(451) }), enabled());
  assert.equal(large.status, 400);
  assert.equal(upstream.mock.callCount(), 0);
});

test("throttled requests never call Gemini", async (t) => {
  const upstream = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("Should never contact Gemini");
  });
  const result = await worker.fetch(request(), {
    ...enabled(), USER_LIMIT: { limit: async () => ({ success: false }) }
  });
  assert.equal(result.status, 429);
  assert.equal((await result.json()).error, "rate_limited");
  assert.equal(upstream.mock.callCount(), 0);
});

test("free-tier quota exhaustion pauses AI without retries", async (t) => {
  const upstream = t.mock.method(globalThis, "fetch", async () => new Response(
    JSON.stringify({ error: { message: "Resource exhausted" } }),
    { status: 429, headers: { "Content-Type": "application/json" } }
  ));
  const result = await worker.fetch(request(), enabled());
  assert.equal(result.status, 429);
  assert.equal((await result.json()).error, "ai_limit_reached");
  assert.equal(upstream.mock.callCount(), 1);
});

test("successful Gemini JSON response returns conversational reply and facts", async (t) => {
  const upstream = t.mock.method(globalThis, "fetch", async () => new Response(
    JSON.stringify({ candidates: [{ content: { parts: [{
      text: JSON.stringify({
        reply: "Of course! Let me make you the correct iced oat latte.",
        missionState: { problem: true, iced: true, oat: true, fix: true }
      })
    }] } }] }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  ));
  const result = await worker.fetch(request(), enabled());
  assert.equal(result.status, 200);
  const body = await result.json();
  assert.match(body.reply, /iced oat latte/);
  assert.deepEqual(body.missionState, { problem: true, iced: true, oat: true, fix: true });
  const opts = upstream.mock.calls[0].arguments[1];
  assert.equal(opts.headers["x-goog-api-key"], "test-key-not-real");
  assert.match(opts.body, /gemini/i);
});
