/* Optional Speakingym GA4 analytics: always require site-specific ID AND visitor opt-in.
 * With no ID or no consent, do NOT load Google code or call gtag.
 * Consent is kept locally and never tied to a Firebase account or transcript.
 */
(function (root, doc) {
  "use strict";
  const KEY = "speakingym-ga4-consent-v1";
  const id = typeof root.SPEAKINGYM_GA4_ID === "string" ? root.SPEAKINGYM_GA4_ID.trim() : "";
  if (!/^G-[A-Z0-9]{6,16}$/.test(id)) return;
  if (!doc || !doc.head || typeof doc.createElement !== "function") return;

  function readChoice() {
    try {
      const value = root.localStorage?.getItem(KEY);
      return value === "yes" || value === "no" ? value : "";
    } catch (_) { return ""; }
  }
  let choice = readChoice();

  function storeChoice(value) {
    choice = value;
    try { root.localStorage?.setItem(KEY, value); } catch (_) { /* per-page only */ }
  }
  function enable() {
    if (choice !== "yes" || root.SPEAKINGYM_GA4_READY === true) return false;
    root.dataLayer = Array.isArray(root.dataLayer) ? root.dataLayer : [];
    if (typeof root.gtag !== "function") {
      root.gtag = function () { root.dataLayer.push(arguments); };
    }
    root.gtag("js", new Date());
    root.gtag("config", id, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
    if (!doc.querySelector('script[data-sg-ga4-loader="true"]')) {
      const script = doc.createElement("script");
      script.async = true;
      script.dataset.sgGa4Loader = "true";
      script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id);
      doc.head.appendChild(script);
    }
    root.SPEAKINGYM_GA4_READY = true;
    return true;
  }

  let banner;
  function hideBanner() {
    if (banner?.parentNode) banner.parentNode.removeChild(banner);
    banner = null;
  }
  function renderSettings() {
    const display = doc.getElementById?.("sg-analytics-consent-status");
    if (!display) return;
    display.textContent = choice === "yes"
      ? "任意のアクセス解析：同意済み"
      : choice === "no" ? "任意のアクセス解析：拒否中" : "任意のアクセス解析：未選択（停止中）";
  }
  function accept() {
    storeChoice("yes");
    hideBanner();
    enable();
    renderSettings();
    return true;
  }
  function decline() {
    storeChoice("no");
    // Disable custom conversion events immediately; reload to unload GA4.
    root.SPEAKINGYM_GA4_READY = false;
    hideBanner();
    renderSettings();
    return true;
  }
  const settings = Object.freeze({ accept, decline, status: () => choice });
  root.speakingymGA4Consent = settings;

  function makeButton(text, action, filled) {
    const button = doc.createElement("button");
    button.type = "button";
    button.textContent = text;
    button.style.cssText = "border:1px solid #bad2bc;border-radius:9px;padding:10px 13px;min-height:44px;font:inherit;font-size:13px;font-weight:800;cursor:pointer;background:"+
      (filled ? "#1b4f39;color:#fff;" : "#fff;color:#173c2d;");
    button.addEventListener("click", action);
    return button;
  }
  function showBanner() {
    if (choice || !doc.body || banner) return;
    banner = doc.createElement("aside");
    banner.setAttribute("aria-label", "任意のアクセス解析");
    banner.setAttribute("role", "region");
    banner.style.cssText = "position:fixed;bottom:12px;left:12px;right:12px;z-index:9999;max-width:680px;margin:0 auto;padding:15px 17px;background:#fff;color:#173c2d;border:1px solid #c5d8cb;border-radius:15px;box-shadow:0 8px 35px #132d2340;font:14px/1.7 -apple-system,BlinkMacSystemFont,'Hiragino Sans',Meiryo,sans-serif;";
    const info = doc.createElement("p");
    info.style.cssText = "margin:0 0 10px;font-size:13px;line-height:1.75";
    info.textContent = "利用状況を改善するため、Google Analyticsでアクセス数と練習開始数を測定してもいいですか？同意しなくても無料で練習できます。";
    const actions = doc.createElement("div");
    actions.style.cssText = "display:flex;flex-wrap:wrap;align-items:center;gap:9px";
    actions.appendChild(makeButton("同意する", accept, true));
    actions.appendChild(makeButton("同意しない", decline, false));
    const details = doc.createElement("a");
    details.href = "./privacy.html#analytics-settings";
    details.textContent = "詳細・設定変更";
    details.style.cssText = "font-size:12px;color:#1b4f39;text-decoration:underline";
    actions.appendChild(details);
    banner.appendChild(info);
    banner.appendChild(actions);
    doc.body.appendChild(banner);
  }
  function initUI() {
    renderSettings();
    const yes = doc.getElementById?.("sg-analytics-accept");
    const no = doc.getElementById?.("sg-analytics-decline");
    yes?.addEventListener("click", accept);
    no?.addEventListener("click", function () {
      const wasActive = root.SPEAKINGYM_GA4_READY === true;
      decline();
      if (wasActive && root.location?.reload) root.location.reload();
    });
    showBanner();
  }
  if (choice === "yes") enable();
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", initUI, { once: true });
  else initUI();
})(window, document);
