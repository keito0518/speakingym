# Speakingym ¥1,480 Pro — Stripe TEST更新失敗・回復の検証（Draft／2026-10-21）

> **本番NG。再購入のやり直しNG。** この文書は次に残る実Stripe TEST検証のための手順であり、検証実施・成功記録ではありません。Stripe Live、本番Cloudflare Worker/D1/Pages、main、旧¥680の商品・契約には触れないでください。

## 現在までの実証範囲

- **2026-10-21に所有者が実際に確認済み:** 新しい月額 **¥1,480（税込）** のStripe SANDBOX Checkout → 孤立したstagingでPro権限反映 → Customer Portalで期間末解約を予約 → 残期間はPro維持 → 満了後Free。Webhookの一時的409から200再送成功も確認済み。**この作業を繰り返す必要はありません。**
- **未実施:** 同じ新料金での *実* 支払い済み定期更新、新たなテスト会員の *実* 更新支払い失敗→未払いInvoice→同一Invoiceの回復、実Webhook再送順序、実staging D1の月1,000ターン/講評150回の消費確認。
- GitHub CIには更新・失敗・回復・Webhook処理の模擬テストがある。**模擬テスト≠実Stripe更新**。現状のStripe専用staging Workerは `STAGING_BILLING_ONLY=true` でAI通信／セッション発行が停止される設計なので、そのWorkerでAIを1,000回試しても証明にならない。

## 原則：Stripe TESTと同じ新規テスト会員だけ

1. まず権限・接続性を確認する。利用できるStripe **TEST API**とstaging専用Firebase/Worker/D1権限がない場合は**そこで中断**し、未確認として記録。サンドボックスAPIシークレット、Firebase UID/トークン、Stripe顧客IDやカード情報をチャットやGitHubに貼らない。**Stripe Liveへの自動フォールバックは絶対禁止。**
2. 元の解約済み¥1,480テスト契約および¥680契約は再利用・変更しない。検証用の**別の新しいGoogle/Firebaseアカウント**と招待UIDをstagingだけに準備し、新¥1,480の既存TEST Price（税込・月次）のIDとWebhook送信先を読み取りで再確認する。既存Priceの税方式が違う場合は独断で差し替えない。
3. この新テストアカウントに限り、staging画面からStripe TESTの¥1,480 Checkoutで1件だけ契約を作成する。**Liveでは実施しない。** 画面の `Pro`、staging `billing_accounts` の紐付け、Webhook成功と署名検証、`subscription.status=active` かつ `latest_invoice.status=paid` を照合する。
4. **定期更新成功の検証:** そのテスト契約を実際のStripe TEST時計／Stripe提供のサブスクシミュレーションで更新し、更新後Invoiceが `paid`、同じUID/Customer/Subscriptionのままstaging Proが継続したことを確かめる。**シミュレーションによって顧客・契約IDが置き換わるなら、本来のstaging D1連携E2E成功とは数えない。** 最初にID/対象範囲を確認し、結果が違えば中断する。
5. **請求失敗の検証:** 新テスト会員の支払い方法だけをStripe公式「登録できるが後の請求は拒否」のテストカード **4000 0000 0000 0341** へ変更できる場合のみ進める。もしPortalで登録できない場合は中断し、新たな契約や別のアカウントへの書き換えで無理に再現しない。次の更新でInvoiceが未払い（`open`など）、Subscriptionが `past_due`等になったら署名付きWebhookが到着したことを確認し、stagingの同じアカウントがFreeになったことを検証。
6. **同じ請求書の回復:** その新テスト会員の支払い方法をStripe TEST成功用カードへ戻し、Stripe側の同じ未払いInvoiceの支払いをStripe標準操作で成功させる。`latest_invoice.status=paid` を確認してからWebhookと契約照会を行い、**新契約を作らずに**同じ会員がProに復帰したか調べる。
7. **再送／順不同:** 同一イベントを再送・古いイベントを処理しても二重決済やPro不正復活が起きないことを、新テスト会員に限定して確かめる。想定外の結果はNO-GOとしてログの秘密を伏せて記録し、顧客データを破壊するSQLは実行しない。

## Stripe時計・シミュレーションの重要な注意

Stripeのサブスクシミュレーションを終了すると、関連する**テスト用CustomerとSubscriptionが削除される構成がある**。したがって既存の課金履歴、元のテスター、旧契約には絶対に使わず、新規の隔離テスト会員のみ。時計を進める操作も自動ではせず、対象IDとstaging側の紐付けが維持されると確認した場合だけ実施する。テスト時計では月額契約の更新を再現できるが、時計の進み方やInvoice状態はStripeの実際の結果を記録すること。

## 合否判定（すべて実Stripe TESTで照合）

| 状態 | 期待権限 |
|---|---|
| `active`・一致する新¥1,480 Price・今期Invoice `paid`・期限内 | Pro |
| 更新成功・新Invoice `paid` | Pro継続 |
| `past_due` / `unpaid` / `incomplete` | Free |
| `active` でも最新Invoiceが未払い | Free |
| 同じ未払いInvoiceの回復 `paid` | Pro復帰 |
| `cancel_at_period_end=true`・既払い・有効期間内 | Pro継続（**所有者が既に確認済み**） |
| 契約終了・期間満了・請求同期失効 | Free（**満了→Freeは所有者が確認済み**） |
| 他会員のWebhook・異環境イベント・重複Webhook | 現会員を変更しない |

**技術的な自動テストで代替できない実データの証拠:** テスト時計の対象、最新Invoice状態、各Webhook HTTP応答、stagingの照合結果、請求の同一性、完全な失敗→回復の順番。安全のため証跡には顧客識別子を記載せず要点のみ記録する。

**残る別ゲート:** `scripts/staging-d1-qa.mjs` は一時的な`sgqa-...`レコードだけを利用する実staging D1確認用だが、権限付き**手動**実行が必要。契約者の1,000回の実Geminiリクエスト実行ではなく、D1原子的カウンタ確認である。実iPhoneマイクとGemini実請求・法定情報も未確認。

参考（公式Stripe）：
- https://docs.stripe.com/testing
- https://docs.stripe.com/billing/testing/test-clocks/simulate-subscriptions
- https://docs.stripe.com/api/test_clocks

**旧¥680の過去の成功テストは履歴としてのみ扱う。新料金の検証に旧商品を使用しない。**
