/* Read-only, server-authoritative plan usage for practice pages. */
(function () {
  "use strict";
  const API = "https://speakingym-survival-ai.keitokeitokeito0518.workers.dev/";
  const badges = [...document.querySelectorAll("[data-sg-quota]")];
  if (!badges.length) return;
  let requestSequence = 0;

  function show(message) {
    for (const badge of badges) badge.textContent = message;
  }

  async function refresh() {
    const seq = ++requestSequence;
    const getToken = window.speakingymAccount?.getIdToken;
    if (typeof getToken !== "function") {
      show("ログイン情報を確認中…");
      return;
    }
    try {
      const token = await getToken();
      if (seq !== requestSequence) return;
      if (!token) {
        show("Freeの残り回数はGoogleログイン後に表示されます。");
        return;
      }
      const response = await fetch(API + "entitlement", {
        headers: { Authorization: "Bearer " + token },
        cache: "no-store"
      });
      if (seq !== requestSequence) return;
      if (!response.ok) throw Error("entitlement_unavailable");
      const data = await response.json();
      if (seq !== requestSequence) return;
      if (data?.plan === "pro") {
        show("Pro · AI英会話・AI先生は日ごとの回数上限なし（通信・AI提供元の制限あり）");
        return;
      }
      const sessions = data?.limits?.sessions;
      const teacher = data?.limits?.teacher;
      const sessionsUsed = data?.used?.sessions;
      const teacherUsed = data?.used?.teacher;
      if (data?.plan !== "free" ||
        ![sessions, teacher, sessionsUsed, teacherUsed].every(n => Number.isInteger(n) && n >= 0)) {
        throw Error("invalid_entitlement");
      }
      show("Free · 今日の残り：AI英会話 " +
        Math.max(0, sessions - sessionsUsed) + "/" + sessions +
        " セッション · AI先生 " +
        Math.max(0, teacher - teacherUsed) + "/" + teacher +
        " 回（日本時間0時更新）");
    } catch {
      if (seq === requestSequence) show("利用回数を取得できませんでした。少し待って再読み込みしてね。");
    }
  }

  window.speakingymQuota = { refresh };
  window.addEventListener("speakingym:account-ready", refresh);
  void refresh();
})();
