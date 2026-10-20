# Speakingym — 新しいチャットはここから（2026-10-20 JST）

> **最初にこのファイル、`WORK_HANDOFF.md` の最後のチェックポイント、現在の GitHub main/PR/Actions を実際に再確認すること。** ここは永続的な引き継ぎの入口であり、GitHub/Cloudflare/Stripe のライブ状態を保証するものではない。内容が古い可能性があるため、日付と一次証拠を照合してから作業する。

## 新しいChatGPTへ最短の依頼文
**「Speakingymの続きをお願い。GitHub `keito0518/speakingym` の `SPEAKINGYM_START_HERE.md` と `WORK_HANDOFF.md`、最新mainとオープンPRを確認して、安全にできる開発を自律的に進めて。」**

- リポジトリ: https://github.com/keito0518/speakingym
- 本番Pages: https://speakingym.pages.dev/
- 現在の開発目標: **2026-10-31 に月額680円のPro実課金を含む正式公開**。これは目標であり、課金の許可・公開GOサインではない。
- 運営形態: 個人の副業（法人設立を前提としない）。**本人の希望は、法令の要件を満たす場合に自宅住所/電話をサイトに公開せず、購入検討者からの請求時に正式な事業者情報を遅滞なく開示する方式**。運用体制が整っていない間は法的準備完了とは扱わない。氏名/住所/電話をチャット、GitHub、CIに載せない。

