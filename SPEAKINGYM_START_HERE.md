# Speakingym — 2026-10-21 現在の公開ゲート・引き継ぎ（更新版）

> **対象はドラフト [PR #62](https://github.com/keito0518/speakingym/pull/62) のみ。** 新プランは月額 ¥1,480（税込）・AI会話 1,000 ターン / JST暦月・AI講評150回 / JST暦月。現行 ¥680 の商品・契約、Stripe Live、本番Worker/D1、Pages、mainは変更していない。**PRはマージしない。**

## 2026-10-21：実際のStripe TEST購入〜失効を確認（過去の「未実施」情報に優先）

利用者自身のCloudflare/Stripe画面と実ブラウザ操作により確認。APIキー・実UID・customer ID等は記録しない。

| 項目 | 現時点の事実 |
| --- | --- |
| Stripe sandbox Price | ¥1,480 / 月のテスト商品は存在。実Stripeレスポンスで `tax_behavior=inclusive` を確認したとのWork報告。Price IDは変更不要。旧¥680は触らない |
| TEST Portal | 支払方法更新と期間末解約ON、プラン/数量変更OFFとのWork報告。実Portalから期間末解約を操作できた |
| staging Worker | `speakingym-survival-ai-staging` に `worker/wrangler.staging-billing.toml` を所有者がWranglerで実デプロイ。AI・Free・リプレイ無効、`BILLING_MODE=test`、`STAGING_BILLING_ONLY=true`。ローカルQA画面の実GET /healthが安全ゲートPASS |
| staging D1 | `speakingym-plans-staging` UUID `c608774e-3bc5-4527-be8d-f640e386f504` に実WranglerリモートSELECTを実行し、基礎5テーブル＋ `billing_accounts` と `billing_events` の計7テーブルが存在すると確認 |
| staging Secrets | 所有者が `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_ID` / テストFirebaseユーザー `BILLING_TEST_UIDS` をstagingのSecretとして登録。値はGitHubに保存しない |
| staging Webhook | `Speakingym Staging Billing 1480` の宛先に実際のTEST Checkout / invoice / subscription更新イベントを配信。初期2件は `409 billing_busy`、Stripeによる再送後は `200 OK`。最新契約状態を照合する実装と矛盾なし。初期409の頻度改善は継続検討 |
| 実Checkout | **TESTカードのみ**で契約を購入し、専用Firebaseテスターのlocalhost QAで `Stripe状態 active` / `Pro（テスト権限あり）` を実確認 |
| 期間末解約 | 実Stripe Customer Portalで解約予約。QAで `active・期間末で解約予定`、Pro継続を実確認 |
| 契約満了 | TESTのシミュレーションを2026-11-22に進めた後、Stripe管理画面で解約済み、QAで**Free復帰**を実確認 |
| ローカルQAのCORS問題 | `/health` が localhost に許可ヘッダーを出さない不具合をドラフトPRで修正。回帰テスト4 PASSを所有者のPCで確認後、上記stagingに再デプロイ済み。本番は変更なし |

**重要：実際のStripe TESTで「初回購入→Pro→期間末解約→失効→Free」は成功。ただし「更新成功」「支払失敗→復旧」「重複/順序逆の実配信」「実利用枠1,000/150消費」は実Stripe/stagingで未実施。** 単体テストの成功をこの未実施項目に読み替えない。

## 自動テストの進め方（人間の追加操作は最小限）

- [Stripe staging automated safety gate](.github/workflows/stripe-staging-automatic-release-gate.yml) をドラフトブランチに追加。GitHub Actionsで**模擬**更新・支払失敗/復旧・期限失効・409再送/冪等性・月1,000ターン/講評150回の制御・staging専用安全条件を実行し、**実staging /healthのみ読取GET**。Secretsの送信、Stripe POST、Workerデプロイ、D1書込、本番課金はしない。
- 409 `billing_busy` が同時Webhookで発生しても**同じイベントを後で再送**したら1回だけ処理しProを反映する回帰テストを `worker/billing.test.mjs` に追加。
- 新規workflowの実行結果はGitHub Actionsで確認すること。**現時点では新設後の実行結果は未確認**。既存の417件PASSは以前のコードに対するもの。
- 本物のStripe TEST更新・失敗復旧はアカウント操作が必要。Stripe API認証が利用できないセッションで「実行した」と主張せず未実施として扱う。所有者に同じ購入・キャンセル手順を繰り返させない。

## 次の残作業（優先順）

1. **新規GitHub Actionsを確認**：模擬課金・月次枠・staging GETの成功/失敗を記録。409時の正常再送はユーザーの実配信画面でも観測済み。
2. **本物のStripe TESTでの未完了異常系**：隔離した新テスト顧客/Stripeテストクロックの準備、安全な課金更新と失敗→復旧（既存の期間末解約済み契約を無理に再利用しない）。Webhookの末端応答とUID権限を比較。自動化にはテスト専用認証と適切な実行環境が必要。本番や旧¥680には一切触れない。
3. **アプリ公開品質**：iPhone/Androidの音声認識・AI会話・保存・ログイン・速度、GA4実イベント、1,000/150の実カウント・プロバイダ実コストを確認。
4. **Live本番公開条件**：`tokusho.html` の販売事業者情報、解約・返金条件、個人情報、税込表記と契約UIを最終化し、**ユーザーの別途明示承認**を得る。mainマージ・Stripe Live・本番Worker/D1・実請求はこの前に実施しない。

## 安全上の禁止事項

- **Stripe Live、main、`speakingym-survival-ai`、`speakingym-plans`、既存¥680商品・契約は変更禁止。**
- Sandboxイベントが本番名Worker宛に送られる旧Webhookが別途存在。正常性・影響は未立証。重複Webhookを作らず、旧送信先を安易に編集/削除しない。
- 秘密鍵・署名鍵・Firebase UID・個人/顧客IDをチャット、GitHub、CIログに書かない。
- 模擬テストだけで実Stripeや正式公開の検証を完了したことにしない。

## 詳細資料

- [Stripe sandbox詳細ランブック](worker/STRIPE_SANDBOX_SETUP_1480_STAGE_ONLY.md)（2026-10-21の実操作以前の未実施記述には注意）
- [安全な staging BILLING_ONLY 設定](worker/wrangler.staging-billing.toml)
- [Stripe専用 localhost QA](stripe-staging-qa.html)
- [読取専用 staging readiness](scripts/staging-stripe-readiness.mjs)
- [過去の引き継ぎ](STRIPE_NEXT_SESSION_2026-10-20.md)
