> **LEGACY ¥680 ARCHIVE — DO NOT USE AS THE ¥1,480 SETUP GUIDE (2026-10-21).** This historical note describes the previous TEST price (¥680), legacy webhook-only API and three-call audit. The current code in PR #62 checks **¥1,480**, both legacy v1 and modern v2 destinations, and a strict non-switching Portal. For the current Pro plan, use [STRIPE_SANDBOX_SETUP_1480_STAGE_ONLY.md](./STRIPE_SANDBOX_SETUP_1480_STAGE_ONLY.md) and [STRIPE_NEXT_SESSION_2026-10-20.md](../STRIPE_NEXT_SESSION_2026-10-20.md). Do not recreate the already-existing ¥1,480 sandbox product or alter the ¥680 product. Live Stripe and production Worker/D1 remain forbidden.

# Speakingym Stripe Sandbox — 実Stripe GET-only環境検査 (2026-10-20)

> **Status: PREPARED, NOT EXECUTED AGAINST REAL STRIPE.** テストモードに実際に接続するにはStripeのテスト専用キーと、独立staging Workerが必要。現チャットにはStripe管理画面／鍵への接続がない。CIのNodeテストはStripeレスポンスのモックであり、Stripe sandboxでの本物の取引や更新・解約が成功した証拠ではない。

## 目的・安全境界
- `scripts/stripe-sandbox-preflight.mjs` は Stripe API の **GET** 3本のみ：
  1. `GET /v1/prices/{test_price_id}` — テストモード・有効・JPY 680（税込価格として inclusive）、毎月1回、無トライアル、定額契約
  2. `GET /v1/webhook_endpoints?limit=100` — 本番とは別の明示指定したstaging Worker /billing/webhookが有効・テストモードで、契約開始/更新/解約・支払済/失敗等の通知を購読
  3. `GET /v1/billing_portal/configurations?limit=100` — テストアカウントの既定Portalが有効・期間末解約と支払い方法変更を許可
- APIキーは **`sk_test_...` のみ**。本番 `sk_live_...`／restricted key等は初回HTTP通信前に拒否。production Worker `speakingym-survival-ai.keitokeitokeito0518.workers.dev` へのWebhook宛先も拒否。
- 金額やURLの不一致、ページネーション未処理、テストアカウントの設定未完了はfail closed。**成功レスポンスは合否・構成確認のみ、キー／アカウント／PriceID／WebhookURL／顧客ID／API応答全体を出力しない。**
- Stripeの顧客・サブスク・Checkout・支払い・Webhookの送信、D1・Firebase・Gemini・本番Cloudflareの変更は一切行わない。

## 実行条件と操作（鍵はチャット・GitHubに貼らない）
1. Cloudflareに**独立したstage Worker** `speakingym-survival-ai-staging` をstage D1にのみ紐付けたことを確認する（現時点でデプロイ未確認）。最初の `STAGING_HEALTH_ONLY=true` ではWebhook受信は拒否されるので、この状態でE2E成功と言ってはいけない。
2. 本人管理の環境でStripeの**テストモード**の Product/Price・Webhook（stage専用）・既定Customer Portalを設定する。使うテストキーは本番APIキーと別。取引を行わないプリフライト自体も、設定値を安全に使える環境でだけ実行する。
3. 秘密環境変数として下記を設定する（`echo`・git commit・CIログ・チャットに値を出さない）：
   - `SPEAKINGYM_STRIPE_TEST_KEY`：テスト専用APIキー
   - `SPEAKINGYM_STRIPE_TEST_PRICE_ID`：月680円(税込)のテストPrice ID
   - `SPEAKINGYM_STRIPE_TEST_WEBHOOK_URL`：独立stage `https://.../billing/webhook` （production WorkerのURLは禁止）
4. `node scripts/stripe-sandbox-preflight.mjs` を実行する。実環境アクセスのためネットワーク必須。FAILならメッセージのreason codeのみ共有し、鍵・Price ID・Webhook URLは共有しない。
5. **PASSは設定の読み取り確認のみ**。以下の本当のE2Eの代わりにならない。

## 実際のsandboxのE2Eで別途必要な事実
- Sandbox stage Worker + stage D1の分離、stage billingモード test/ENFORCE_PLANS、Firebase認証、StripeテストWebhook署名とテスターUIDを確認。
- テストカードでCheckout→Stripeの登録→署名済みWebhook→D1のPro権限（エンドユーザー表示）を検証。金銭が動かないテストモードのみ。
- 支払失敗、更新成功/失敗、通知の重複・順序違い、解約（Customer Portal, 期間末）とその後のFreeへの復帰をStripeテストクロックで検証。本人承認の前に本番Liveの取引を使わない。
- Stripe Customer Portal、実Checkout最終確認画面、Privacy/Terms、税・解約・返金を実物で確認。
- 本番データ・課金フラグ・Gemini有料枠・公開モードは変更しない。E2E未了の間 `LIVE_STRIPE_SANDBOX_E2E_PASSED=verified` を設定しない。

参考公式資料：
- https://docs.stripe.com/api/prices/retrieve
- https://docs.stripe.com/api/webhook_endpoints/list
- https://docs.stripe.com/api/customer_portal/configurations/list
- https://docs.stripe.com/billing/testing/test-clocks/simulate-subscriptions

**User effort:** stage Workerの実作成とStripeのテスト資格情報・Webhook/Portal操作は、接続されたCloudflare/Stripe操作権限がない場合、本人またはWorkの認証済みブラウザ操作が必要。ユーザーにはAPIキーをチャットへ送らせない。
