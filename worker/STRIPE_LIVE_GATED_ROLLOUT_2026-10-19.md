# 680円Pro：Stripe LIVE 実装引き継ぎ（コードのみ・本番未有効化）
更新日：2026-10-19

## 現在の状態
- 実決済のための**オプトイン型コード**。このPRはテスト・レビュー用で、マージ/デプロイ/実課金は実行していない。
- 現行の `BILLING_MODE=test` と `sk_test_`・`billing_accounts` は維持。
- 本番Stripeを使う場合のみ、**別のキー名**（`STRIPE_LIVE_SECRET_KEY`、`STRIPE_LIVE_WEBHOOK_SECRET`、`STRIPE_LIVE_PRICE_ID`）と、**別のDBテーブル**（`billing_live_accounts` と `billing_live_events`）を使用する。
- `worker/migrations/0006-live-billing-isolation.sql` は**未適用**。0003/0004/0005 の本番適用を要求しない。マイグレーションディレクトリを一括実行しない。
- 認証を通ったサーバー側請求・契約照合・最新の支払済請求書に基づくPro権限・解約/未払時の失効処理は既存コードを共有。ユーザー画面の決済成功URLだけでPro権限を付与しない。
- `LIVE_BILLING_ENABLED` はどの設定ファイルにも定義しない。デフォルトで強制的にOFF。キーをアップロードしただけでは課金できない。
- `BILLING_LIVE_AUDIENCE=invited` と `BILLING_LIVE_UIDS` は内部パイロット用の招待UID制御。`public` は明示的な商用公開設定であり、無断切替禁止。
- 本番Workerへの変更、D1操作、Stripe live API、Gemini paid tier、実課金、既存ユーザーデータ変更は**未実施**。

## 本番前の必須チェック（未完了）
1. GitHub CI / レビューを通す。特にsandboxとliveの口座/Stripe顧客/署名/利用権限が混じらないこと。
2. **実際のStripe sandbox**で680円（税込、月次、1個）の契約開始→Webhook→Pro反映→更新→未払い→解約を実ユーザー操作で確認。Nodeモックのテストだけでは不可。
3. 実際のFirebaseログイン、Safariの音声・マイク、Gemini応答・実トークン量・有料API供給能力・429頻度・支出停止手段の確認。無料APIの応答実績を有料提供可否と混同しない。
4. 680円Pro（月600 AI往復/講評100）と現在のFree（1日5セッション/講評3回）の逆転した価値を商品設計上解決する。ユーザー承認・事前告知なしで無料枠を下げない。
5. 運営者情報・特商法表示・支払い/更新/解約/返金・プライバシー/利用規約・問い合わせ対応を、本人提供の正しい事実で整備する。現在のベータ表示や「Pro開発中」を正式販売前に更新する。
6. 本番D1の**新規バックアップ/復元整合性**確認、schema 0006だけの安全性確認と適用承認、`billing_live_accounts/events` 存在確認。0003/0004/0005を適用しない。
7. Stripeアカウント・KYC/事業者確認、ライブ月680円（税込）のPrice・ライブ専用Webhook・Customer Portalを確認。キー・価格ID・署名シークレットをチャットやリポジトリに貼らない。
8. 商用公開直前に**ユーザーの明示承認**を得て、必要なSecretsとモードをCloudflareで設定。初期は `BILLING_LIVE_AUDIENCE=invited` で本人限定の実決済を別途承認する。実際に料金が動くのでこの段階も無断実行しない。
9. 本人が確認した後に、明示承認を得て初めて `BILLING_LIVE_AUDIENCE=public` とする。即時停止は `LIVE_BILLING_ENABLED=disabled` または `BILLING_MODE=disabled`。稼働済みサブスクの請求が自動で停止するわけではなく、停止時はStripe側の請求・顧客対応も別途必要。

### LIVEで必要な環境値（※値をチャットやGitHubに貼らない）
- `ENFORCE_PLANS=true`, `TURN_LEDGER_MODE=enabled`（既存を維持）
- `BILLING_MODE=live`, `LIVE_BILLING_ENABLED=enabled`
- `STRIPE_LIVE_SECRET_KEY` = Cloudflare Secret（ライブキー）
- `STRIPE_LIVE_WEBHOOK_SECRET` = Cloudflare Secret（本番Webhook署名シークレット）
- `STRIPE_LIVE_PRICE_ID` = Cloudflare Secret/変数（**正しいライブ価格ID**）
- `BILLING_LIVE_AUDIENCE=invited` と `BILLING_LIVE_UIDS` = Cloudflare Secret（初期パイロット。一般公開時のみaudienceをpublic）

## 諸注意
- GitHubの main へマージすると既存Workers/Pagesの自動デプロイが動き得る。コードレビューと承認までドラフトPRに置く。
- 現在の `scripts/prod-smoke.mjs` は `billingMode=test/disabled` のみ受理する。LIVEへの切替直前に商用用チェックを**別途**作り、public paid checkoutと法定ページの正常動作を確認してから切り替える。スモークを単純に弱めない。
- セキュリティ上、StripeのAPIキーやWebhook署名、UID、契約レコード、英会話テキストをGitHub/チャット/Actionsログへ残さない。

Stripe参考: https://docs.stripe.com/api/checkout/sessions/create 、https://docs.stripe.com/webhooks 、https://docs.stripe.com/billing/testing