## 最終確認済みの技術状態（2026-10-20）
- **main の最終確認コミット:** `54c61c57641218e528b976df539d9a68fe4880c7`（PR #59を含む）。この資料のマージ後は必ず新しいmain SHAを取得する。
- PR [#59](https://github.com/keito0518/speakingym/pull/59) mainへマージ済み。独立staging Worker初回は `STAGING_HEALTH_ONLY=true` により `GET /health` のみ許可。実際のstaging Workerデプロイはまだ確認できていない。
- **Pro決済の本命統合版:** [PR #62](https://github.com/keito0518/speakingym/pull/62) は **DRAFT・main未マージ**。最新mainに基づき、Stripe Live gated実装、GA4明示同意、staging保護を両立。**PR #62 head `4dffc97780c4f4f1fc140a993fd8ff98682677e8` に対して Launch QA 296/296、AI Worker安全性とアカウント安全性、Chromium/WebKit browser QAが成功**。新コミットではテストを改めて確認。
- [PR #43](https://github.com/keito0518/speakingym/pull/43) は旧mainを基点にした **DRAFT・未マージ**。子PR [#60](https://github.com/keito0518/speakingym/pull/60) / [#61](https://github.com/keito0518/speakingym/pull/61) の安全策は #43 の開発ブランチに反映されているが、**本番mainにマージされていない**。最新mainへの統合は #62を基準とする。
- #62上で `tokusho.html` の**販売前・noindex草案**、`contact.html` の専用mailto開示請求リンク、`tests/operator-disclosure-request.test.mjs`、`worker/INDIVIDUAL_OPERATOR_TOKUSHO_PLAN_2026-10-20.md` が整備済み。メールの実受信/返信および法的適合は未検証。
- 本番 `TURN_LEDGER_MODE=enabled` は2026-10-19のGET `/health` で確認した直近記録。本番 `FREE_SESSION_MODE` はOFF、production D1 migration 0005未適用、AI replay OFF。最新のCloudflare反映/稼働状態を新たに観測したわけではない。staging D1の0002+0005 SQL QAは成功、staging Worker実デプロイは未検証。
- GA4測定ID `G-DRH440861Y` のコード反映と同意後ロードはテスト済み。**GA4イベントの実受信は未確認**。
- **月680円の実採算は未確定**。実GeminiのCloudflareログ、Google請求データ、free-tier負担、有料API品質は未照合。コード上のシミュレーション値は実原価ではない。

## 不変の安全ゲート
1. Stripeの**本番課金・実クレジットカード決済、liveキー/Secretsの設定、公開切替、Cloudflare本番へのデプロイ変更、D1本番 migration、Gemini有料枠の有効化は、未検証事項の解消と運営者の個別の明示承認が必要**。2026-10-31という目標設定は承認に代わらない。
2. Stripeは現在sandboxのみ。本物のStripe test-modeで Checkout→署名Webhook→初回Pro→更新成功/失敗→重複→Portal解約→期限終了を通す。Node mockテストをE2E完了扱いしない。
3. **商用NO-GOフラグ:** `LIVE_LEGAL_READY=verified`, `LIVE_STRIPE_SANDBOX_E2E_PASSED=verified`, `LIVE_UNIT_ECONOMICS_REVIEWED=verified` は客観的証拠が揃うまで設定しない。招待制実課金パイロットを通しても、公開範囲は別途 `LIVE_PUBLIC_RELEASE_APPROVED=approved` が必要。いずれも現在は未承認。
4. ユーザーのプラン数値を勝手に変更しない: Free AI 5セッション/日、講評3回/日、Pro AI 600ターン/月、講評100回/月、月680円。**Freeの最大利用量がProと逆転し得る**問題は商品判断が必要。
5. staging用の独立Worker／D1を本番と混ぜない。本番D1へmigrationを一括実行しない。既存の本番ledgerを無効化しない。Stripe本番顧客/決済データは絶対にテスト環境に流さない。

## 現実的な次の順番
1. #62と最新mainの差分・GitHub CIを再チェックし、マージ前レビュー／追加回帰テストを進める。ただし#62は法的表示・料金・Stripe実試験のGOまでDRAFTのまま維持。
2. **個人情報を秘密にした請求時開示の実運用**：メール窓口の受信・返信テスト、購入前に遅滞なく正式な情報を提供する体制、解約/返金など契約条件と最終確認ページを確定。架空の事業者情報で埋めない。
3. Cloudflareの分離staging Workerの初回ヘルス確認、本物のStripe sandbox E2E、Firebase/iPhone Safari実機QA、Gemini使用量・原価/容量の確認。権限と本人操作が必要な部分だけ運営者へ依頼。
4. 本番変更は必要なバックアップ/復元検証を行った後、個別の安全なリリース計画とオーナーの明示承認で進める。

## 引き継ぎ運用ルール
- **チャット内容はGitHubへ常時自動転送されない**。次回から開発マイルストーンごとにこのファイルまたは `WORK_HANDOFF.md` に、検証済み事実・PR/Actionsへのリンク・未完了点をコミットして引き継ぐ。
- 新しいチャットでは上記の**一文だけ**でも始められるようにする。ただしGitHub連携が無効なら利用者による再接続が必要。過去チャットの完全な自動共有やバックグラウンド実行を約束しない。
- `WORK_HANDOFF.md` には時系列の詳細がある。古い記載は後続のdated checkpointで上書きされるため、「最新」のセクションとGitHubの実状態を優先する。

## 最新の作業追記：2026-10-20 Pro決済表示と公開前スモーク

- **現在のmain（本追記前）:** `a888e3fbde46f20e32cb2e33d4fc58f3b77e6ed1`。これが最新とは限らないため、次の担当者は必ずGitHubへ再確認する。
- **PR [#62](https://github.com/keito0518/speakingym/pull/62)** は引き続き **DRAFT / main未マージ / 未デプロイ**。現在確認できたhead: `a79ffb90059f56e10b038447bea0de0c7f7f00a3`。
- **[PR #64](https://github.com/keito0518/speakingym/pull/64)**（Pro受付表示の古いLive認証情報が通信失敗/ログアウト/アカウント切替後に残らないようにする）と **[PR #65](https://github.com/keito0518/speakingym/pull/65)**（`scripts/pro-paid-readonly-smoke.mjs`：公開Pages5ページ＋Worker healthのGETのみで商用準備状況をfail-closed確認）を **#62のドラフトブランチにマージ済み**。最終 #65 の CI では **303/303 Nodeテスト、Chromium/WebKitブラウザQA、Worker安全性テスト成功**。
- 新しい有料公開スモークは読み取り専用。**現在の本番では特商法と利用規約が未確定・Stripe Live無効のため失敗するのが正しい**。テスト合格だけで法律対応・Stripe sandbox E2E・実請求・一般公開を承認できない。実決済/バックアップ/D1/AI原価/公開許可は依然NO-GO。
- 実装済みの検査はユーザー本人の手動操作を代替しない。独立staging Worker実デプロイ、実Stripe sandbox Checkout→Webhook→更新/失敗/解約、Gemini請求原価、請求時開示メールの実受信返信、法令適合、ユーザーの段階別承認が残る。

## 2026-10-20 追加：Stripe sandbox 実API設定プリフライト

- **最新の決済開発:** [PR #67](https://github.com/keito0518/speakingym/pull/67) はテスト成功後に **DRAFT PR #62のブランチへマージ済み**（#62のhead確認値 `4cb7f19330d351c8b3ff11fa3bc9355c6a3a1801`）。**main未マージ・Cloudflare未デプロイ・Stripe Live未実施。**
- `scripts/stripe-sandbox-preflight.mjs` は **実StripeテストモードAPIでの読み取り専用GET 3回**（Price・Webhook endpoints・Customer Portal configs）を行う。sk_test_しか受け付けず、本番Worker宛Webhookを拒否。価格¥680税込月次、必要Webhookイベント、Portalの期間末解約・支払方法変更をfail-closed検査する。秘密情報を出力しない。実行用ガイド `worker/STRIPE_TEST_API_PREFLIGHT_2026-10-20.md`。
- **検証された事実:** #67のGitHub CIで Node **309/309成功**、Chromium/WebKit成功、AI Worker安全性テスト成功。**これはStripe APIに実接続した証拠ではない**。この実行環境にはStripeアカウント接続も独立staging Workerの実デプロイ証拠もなかったため、本物のStripe sandbox Checkout→署名Webhook→Pro権限→更新成功/失敗→Portal解約→期限満了は全て未検証。
- **次の本当の作業:** StripeテストアカウントとCloudflareの独立staging Worker/D1の安全な認証済み接続を用意し、まずGET-onlyプリフライトを実行。次にモックでないStripe sandbox E2Eを実施。キー・UID・決済情報を会話、GitHub、CIログに投稿しない。実sandbox E2Eまでは `LIVE_STRIPE_SANDBOX_E2E_PASSED=verified` を絶対に設定しない。
- 本番課金、D1 migration、Gemini有料化、Proプラン価格・利用枠、一般公開の承認は一切変更なし。正式公開目標は10/31のままだが、法令・原価・Stripe実E2E・運営者承認のNO-GO条件を優先する。

## 2026-10-20追加：月680円Pro採算・Freeとの差別化

- 決済の実操作は**利用者帰宅後まで保留**。GitHubで実装・検証できる採算・販売説明の安全改善を先行した。
- [PR #69](https://github.com/keito0518/speakingym/pull/69) を **DRAFT PR #62の統合ブランチにマージ済み**（確認head `6760a665c07fa45b7888de3c439ef14a90e69726`）。**main未マージ・本番未デプロイ、価格/Free/Pro枠/D1/Stripe Live未変更**。
- `scripts/pro680-economics.mjs` と `tests/pro680-economics.test.mjs` に Gemini 3.5 Flash-Lite Standard公式価格、Stripe日本の標準決済3.6%+Billing0.7%、為替・AIリトライ・Freeユーザー数/利用量・ホスティング・税の仮定を明示した原価モデル追加。モデルの **実Gemini原価/実会員数/実請求データは入手できていない**。`worker/PRO_VALUE_MARGIN_REVIEW_2026-10-20.md` を参照。
- 例示だけ：$1=¥160、Pro毎月600会話+100講評を使い切ると標準トークン仮定でAI約138.56円/Pro、重いトークン仮定で約644.80円/Pro。Stripe仮29.24円で残り512.20円対5.96円（税・Free・Hosting除外）。**利益保証ではない**。Freeの使用分も有償になると赤字リスク。
- Free 5セッション/日×最大20ターン×30日＝理論最大3000ターン、Pro600ターン/月。Free講評3回/日×30日＝90回、Pro100回/月。**Proは必ずFreeよりたくさん話せるわけではない**。現時点の強みは日次セッション枠なしで週末等に集中できる柔軟性。`plans.html`に正直な比較FAQを追加したが、それだけで支払い意欲が高まった事実はない。
- #69のCI: **318/318 Node tests成功、Worker・アカウント安全性CI、Chromium/WebKitブラウザQA成功**。Firebase JWT署名改ざんテスト末尾の非正準base64url書換えで偶発的に同じバイト列となるテスト不具合も、重要な署名先頭を改変するよう修正。認証実装は未変更。
- **公開NO-GO**：Cloudflareの匿名化Gemini実ログ・Google実請求・Free負担・Stripe手数料・Pro利用価値の確認を行うまでは `LIVE_UNIT_ECONOMICS_REVIEWED=verified` 禁止。Stripe sandbox E2E、法令/返金条件、Cloudflare staging・D1、本人の別途明示承認も必要。


## 2026-10-20 追加：Proの利用枠拡充と売価の選定案（まだ未決定）

- オーナーは「Pro利用者にもっとたくさん使えるようにしたい。いくらがラインか」を相談。**正式な価格変更の承認はまだない**。Stripe・D1・料金ページ・Free/Pro上限は変更しない。
- 公式AI/Stripeレートと競合価格を再調査。提案比較表は `worker/PRO_PRICING_OPTIONS_2026-10-20.md`（mainにある提案資料、料金決定ではない）。
- **暫定本命：月額¥1,480・月1,000会話ターン＋150 AI講評**。もう少し安価にするなら¥1,280・900ターン＋120講評。¥980・700ターン＋100講評ではProのメリットを増やしにくい。いずれも未採用。
- 予測の原価はトークンの標準/高負荷**仮定**であって実Gemini請求ではない。高負荷1,480/1000/150でAI推定¥1,056.80、Stripe仮手数料¥63.64、残¥359.56（税・Free・hosting・失敗/再試行・返金前）。仮に税込額の10/110を税相当留保すると残¥225.01。値上げすれば必ず黒字になるという証拠ではない。
- Free30日理論最大3,000会話ターンに対して1,000Proでも少ない。Proの集中利用・追加の講評価値・学習継続機能等を訴求する必要。未実装機能は宣伝しない。
- **実際に価格・上限を変える前に**、オーナー選択、Cloudflare/Googleの実原価とFree費用、Stripe sandbox、本番法的表示・決済フォーム更新・旧契約の扱い、個別承認が必要。Stripe実操作は帰宅後に保留中。

## 2026-10-20 最新：ユーザーがPro 1,480円を選択。機能を拡充した（未公開）

- **最新のユーザー判断**：「1,480円にしてみる。その代わり、Proの機能ももっと充実させたい」。従来の680円案は**旧案**。過去の「価格未決定」「680円を維持」の説明はこの日付の決定で上書きされる。ただし**実Stripe価格や本番D1/Workerへの適用許可ではない**。帰宅後のCloudflare/Stripe操作は引き続き保留。
- [PR #72](https://github.com/keito0518/speakingym/pull/72) を [DRAFT #62](https://github.com/keito0518/speakingym/pull/62) の**開発ブランチにマージ済み**。`pro-study.html`・`pro-study.js`・`pro-study-data.mjs` を追加：Worker `GET /entitlement` が署名済みログインユーザーをProと確認した場合のみ、保存講評/フレーズから日次復習カード最大5枚（回答表示、端末音声、表示中のみチェック）、保存履歴から自己記録の学習レポート。追加Geminiリクエストなし。Proページは**noindex・未公開プレビュー**。実ブラウザでログイン後E2Eは未確認。
- [PR #73](https://github.com/keito0518/speakingym/pull/73) も DRAFT #62ブランチにマージ済み。**次期Proドラフト仕様は税込月1,480円・月1,000会話ターン・月150 AI講評**、Freeは従来5セッション/日・講評3回/日で変更なし。Stripe Checkoutは厳格に**1,480円**のPriceを要求し、旧680円のStripe Price IDを指定したままなら拒否。ドラフト料金ページ・法定表示草案・プランWorker・テスト/スモークを更新。価格変更だけで旧会員のStripe契約を移行しない。
- **PR #62最新head確認値：`82c23e596e498c7057d10384ea8affc8bb57a25f`**。依然**DRAFT・main未マージ・Cloudflare未デプロイ**。子PR #73の最後のCIは **326/326 Node tests成功**、Worker・アカウント安全性・NEXT/mission・Chromium/WebKitも成功。次回変更時はGitHubの実状態を必ず再確認。
- `worker/PRO1480_DRAFT_RELEASE_GATE_2026-10-20.md` に販売を止める条件を記載。新価格・利用枠で**実AI原価は未測定**。高負荷仮定ではProが月1,000+150を使い切るとAI約1,056.80円、Stripe仮4.3%で63.64円、残359.56円（**税・無料ユーザー原価・Cloudflare・リトライ前**）。`scripts/pro1480-economics.mjs` は仮定用。旧 `scripts/pro680-economics.mjs` は比較用の歴史的資料であり、次期販売価格ではない。
- **次の作業**：本人の帰宅後Workで独立stage Worker/stage D1、実Stripe sandboxで新¥1,480 test Price・Checkout→署名Webhook→Pro→更新成功/失敗→Portal解約→期間満了を検証。匿名化したCloudflare GeminiログとGoogle請求を実測確認。法的な請求時開示/解約返金・利用規約を1,480円に合わせて確定。ステージングの学習画面・マイク・Pro学習スタジオの実ログイン検証。**本番のStripe Live、D1 migration、Gemini有料化、一般公開は独立した運営者の明示承認まで実施しない**。
