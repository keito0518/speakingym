/* Speakingym conversion events. No SDK, cookies, storage, or network requests.
 * Events are sent ONLY when an approved analytics integration defines window.gtag.
 * Never add free-text responses, tokens, user identifiers, URLs, or query strings.
 */
(function (root) {
  "use strict";
  const EVENTS = Object.freeze({
    sg_home_cta: Object.freeze({ destination: ["sprint", "ai"] }),
    sg_sprint_start: Object.freeze({ mode: ["standard", "weak_review"] }),
    sg_sprint_complete: Object.freeze({ result: ["timer", "early"] }),
    sg_ai_scene_start: Object.freeze({}),
    sg_ai_first_reply: Object.freeze({})
  });
  function track(name, properties) {
    if (!Object.prototype.hasOwnProperty.call(EVENTS, name)) return false;
    if (typeof root.gtag !== "function") return false;
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
