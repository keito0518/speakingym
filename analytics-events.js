/* Speakingym conversion events. No SDK, cookies, storage, or network requests.
 * Events are sent ONLY after the site-specific GA4 integration is enabled.
 * Never add free-text responses, tokens, user identifiers, URLs, or query strings.
 */
(function (root) {
  "use strict";
  const EVENTS = Object.freeze({
    sg_home_cta: Object.freeze({ destination: ["sprint", "ai", "freeze"] }),
    sg_sprint_start: Object.freeze({ mode: ["standard", "weak_review", "personal_workout"] }),
    sg_sprint_complete: Object.freeze({ result: ["timer", "early"] }),
    sg_ai_scene_start: Object.freeze({}),
    sg_ai_first_reply: Object.freeze({}),
    sg_freeze_from_ai: Object.freeze({}),
    sg_freeze_start: Object.freeze({source:['scripted','ai']}),
    sg_freeze_strategy: Object.freeze({strategy:['misunderstood','words','surprise','unsure']}),
    sg_freeze_coach_request: Object.freeze({answers:['one','two']}),
    sg_freeze_self_report: Object.freeze({
      source: ["scripted", "ai"], outcome: ["said_it", "not_yet"]
    }),
    sg_freeze_revenge: Object.freeze({})
  });
  function track(name, properties) {
    if (!Object.prototype.hasOwnProperty.call(EVENTS, name)) return false;
    if (root.SPEAKINGYM_GA4_READY !== true || typeof root.gtag !== "function") return false;
    const allowed = EVENTS[name];
    const safe = {};
    if (properties && typeof properties === "object") {
      for (const key of Object.keys(allowed)) {
        if (Object.prototype.hasOwnProperty.call(properties, key) &&
            allowed[key].includes(properties[key])) safe[key] = properties[key];
      }
    }
    try {
      root.gtag("event", name, safe);
      return true;
    } catch (_) {
      // Analytics must never interrupt an English-learning session.
      return false;
    }
  }
  root.speakingymAnalytics = Object.freeze({ track });
})(window);
