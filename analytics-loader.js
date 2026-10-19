/* Load approved GA4 only when Speakingym has a valid site-specific measurement ID.
 * With an empty config: NO third-party scripts, cookies or network requests.
 * Never send English answers, transcripts, accounts or auth details as event parameters.
 */
(function (root, doc) {
  "use strict";
  const id = typeof root.SPEAKINGYM_GA4_ID === "string" ? root.SPEAKINGYM_GA4_ID.trim() : "";
  if (!/^G-[A-Z0-9]{6,16}$/.test(id)) return;
  if (!doc || !doc.head || typeof doc.createElement !== "function") return;

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
})(window, document);
