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

## 2026-10-21 追加：アカウント切替時の旧Pro表示・支払導線を即時遮断

- Draft PR #62の2026-10-21最新修正は `account-sync.js`、`plan-usage.js`、`pro-study.js`、`billing-ui.js`。Firebaseのauth owner切替時に `speakingym:account-changing` を発火し、**前のアカウントのPro復習履歴・利用枠表示・決済ボタンを即時無効化**する。Firestoreの同期完了は待たない。
- 前のアカウントのサーバー応答が遅れても、マイページ利用枠表示では認証epochとリクエスト世代を確認して新しい利用枠を上書きしない。Pro復習はPro確認レスポンス後にも当該ログインのトークンを再確認してから端末内の保存履歴を読む。決済画面では未完了のCheckout POSTレスポンスを破棄し、旧ログインのStripe URLへ遷移しない。
- 新規 `tests/account-quota-switch.test.mjs`、`tests/pro-study-account-switch.test.mjs` と追加 `tests/plan-usage.test.mjs` / `tests/billing-ui.test.mjs` でアカウント切替・ログアウト・遅延レスポンス・表示即時遮断のモック回帰テストを追加。実Firebaseアカウント・本番D1・Stripe APIを操作しない。
- 強化済み決済UIのキャッシュ更新用に `plans.html` の `billing-ui.js` バージョンを `20261021-account-switch-safety-5` へ更新し、`tests/billing-cache.test.mjs` も同期。
- 今回変更は **Draftブランチのみ**。本番main・Stripe Live・旧680円商品/契約・Cloudflare本番Worker/D1/Pagesへの操作は一切なし。実Stripe TEST契約更新・支払い失敗/復旧、実staging D1枠消費、実iPhone SafariマイクQA、法的開示/返金・原価、運営者の明示承認は**未完了のGO阻害事項**。
- コード変更末尾の検証SHA `b6b94342`。最新のCI状態は必ずGitHub Actionsで改めて確認する（ローカルのユニットテストとGitHubの実ブラウザテストを混同しない）。

## 2026-10-21（夕方）：Live手動Proバイパス防止・マイページ利用枠の不正表示対策

- **Draft上のコード修正**: `worker/plan-limits.js` の `getPlan` は、明示承認された `billingMode(env)==='live'` の場合、過去の `account_plans.tier='pro'`（手動付与）からProを推測しなくなった。Live対象外ならFree、Live対象でも `billing_live_accounts` にサーバー検証済みの有効な有料資格がない限りFree。**billing disabled / Stripe TESTの旧ベータ権限ロジックは変更せず、旧記録や旧¥680契約テーブルへの書き込みも行わない**。Stripe Liveは未有効化。
- `worker/billing.test.mjs` に手動Pro付与とLive請求の混在・Live招待範囲外・未払い更新後の再付与禁止テストを追加。今後のLive公開前に、**旧手動Pro・¥680等の既存有料利用者をどの権利で継続させるか、対象者と移行ポリシーを運営者が確定する必要がある**。勝手に自動移行・一律失効・課金はしない。
- `account-sync.js` の契約利用枠表示で、欠損・不正な `limits` / `used` を0とみなして「残1,000ターン」等の誤表示をしないよう変更。Pro/Freeとも数値の完全性を検証し、未検証なら「利用回数を読み込めませんでした」とする。`tests/account-quota-switch.test.mjs` に欠損・不正値・正常値テストを追加。
- **実Stripe TEST更新／失敗請求・回復、実D1枠消費、iPhone実機の音声、実測AI原価、特商法・返金条件の確定は未完了**。ステージング安全ゲートの成功や模擬Node/ブラウザテストはこれらを代替しない。引き続き一般課金GOは禁止。PR #62はDraftのまま、main・本番環境・Stripe Live・旧¥680契約は変更しない。

## 2026-10-21：品質改善12分野・ドラフト引き継ぎ（未公開）

**詳細:** [RELEASE_QA_AND_ROLLBACK_2026-10-21.md](RELEASE_QA_AND_ROLLBACK_2026-10-21.md)。開発・公開安全ゲートの12分野別に「コード改善」「模擬CI」「実環境の未確認」を分けて記録した。

