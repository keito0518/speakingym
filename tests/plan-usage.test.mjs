import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const code = readFileSync(new URL("../plan-usage.js", import.meta.url), "utf8");

async function evaluate(data, signedIn = true) {
  const badge = { textContent: "" };
  const notes = ["sessions", "teacher"].map(kind => ({
    hidden: true,
    getAttribute: name => name === "data-sg-quota-exhausted" ? kind : null
  }));
  const handlers = {};
  const window = {
    speakingymAccount: { getIdToken: async () => signedIn ? "signed-token" : null },
    addEventListener: (name, fn) => { handlers[name] = fn; }
  };
  const document = {
    querySelectorAll: selector => selector === "[data-sg-quota]" ? [badge] :
      selector === "[data-sg-quota-exhausted]" ? notes : []
  };
  let calls = 0;
  const fetch = async (url, options) => {
    calls++;
    assert.match(url, /\/entitlement$/);
    assert.equal(options.headers.Authorization, "Bearer signed-token");
    assert.equal(options.cache, "no-store");
    return data === "offline" ? { ok: false } : { ok: true, json: async () => data };
  };
  new Function("window", "document", "fetch", code)(window, document, fetch);
  await window.speakingymQuota.refresh();
  return { badge: badge.textContent, sessions: !notes[0].hidden, teacher: !notes[1].hidden, handlers, calls };
}

test("Free shows warnings only for categories at zero", async () => {
  const used = await evaluate({ plan: "free", limits: { sessions: 5, teacher: 3 }, used: { sessions: 5, teacher: 2 } });
  assert.match(used.badge, /0\/5/);
  assert.match(used.badge, /1\/3/);
  assert.equal(used.sessions, true);
  assert.equal(used.teacher, false);
  assert.equal(typeof used.handlers.focus, "function");
  const empty = await evaluate({ plan: "free", limits: { sessions: 5, teacher: 3 }, used: { sessions: 5, teacher: 3 } });
  assert.equal(empty.sessions, true);
  assert.equal(empty.teacher, true);
});

test("Free with remaining usage never shows exhausted warnings", async () => {
  const value = await evaluate({ plan: "free", limits: { sessions: 5, teacher: 3 }, used: { sessions: 2, teacher: 1 } });
  assert.match(value.badge, /3\/5/);
  assert.deepEqual([value.sessions, value.teacher], [false, false]);
});

test("Pro never displays Free exhausted warnings", async () => {
  const value = await evaluate({ plan: "pro", limits: { sessions: null, teacher: null }, used: { sessions: 20, teacher: 10 } });
  assert.match(value.badge, /Pro/);
  assert.deepEqual([value.sessions, value.teacher], [false, false]);
});

test("guest does not call a quota endpoint", async () => {
  const value = await evaluate(null, false);
  assert.match(value.badge, /Googleログイン/);
  assert.equal(value.calls, 0);
});

test("network failure keeps actions server-controlled without false exhaustion display", async () => {
  const value = await evaluate("offline");
  assert.match(value.badge, /取得できませんでした/);
  assert.deepEqual([value.sessions, value.teacher], [false, false]);
});
