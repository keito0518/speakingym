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

## 2026-10-21 15:47 JST — 次セッションに最優先で引き継ぐ内容

**ユーザーからの最新希望：PCが使えない。細かな操作依頼・手動テストの繰り返しを避け、可能なことはGitHub連携と自動処理で完了させること。** 必須の外部アカウント操作が不可能なら、その点だけ具体的に短く報告し、勝手に「実テスト成功」としない。

- 最新PR #62 headは `f4ac494eba8d03310cbe8943ac993b2bb23552c0`（確認時点）。Draft/unmerged、mainや本番は変更しない。
- `worker/billing.test.mjs` に「同時署名Webhookで409 billing_busy → 同じイベントを再送して200 → Proは一回だけ付与」の回帰テストを追加（コミット `7737dc1`）。これは**まだ新HEADで自動テスト合格が未確認**。
- `.github/workflows/stripe-staging-automatic-release-gate.yml` を新設（コミット `dff9878`）し、PR #62向け `pull_request` トリガーも追加（`f4ac494`）。模擬更新/未払い/復旧/409/枠制御/安全制御と、実staging GET /healthのみを自動照合する設計。**新HEADに紐づくActions workflow runsはGitHub連携から取得できず、走ったかどうか未確認。PASSと主張しない。**
- 次の担当はまずGitHub Actionsの実行状況/失敗原因を調べ、テスト環境の権限で可能なら自律的に修正・検証する。GitHub Connectorにはこの時点で新規 workflow_dispatch アクションが見当たらない。連携操作できないときにユーザーへPCを要求しない。
- 2026-10-21本人実施の**Stripe TEST購入→Pro付与→解約予約→契約満了→Free復帰は成功**。これを繰り返さず、未実施のStripe TEST更新/支払い失敗/復旧、実利用枠の検証のみに注力。
- この新自動テストは**模擬ケース**であり、Stripe実決済E2Eを代替しない。Stripe/Cloudflareの直接操作権限がない状態ではTESTイベントを生成したと主張しない。秘密鍵の共有を要求しない。
- 絶対変更禁止：Stripe Live・旧¥680商品/契約・本番Worker `speakingym-survival-ai`・本番D1 `speakingym-plans`・本番Pages・main。PR #62をマージ/本番デプロイしない。

## 2026-10-21 — 自動テストの実行結果をGitHub APIで再確認

- **Stripe staging automated safety gate 実行成功**：GitHub Actions run [39554153439](https://github.com/keito0518/speakingym/actions/runs/39554153439)、commit `f4ac494e`、2026-10-21 15:13 JST開始。ジョブ `verify` の模擬Stripe更新/失敗/復旧・409再送、月次1,000/150制限、staging安全/CORS、**実stagingに対する読み取り専用GET /health** の各ステップがsuccess。ヘルス実ログは `environment=isolated-staging`, `stripeMode=test`, `schemaReady=true`, `aiDisabled=true`, `passed=true`。実Stripeの更新/失敗/復旧は含まれない。
- **総合CI 実行成功**：run [39557777409](https://github.com/keito0518/speakingym/actions/runs/39557777409)、commit `8db58ab1`、419件テスト PASS、0 FAIL。ChromiumとWebKitの模擬ブラウザQAがPASS。実iPhone実機の音声認識・マイク権限は未検証。
- `f4ac494e` と `8db58ab1` の差分は `SPEAKINGYM_START_HERE.md` のドキュメントのみ。したがって前者のStripe gate結果は後者の課金コードにも対応する。
- 有料販売の法定表示、返金方針、実Stripe TEST更新・支払失敗/復旧、実D1上限消費・原価、実機QAは未完了。**本番/Live/mainには触れず、Ownerの明示承認までNO-GO。**

## 2026-10-21 — mainの最新ドキュメントをドラフトへ安全に統合

- main (`bd17136a`) の更新は `SPEAKINGYM_START_HERE.md`、`WORK_HANDOFF.md`、`worker/PRO_PRICING_OPTIONS_2026-10-20.md` の3文書のみ。両ブランチで追加された `SPEAKINGYM_START_HERE.md` の競合は**こちらの10/21最新ステージング実証版を優先**して解消。mainから旧提案・過去履歴ドキュメントは保持。
- main側の2026-10-20時点の680円案や「Stripe実テスト未実施」は旧記録。10月21日にオーナーが確認した**1,480円Stripe TEST購入→Pro→期限末解約→Free**の実証、および同日確認したGitHub Actionsの最新結果を優先。
- これは**main→Draftの取り込みのみ**。main側へのマージ、本番反映、Stripe Live設定変更、旧商品・既存契約の変更は行っていない。

## 2026-10-21 — マージ競合解消・ブラウザ音声QAの追加（次担当へ）

- **Draft PR #62 最新検証ブランチ:** `integration/pro680-latest-main-review-20261020`。mainは `bd17136a`、10月21日にmainの資料更新（3文書）をこのDraftへ**取り込むだけ**のマージコミット `77766b2` を作成。元のconflictは両側で追加された `SPEAKINGYM_START_HERE.md` のみ。現在GitHub判定は `mergeable=true`, `mergeable_state=clean`。**mainへのマージは実行していない**。
- **携帯UI・音声処理の追加検証:** `tests/browser-qa.cjs` の `ffb1788` に、**擬似SpeechRecognition**による「途中発話→認識停止で文章保持→再開して追記」を追加。ChromiumとiPhone viewport相当のWebKitでブラウザQA成功（[Actions #39562125745](https://github.com/keito0518/speakingym/actions/runs/39562125745)）。その実行で Node `420/420 PASS`, `0 FAIL`。実iPhoneの物理マイク・OS権限・実音声認識精度を確認したわけではない。
- [Stripe staging安全ゲート #39562132683](https://github.com/keito0518/speakingym/actions/runs/39562132683) は再度成功。模擬課金ロジック・409再送・1,000/150枠・staging安全性がPASS。実stagingへの読み取り専用 `GET /health` もPASS（実Stripe決済・D1利用枠消費の検証とは区別する）。
- 10月21日のHEAD `ffb1788` に紐づくAI Worker安全性・アカウント安全性・NEXT/missionの各GitHub Actions、Cloudflare previewビルドも成功。これらを本番の動作検証とはしない。
- **継続NO-GO:** 本物のStripe TEST更新・失敗/復旧と署名Webhook確認、月次枠の実D1反映・原価、iPhone実機、運営者の事業者情報の開示実運用・返金条件・法定表示の確定、公開者の個別明示承認は未完了。接続済みGmailアカウントはサイトに記載された問い合わせ先と別のため、問い合わせメールの実際の受信と返信は未検証。機密メールやIDをGitHubに記載しない。
- **禁止変更を維持:** Stripe Live、旧680円商品・契約、本番Worker、本番D1、本番Pages、mainへのマージ。Draftブランチのコード・テスト・文書だけ変更した。 
