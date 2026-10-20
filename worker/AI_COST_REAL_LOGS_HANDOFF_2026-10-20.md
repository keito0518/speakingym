# Speakingym｜Gemini実測原価の取得と安全な判定（2026-10-20）

> **実測値の取得状況：未確認。** GitHubのコードとCIにはCloudflare本番Workerの履歴ログ本文・Google AI Studioの請求明細への読取権限がないため、現時点では実測単価を確定できない。本書には**実測結果を捏造しない**ためのチェックを記録する。

## 1. すでに実装された観測値

- 本番Workerの `worker/cost-telemetry.js` は、Geminiの `usageMetadata` が存在する場合に `speakingym_gemini_usage_v2` を `console.log` へ出力する。フィールド：モデル、機能区分 conversation/reflex_coach、サーバーで確定したプラン free/pro/legacy、入力・出力・思考・キャッシュトークン数、有料Standard単価換算USDなど。
- AIの処理結果・所要時間・安全なエラー種別は `speakingym_ai_outcome_v1` として出力される。
- 生の会話、Firebase UID、IPアドレス、Stripeデータ、Gemini APIキーを**この2種のカスタムログには含めない**。
- **注意**：Cloudflareの一般的なリクエストログ・観測エクスポートには、これ以外のメタデータが含まれる可能性がある。生エクスポートは安全な共有データと見なさず、機密情報をチェックしてから扱う。
- これらのカスタムログが本番のCloudflareで保存・閲覧できるかは**未確認**。新しい観測機能の有効化・構成変更はしていない。

## 2. 本番でのデータ取得（閲覧のみ・AI APIコールなし）

1. Cloudflare に運営者のアカウントでログイン。
2. **Workers & Pages → speakingym-survival-ai → Observability / Logs** を開く（2026年のUI表記に多少違いあり）。
3. Workers Logs の保存が有効か、期間を過去3日間にできるかを**見るだけ**で確認。Freeの場合、Workers Logsの基本保存期間は3日間（公式）。
4. イベント本文に `speakingym_gemini_usage_v2` または `speakingym_ai_outcome_v1` があるかを検索。リクエスト数・利用可能な期間を記録。
5. 取得可能なら、その**2つのイベントだけ**を対象にJSONで書き出し、ローカルで集計。生ログにはリクエストメタ情報が含まれることがあるので、このまま第三者へ公開しない。ユーザーの会話や個人情報を表示したりメッセージへ貼り付けたりしない。
6. `node scripts/ai-cost-report.mjs /safe/path/filtered-cloudflare-export.json` を実行（Node v22）。必要なら為替は `SG_USDJPY=160 node scripts/ai-cost-report.mjs ...`。出力の集計JSONはAPIキー/UID/会話を含まず、当該出力のみをレビューに渡す。
7. **ログが0件**なら「実測サンプル不足」で停止。ユーザーやAIに不要な発話を強要せず、ログ記録が有効か/ログ保持期間/自然発生の実利用があるかを確認する。

このアカウントにCloudflareの外部ログ読取接続はない。上記の操作をこのGitHub専用エージェントが代行したとは言わない。CloudflareのCloud Browserが使えるWorkモードでは、必要なら所有者がログイン承認した後に閲覧・集計を依頼する。

## 3. レポートと判断

スクリプト `scripts/ai-cost-report.mjs` は、改行区切りJSON・JSON配列・Cloudflare形式のJSONオブジェクト（`logs[].message` 等）から**明示的に許可した2イベントだけ**を読取る。出力は集計のみ。

- **Pro実測**：conversation:pro が30件、teacher:pro が10件以上の場合にのみ、暫定的な月600会話+100講評の試算を比較可能と表示。**30/10は最低限の分析入口であり、統計的な利益保証条件ではない**。
- **Pro未販売**：conversation:free および teacher:free の両方があれば `freeAsProProxyEstimate` に **Freeの利用量をPro販売時の費用代理データとして試算**。実際のPro会員の利用習慣や講評需要とは異なりうるので、これは**有料Proの実測ではない**。同様に最低限30/10件は必要。どちらかが不足なら収益判断を保留。
- **平均、観測p95、観測最大**：p95は高額外れ値を除外する場合がある。想定平均・想定p95×600/100の両方を表示するが、どちらも厳格な費用上限ではない。
- 請求額ではなく**有料Standard料金による換算値**。Google請求・Free APIのレート制限、Stripeの実際の適用手数料、為替、消費税、サーバー費用、Free全体の費用、リトライ・失敗後にメタデータがない呼び出し、観測のサンプリング・偏りは別。
- 提供開始前に、Cloudflare記録と**Googleの実際の請求画面**を照合し、無料ユーザー数/消費・同時接続ピーク・高使用者分布を把握する。

### 原価判断の停止条件

データがない/少ない → **NO-GO**。利用量は取れても請求・容量・リトライの不確実性がある → **まだNO-GO**。680円の採算判断・Pro上限・Free上限の変更には別途ユーザー承認が必要。Stripe live、Gemini paid tier、D1、AI利用枠は**一切変更しない**。

公式参考：
- <https://developers.cloudflare.com/workers/observability/logs/workers-logs/>
- <https://developers.cloudflare.com/changelog/post/2026-02-06-observability-ui-refresh/>
- <https://ai.google.dev/gemini-api/docs/pricing>
