/* Read-only, server-authoritative plan usage for practice pages. */
(function () {
  "use strict";
  const API = "https://speakingym-survival-ai.keitokeitokeito0518.workers.dev/";
  const badges = [...document.querySelectorAll("[data-sg-quota]")];
  const exhaustionNotes = [...document.querySelectorAll("[data-sg-quota-exhausted]")];
  if (!badges.length) return;
  let requestSequence = 0;

  function show(message) {
    for (const badge of badges) badge.textContent = message;
  }
  function showExhaustion(remaining) {
    for (const note of exhaustionNotes) {
      const kind = note.getAttribute("data-sg-quota-exhausted");
      // "hidden" is respected regardless of page-specific styles.
      note.hidden = !(remaining && remaining[kind] === 0);
    }
  }

  async function refresh() {
    const seq = ++requestSequence;
    const getToken = window.speakingymAccount?.getIdToken;
    showExhaustion(null);
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
      const remaining = {
        sessions: Math.max(0, sessions - sessionsUsed),
        teacher: Math.max(0, teacher - teacherUsed)
      };
      show("Free · 今日の残り：AI英会話 " +
        remaining.sessions + "/" + sessions +
        " セッション · AI先生 " +
        remaining.teacher + "/" + teacher +
        " 回（日本時間0時更新）");
      showExhaustion(remaining);
    } catch {
      if (seq === requestSequence) {
        showExhaustion(null);
        show("利用回数を取得できませんでした。少し待って再読み込みしてね。");
      }
    }
  }

  window.speakingymQuota = { refresh };
  window.addEventListener("speakingym:account-ready", refresh);
  // Resuming an open tab after midnight or using a second device should refresh
  // the server-provided counts. This never changes the server's quota rules.
  window.addEventListener("focus", refresh);
  void refresh();
})();