- AI同一返答を受理せず、APIエラーで途中回答にしない（`ai_repeated_reply`）。モデルを勝手に再呼出しせず、既存の利用回数失敗処理へ戻す。異なる発言に**同一の定型AI講評**が並ぶ結果も拒否する。
- 60秒チャレンジは最近の保存履歴で出題した問題を後方へ送り、新しい問題を優先。Pro復習スタジオは保存した講評・会話・Sprint表現を混ぜて出題。いずれも既存データのみ、追加のAPI課金なし。
- AI実践シーンの携帯向け44pxタップ領域と低モーション配慮、マイページの再表示時の残り回数照合、Free/有料負担の`scripts/pro1480-risk-matrix.mjs`（**仮定であり実原価の証明ではない**）を追加。
- 実Stripe TESTでの更新成功／失敗→復旧、staging D1の利用枠全件、実iPhone/Androidマイク、実Gemini原価、運営者の法定情報・返金条件、現行680円権利の取扱いは引き続き未確定。**Draft #62のみ、main/本番/Liveを触らない。**
- **CI証拠（コード最新の前段階）:** [Launch QA #39582799532](https://github.com/keito0518/speakingym/actions/runs/39582799532) は **484/484単体テスト・失敗0件、ChromiumとWebKitの模擬ブラウザQA成功**。後続の文書更新コミットについてはGitHub Actionsで最後のSHAを再確認すること。

## 2026-10-21：Proの月1,000ターンと台帳600ターンの食い違いを修正（Draftのみ）

コードレビューで、`worker/turn-ledger.js` の原子的なProターン予約SQLに**旧600ターン上限**がハードコードされ、新案の月1,000ターンと一致していないことを発見。Draftで共有定数 `PRO_MONTHLY_TURN_LIMIT=1000` とSQLバインドへ修正し、`worker/plan-limits.js` も同一定数を参照するよう変更した。セッション20ターン・講評月150回・Free枠は変更なし。

検証は `worker/turn-ledger.test.mjs` / `worker/turn-ledger.integration.test.mjs` に追加。旧上限を超える**601ターン目**、**1,000ターンの原子的上限**、同時予約、失敗分返却を模擬D1で再現。**実Cloudflare staging D1を1,000回消費したという意味ではない**。今回の修正は本番運用中のPro権限には反映しておらず、PR #62をマージ/Stripe Liveを有効化してはいけない。

詳しくは [12分野QA・復旧手順](RELEASE_QA_AND_ROLLBACK_2026-10-21.md)。最新CIの成功・失敗は**修正後SHA**で確認すること。

## 2026-10-21：D1利用回数の読取異常とJST日付切替の安全性（Draftのみ）

- **D1利用回数の不正データ**（欠損・負数・小数・文字列・安全な整数でない値）をサーバーで0回と誤認しないよう `worker/plan-limits.js` を修正。署名付き `/entitlement` は不正値で `plans_unavailable` (503) として失敗させ、Proの利用回数を誇張しない。実DBの `COUNT`/`SUM` の正常な0は表示可能。
- **JST月初・午前0時の境界**を1リクエストごとの基準時刻で一貫して扱う。`getEntitlement`、`usage`、`publicLimits`、新規セッション、AI講評、台帳ターン予約の日時を揃えた。DB応答中に月が替わっても、前月の回数を新月扱いしない。
- `worker/plan-limits.test.mjs` に欠損・異常回数、23:59:59 JST→00:00:00 JSTへのデータベース応答遅延、次月1,000ターン/150講評を既に消費している場合の月末セッション・講評予約の正常性をテスト。
- 今回の修正は [PR #62](https://github.com/keito0518/speakingym/pull/62) のDraftのみ。実ステージングD1の使い切りや実Stripe TEST更新・支払失敗/回復は未検証のまま。本番・main・Stripe Live・旧¥680契約変更禁止。詳細は [QA・復旧手順](RELEASE_QA_AND_ROLLBACK_2026-10-21.md)。

## 2026-10-21：実Cloudflare staging D1検証成功（Owner操作・再試行）

- GitHub Actions [実staging D1実行 #39607027253](https://github.com/keito0518/speakingym/actions/runs/39607027253) は **初回、認証401/code1000でSTOP**。mainでの旧検証 #39606164686 も同じ401で停止。初回はいずれもDBへの書込み無し。
- Draft PR #62でユーザートークンの認証先が401/code1000を返した場合に、**Cloudflareアカウント用トークンの認証先をGETで試す**安全な分岐を追加（両方拒否なら必ずSTOP）。認証用のテストとDraft専用手動実行を追加。本番main・本番Worker/D1・Stripeへの変更無し。
- 運営者が**GitHubのstaging-d1環境Secretのみ**有効な検証トークンへ更新後、同じ実行 #39607027253 の**失敗したジョブだけをGitHub Actionsで再実行**し、`real-staging-d1` が成功。ログで以下6件を確認：
  1. staging D1の識別子・0002/0005の必須スキーマ確認 **PASS**
  2. 初回AI失敗の原子的返却・Freeセッション枠返却・再試行・成功 **PASS**
  3. 20ターン最終枠への同時アクセス防止・他ユーザーからの予約拒否 **PASS**
  4. 6回同時セッション開始時のFree上限5回 **PASS**
  5. 仮の`sgqa-...`ユーザーと紐づく検証データの削除 **PASS**
  6. **STAGING D1 QA COMPLETE**。実D1で処理した証拠だが、**デプロイ済みstaging Worker経由ではなく、ステージングD1 SQLを直接実行する専用QA**。
- この成功により **実staging D1のFree枠・基本カウンタ・返却・排他・削除の確認は完了**。一方、**実stagingでPro月1,000ターン/150講評の限界、Stripe TESTの実更新→未払い→回復、実機音声、原価、法定情報** は引き続き未確認。新料金Liveの公開GOではない。

## 2026-10-21：Pro月次1,000ターン・講評150回の実staging D1検証 PASS

**新しい確定証跡**：[GitHub Actions手動実行 #39609280781](https://github.com/keito0518/speakingym/actions/runs/39609280781)（Draftブランチ `f2cc36a3`、`workflow_dispatch`）。`offline-guards` と `real-staging-d1` がともに **SUCCESS**。検証前にstaging DB名/UUIDと必要な0002/0005スキーマが一致することを確認。

- **Pro英会話 月1,000ターン**：専用の仮のUIDに既存使用999ターン相当を作成。同時予約は最後の1枠のみ成功し、1,001ターン目は**別セッションからも拒否**。予約失敗扱いで999に戻り、枠を再取得できること、成功確定後は再度超過できないことを実staging D1で確認。
- **Pro講評 月150回**：仮の同一UIDに149回を作成。同時予約の片方だけが150回目を取得し、151回目は拒否。実staging D1で確認。
- **安全性**：検証は `sgqa-...-prolimits` 等の一時ユーザーのみで実施し、Gemini API呼び出しやStripe課金・本番Worker/D1変更なし。全検証用セッション・予約・講評データのクリーンアップも **PASS**。
- **証拠の限界**：`scripts/staging-d1-qa.mjs` で実staging D1へ**検証用SQLを直接発行**した結果。実Firebaseログイン・デプロイ済みstaging Worker・Gemini通信・Stripe TEST課金の全体E2Eではない。**本番公開はまだNO-GO**。
- **未完了**：実Stripe TESTの更新成功・未払い→回復、実機iPhoneのマイク/音声認識、実Gemini/Stripe費用、正式な法定情報・解約/返金・連絡体制、公開の明示承認。旧680円契約・main・本番/Stripe Liveの変更禁止を維持。


## 2026-10-22 引き継ぎ：隔離Stripe更新テストの現在地（本人操作は夜に再開）

> 2026-10-22現在の優先記録。この文書の上部にある「自動ゲート未実施」「テスト時計未デプロイ」など過去時点の未実施記述より、直近の実証・CI結果を優先する。ドラフトPR #62の範囲だけ。**main、Live、¥680既存契約、本番Worker/D1/Pagesには触れない。**

### 2026-10-21 本人操作で確認した事実

- **隔離Workerにテスト時計対応コードを実デプロイした。** Windows CMDから `worker/wrangler.staging-billing.toml` で `speakingym-survival-ai-staging` に反映。実デプロイ出力ではstaging D1、`BILLING_MODE=test`、`ALLOW_AI=false` 等の安全な対象であると確認。
- 実際のlocalhost QA画面が staging `GET /health` の安全チェックでPASS。GitHub ActionsのリモートGETもPASS。**ヘルスチェックは設定された `STRIPE_TEST_CLOCK_ID` の値や実Stripe顧客紐付けまでは検証しない。**
- Stripe SANDBOXに**新しい別シミュレーション `Speakingym 1480 Renewal Test`** を作成。既存の古い時計は触らない。Cloudflare staging Workerの変数 `STRIPE_TEST_CLOCK_ID` にこの新時計のIDを設定したとオーナーが報告。**実Stripe GETによる時計IDの照合や新規顧客の時計紐付けは未実施。**
- Googleアカウントが自動的に前のGoogle IDでログインする事象を受け、**Draftコードのlocalhost QA限定**で `GoogleAuthProvider.setCustomParameters({prompt:'select_account'})` を追加。ログイン後、メールアドレスを画面で確認できるよう修正。本人は修正版画面で「ログインかんりょう」と報告したが、そのアカウントが新テスターか、staging許可リスト登録済みか、契約statusが `none` かは**まだ確認できていない**。ユーザーのメール/UIDはGitHubやチャットへ貼らない。
- Google修正後のDraft HEAD `078536786f6218cb2567e68211a344545ee084af`、[CI #39618982244](https://github.com/keito0518/speakingym/actions/runs/39618982244) **Node 496/496、Chromium/WebKit模擬QAともPASS**。本物のGoogleアカウント選択の成否はユーザー報告でありCIは実ログインを代替しない。
- **Odenアカウントは以前の購入→Pro→解約→Free試験に使用済み**。今回の新時計に再利用しない。前の時計・顧客・契約・¥680既存契約も操作しない。

### 夜に本人が必要な操作の最短経路

1. localhost QAで今ログイン中のアカウントがOdenと**異なる新テスター**であることを、ブラウザ画面内だけで確認。 `3. Stripeテスト契約` の表示（`Free`/`テスト対象アカウントが許可リストにありません` 等）だけ報告してもらう。ログイン済みなら再ログインさせない。
2. 新テスターのFirebase UIDをFirebase Consoleで**本人がローカル確認**、Cloudflare **staging Workerのみ** `BILLING_TEST_UIDS` に既存Odenテスターを保全しつつ追加する。**暗号化済みsecretはダッシュボードから再表示できない場合がある**ので、元の値を知らずに上書きしてOdenを失効させない。チャット/CI/GitHubにUIDや鍵を貼らない。追加前に実操作内容を確認。
3. localhost QAで新テスターが `Free` / `status none` と確認でき、ステージングへの招待も通ることを確認。**まだCheckoutを押さない**。次に公開画面のStripe CHECKOUTに行く前に時計ID・TEST価格/税込/Webhook/安全変数を最終点検。
4. 明示的に安全条件が整った新テスト顧客だけで **Stripe TEST購入→更新成功→支払い失敗→回復** を一連で検証。シミュレーションはこの新時計だけ進める。Webhook実配信とstaging Entitlement/Free移行を比較し、成功した項目だけ記録。既存の契約・時計やStripe Liveは一切触らない。
5. 実iPhoneマイク・SafariおよびGA4同意後イベント、販売事業者情報・返金条件・旧¥680継続方針・実Gemini/Stripe費用は別の本番公開GOゲート。本人の最終明示承認まで本番リリースしない。

### 開発者が本人不在でもできる作業

- DraftだけでWebhook/idempotency/同時実行/アカウント切替/課金上限・講評制限・モバイルUIのコードレビューと模擬CI回帰試験、ログサニタイズ、復旧手順の整備。
- 実staging `GET /health` の**読取専用**再検証。既に実staging D1への合成UIDのSQL QAで1,000ターン・150講評限界はPASS済み。今夜に同じ手動テストを再実施させない。
- コスト試算と販売法定表示の**下書き**は可能だが、実請求書の確認と運営者自身の住所・事業情報・返金規約の承認は代替できない。
- **重要：`wrangler.staging-billing.toml` には `keep_vars=false` と `[vars]` があり、ダッシュボードで後から追加した `STRIPE_TEST_CLOCK_ID` が将来のWrangler再デプロイで消える可能性がある。**そのため今夜のQA前に安易に再デプロイしない。追加された時計設定をCloudflare画面で確認し、再デプロイ時は専用設定・secretを安全に保全する計画を先に作成。


## 2026-10-22 GitHub側だけで実施：TEST時計の実在確認・Windows QA更新（ステージング未デプロイ）

- 実Stripe API仕様：顧客作成時だけ `test_clock` を付与でき、テスト時計には `id`・`livemode`・`status`（ready/advancing/internal_failure）・`deletes_after` がある。テスト時計が関連づいたSubscriptionは、`GET /v1/subscriptions?customer=<id>` で取得対象になる。公式資料: https://docs.stripe.com/api/test_clocks/object ・ https://docs.stripe.com/api/subscriptions/list 。**これは公開API仕様の調査であり、このStripeアカウントへ接続して時計を確認した事実ではない。**
- `worker/billing.js` は、明示的に `STRIPE_TEST_CLOCK_ID` を設定した隔離stagingのCheckout時、`GET /v1/test_helpers/test_clocks/<clock>` を **読取専用で一度実行**。時計のID・型・testモード・有効期限が一致せず、または時計が `ready` 以外なら、**Customer POSTの前に停止**する。既存の時計が未指定なら従来通りで、Live/旧¥680には手を加えない。
- `worker/billing.test.mjs` に mock時計の正しいGET、advance中・内部障害・誤ID・Live・期限切れ・期限欠損などの遮断、明示設定のないときは時計GETを実施しないテストを追加。
- `stripe-staging-qa.js` に時計準備中の分かりやすいメッセージ。`scripts/Windows_Start_Stripe_Staging_QA.cmd` の固定zipコミットを `e0446d7...` に更新し、既存のGoogleアカウント選択強制・ログイン中メール表示・新時計準備エラー対応済みのQA画面を起動できるようにした。ユーザーがすでに開いた古いQAサーバーへは自動反映されない。
- **変更範囲はDraft PR #62だけ。** 今夜の独立staging Workerは `c9100b58` コードに再デプロイしていないため、実Stripe時計GETの新チェックは**本番・staging実機では未反映**。将来stagingにWrangler再デプロイすると、dashboardに後から入力した `STRIPE_TEST_CLOCK_ID` が `keep_vars=false` の影響で消える可能性がある。**今回のテスト時計を確実に保持する手順を決める前にWranglerを再実行しないこと。**
- Stripe TESTの新規顧客作成／月額更新／支払失敗→復旧は**未実施**。実験用Googleアカウントの新staging招待も未確認。本番公開はNO-GO、main/Live/¥680契約無変更。GitHub Actionsの最新HEAD結果は実行ログ参照（合格確認前に完了扱いしない）。

## 2026-10-22：Stripe契約の所有者照合を強化（Draftのみ）

- `worker/billing.js` でStripeから作成されたCustomerの `cus_*` ID・Customer型・TEST/LIVEモード・`metadata.firebase_uid` を、D1へ顧客IDを保存する**前に**照合。新時計付きの既存Customer再利用時もFirebase所有者を再照合し、不一致ならCheckoutを発行しない。
- 定期購入一覧を照合する際、各SubscriptionのID・型・顧客IDと、展開済み／個別取得した最新Invoiceの顧客・型・モードが現在のD1マッピングと一致しなければ処理を停止。異なる顧客の支払いをPro付与に流用しない。署名付きWebhookのイベント重複記録は検証完了まで確定させない。
- 悪意ある／壊れたStripeレスポンスを再現する回帰試験15ケースを追加し、`node --test tests/*.test.mjs worker/*.test.mjs` で**520件成功・失敗0**（ローカル、2026-10-22）。これはStripe APIをモックしたコード試験であり、実Stripe更新決済の実証ではない。GitHub Actionsの新HEAD CI・Chromium/WebKitはコミット後に改めて確認する。
- Cloudflare `keep_vars=false` の現行設定を**変更もデプロイもしていない**。Cloudflare公式資料上、Wranglerはダッシュボード追加の通常変数を再デプロイ時に上書き／消去し得るが、暗号化secretは保持される。現在の `STRIPE_TEST_CLOCK_ID` が通常変数かsecretか、値を保全できたかは未確認。**確認までstagingのWrangler再デプロイ禁止**。
- 新テスターのFirebase UID確認・staging許可リスト、新TEST時計のStripe実照合、新顧客紐付け・更新・失敗→復旧・Webhook実配信は引き続き**未実施**。Odenの完了済みテストを繰り返さない。
- 原価試算は既存 `scripts/pro1480-risk-matrix.mjs` を再実行。100人のPro会員／500人のFree利用者、満額利用、為替160円の仮定では、標準利用シナリオで月116,800円の限界利益、重い利用と1.5倍再試行では月-34,344円の赤字。**実Gemini請求書・Stripe契約料・税金・ホスティング費が未計測なので、いずれも利益予測ではない**。
- 公開判定は依然**NO-GO**。`tokusho.html` の事業者開示・返金・更新／解約締切の確定、実原価、実端末ブラウザ音声、旧680円加入者の扱い、別途本人の承認が必須。main・本番Pages/Worker/D1・Stripe Live・旧680円商品／契約は変更なし。
