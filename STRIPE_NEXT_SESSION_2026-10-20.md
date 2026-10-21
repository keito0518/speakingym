# Speakingym — 2026-10-20 夜 / 次回の最短引き継ぎ

> **2026-10-21 昼前の更新：** 最新の公開可否と安全な作業順序は [SPEAKINGYM_START_HERE.md](SPEAKINGYM_START_HERE.md) を最初に参照。PR #62はDraftのまま。既存の¥1,480 TEST商品と旧¥680商品を重複作成・変更せず、Stripe TEST既存設定の読み取り → staging D1確認 → staging billing-only → 本物のサンドボックスE2Eの順で進める。**実Stripe決済は未検証**、Live/本番変更禁止。

> **2026-10-21 早朝追記：** GitHub上でStripe TEST商品・価格確認ツールを**読み取り専用に変更**。以前の `--apply` オプションは安全上**実行前に拒否**。商品名表記が違っても、既存の1,480円商品や旧680円商品を勝手に作り直さない。現時点でStripeアカウント/APIの実接続は未実施。PR #62は引き続きDraft、本番は触っていない。

## 大前提

- **本番は変更禁止**：Stripe Live / 実課金 / 本番Worker `speakingym-survival-ai` / 本番D1 `speakingym-plans` / 本番Pagesは本人の個別GOまで触らない。
- 正式な最新Pro案：**月1,480円（税込）、AI会話1,000ターン、AI先生150回**。本番反映は未実施。
- 最新開発：GitHub [ドラフトPR #62](https://github.com/keito0518/speakingym/pull/62)。mainとは別。**Stripeでの本物の新Pro決済E2Eは未確認**。
- ユーザーは既に長時間の操作をしており、今後は**先に再利用できる既存設定を調べ、依頼を1回にまとめる**こと。

## Stripeサンドボックス：ユーザーの画面から確認できたこと

- **商品は既に2つ存在**。旧 `Speakingym Pro`：680円/月、有効。新 `Speakingym Pro 1480（サンドボックス検証用）`：1,480円/月、有効、トライアル表示なし、0契約。**新商品を作り直さない**。旧680円商品も変更しない。
- 新商品の価格は「定額、JPY、1か月ごと、¥1,480、デフォルト」で、商品説明には税込とある。Stripe API `tax_behavior=inclusive` は**未照合**。Price IDはスクショには表示されていない。
- StripeサンドボックスのWorkBench **新形式 Event destinations** 作成画面で、所有者はSnapshot／お客様のアカウントを選択。APIバージョン候補は `2026-09-30.endive`（安定）と `2026-10-07.preview` のみ。7イベントの選択はユーザー報告済み。**送信先の保存・署名キー発行は未確認**。
- 旧680円時代のWebhook設定・Stripeテスト契約は存在する可能性がある。**一覧で確認する前に新規作成しないこと**。旧環境での成功は今回の独立staging E2E成功を意味しない。

## Cloudflare

- 別Worker：`speakingym-survival-ai-staging`、別D1：`speakingym-plans-staging`（UUID `c608774e-3bc5-4527-be8d-f640e386f504`）。
- 直前のスクショではstaging D1テーブルが5つだった。その後、所有者がGitHubの `worker/migrations/0001-billing.sql` のテーブル2つをstagingのD1 Consoleで実行し「できた」と報告。**今の7テーブルへの増加は未再検証**（成功と断定しない）。
- stagingは初回Health-onlyで認証・GET /health確認済み。ただし **課金専用Workerへはデプロイ未確認**、staging secrets未確認、実Webhook到達未確認。
- ローカルQA `stripe-staging-qa.html`、テスト用Worker設定 `worker/wrangler.staging-billing.toml` は**PRドラフト上で実装・自動テスト済み**。使う前にstage側設定が必要。

## この夜の変更（ドラフトPR #62のみ）

1. `scripts/stripe-sandbox-preflight.mjs`: 旧 `/v1/webhook_endpoints` と新 `/v2/core/event_destinations`（`webhook_endpoint.url` を明示include）**両方をGET専用で確認**。有効・Test・Snapshot・7イベント・自アカウント・安定版 `2026-09-30.endive`・ステージURL一致の検証。複数の一致、Thin、Preview、異なる対象は**失敗**。
2. `scripts/stripe-test-price-bootstrap.mjs`: 新 `Speakingym Pro 1480（サンドボックス検証用）` を旧680円商品から区別。既存の正しい新価格を再利用する方向に修正。これらのスクリプトは実Stripe APIに接続実行**していない**。
3. サーバー側Webhookの署名・再送処理について、`api_version: 2026-09-30.endive` のSnapshotモデルでも権限同期するユニットテストを追加。**実Stripe E2Eとは別**。
4. PRタイトルを最新1,480円案に修正。旧680円の過去記録とは区別。

## 次回の段取り（人間の操作を最小限に）

- **最初に必ず** `main`、PR #62 の最新head/CI、`worker/STRIPE_SANDBOX_SETUP_1480_STAGE_ONLY.md`、このファイルを確認。
- Stripe側で同じ設定を新規作成しない。**既存サンドボックス送信先一覧のRead-only確認** → 保存済みstage宛があるか、旧本番Worker宛しかないか判定。
- Stripe TEST `Price` の `tax_behavior=inclusive`、本物のWebhook URL/イベント/API-version、テスト用Customer Portal、staging D1決済テーブル存在を照合。
- 不足があると判明した操作だけまとめて本人へお願いし、**Cloudflare staging Workerのみ**にTEST Secretsを設定・billing-onlyでデプロイ。
- stagingで実際のStripe Checkout→署名Webhook→Pro付与→更新/支払失敗→復旧→期間末解約/失効を通すまでは、**正式公開・mainマージ・Stripe Liveへの切替禁止**。
