# Speakingym SURVIVAL | AI接続（初期費用0円）

このディレクトリには **Gemini Free Tier × Cloudflare Workers Free** のバックエンドが準備されています。**まだサーバーはデプロイされていないため、公開サイトはAI未接続**です。

## 重要：無料のまま開始する条件

1. Google AI Studioで **請求先未連携の無料プロジェクト** を選び、GeminiのFree Tier APIキーを発行する。有料プロジェクトのキーは使わない。
2. Cloudflareは **Workers Free** で登録する。Workers Paidにアップグレードしない。
3. **`ALLOW_AI` を `true` にするまでWorkerはGeminiを呼びません**。APIキーを登録しただけでは稼働しない安全スイッチです。
4. Gemini無料枠の上限に達したらAI会話を停止し、ブラウザ側は従来のルール分岐に戻す。自動で課金枠を使わない。
5. 無料枠で送った英会話テキストはGoogleの製品改善に利用されることがある。**個人情報・秘密情報を入力しない**注意書きが必要。
6. **公開向け認証はまだない**ため、まず本人・少人数限定で検証する。レート制限は厳密な利用回数管理ではない。

## Gemini APIキーを発行

[Google AI StudioのAPIキー画面](https://aistudio.google.com/apikey) で Free Tier のキーを作成する。

モデルは **`gemini-3.5-flash-lite`**。2026年10月のGoogle公式案内では旧2.5シリーズは新規プロジェクトで利用が制限される場合があるため、こちらを採用しました。

**APIキーをGitHub・HTML・チャットに投稿しないでください。**

## Cloudflare Workers Freeにデプロイ

### ブラウザから作業する場合（スマホ・PC）

1. [Cloudflare dashboard](https://dash.cloudflare.com/) に無料アカウントでログインし、**Workers & Pages → Create application → Import a repository** を選ぶ。
2. GitHubの `keito0518/speakingym` を接続する。プロジェクトの **Root directoryを `worker`** に設定する。`worker/wrangler.toml` の `name = "speakingym-survival-ai"` とWorker名を一致させる。
3. Workers Freeであることを確認し、**Save and Deploy**。WorkerのURLを控える。
4. Workerの **Settings → Variables and Secrets → Add** で `GEMINI_API_KEY` を **Secret型** として登録（Google AI StudioのFree Tierプロジェクトから発行）。GitHubに書き込まない。
5. `ALLOW_AI` を値 `true` で追加してデプロイすると有効化。テスト前は `false` のままにしておける。
6. Workerの `/health` をブラウザで開き、`aiConfigured:true` を確認する。サイトの3分ミッションでWorker URLを登録して試す。

GitHub連携を使う場合、mainへのコミットが自動で再デプロイされる設定になり得ます。秘密情報は必ずWorker側のSecretsに保存してください。

### PCのターミナルから作業する場合

この `worker` フォルダで以下を実行。

```sh
npx wrangler login
npx wrangler deploy
npx wrangler secret put GEMINI_API_KEY
# テスト前に明示的に有効化（入力値は true）
npx wrangler secret put ALLOW_AI
```

- デプロイ後、`https://speakingym-survival-ai.<account>.workers.dev/` 形式のURLが発行されます。
- APIキーは `GEMINI_API_KEY` というWorkers **Secret** として入力。GitHubに保存しない。
- `GET https://<worker-url>/health` で `aiConfigured:true` を確認できる。Geminiキーと `ALLOW_AI=true` の両方が設定されている時だけtrueです。
- **停止したい場合：** `ALLOW_AI` を `false` に変更して再デプロイしてください。停止後は従来のルール型会話のみ動作します。
- `wrangler.toml` のレート制限は、暫定で同一IP **6回／分**、全体 **30回／分**。Cloudflareのレート制限はデータセンターごと・概算であり、厳密な全世界共通利用上限ではない。

### サイトで接続テスト

[Speakingym 3分ミッション](https://keito0518.github.io/speakingym/mission.html) の「AI自由会話を接続する（開発者向け）」を開き、**Worker URLだけ** 登録してください。Gemini APIキーは入力しません。

設定URLはそのブラウザにのみ保存されます。**他のユーザーは引き続きルール型分岐モード**です。検証後、全ユーザー向けのデフォルトURLをサイトに設定できます。

## ローカルの安全性テスト

Node.js 22以上で `node --test worker/ai-worker.test.mjs` をリポジトリのルートから実行。GitHubのPRでも同じテストを自動で実行します。**実際のGemini APIキー・Cloudflareアカウント・課金は不要**なモックテストです。

## システムと制約

- `mission.html`：今ある3分会話画面、ブラウザ音声認識と読み上げ（基本無料）
- `ai-worker.js`：Geminiを呼び出す新しい本番候補のWorker。APIキー、入力長、出力長、Origin、リクエスト数を制限
- `wrangler.toml`：Workers Free向けの設定・レート制限
- `mission-worker.js`：旧版のWorker雛形。**新規デプロイには使わない**。モデルは旧2.5を指定しています。

通信内容は会話履歴・ユーザーの英語・会話の達成状況で、Geminiに送信されます。発音の評価は行いません。Workersのレート制限やOrigin検査だけではボット対策・認証として十分ではないため、一般公開前には認証・Turnstile・厳密な回数制限を追加検討してください。

### 内部API

`POST /` で以下のJSONを受信：
```json
{
  "level": "standard",
  "userText": "I ordered iced oat milk, but this is hot.",
  "history": [{"role":"assistant","content":"Is everything okay?"}],
  "facts": {"problem":false,"iced":false,"oat":false,"fix":false},
  "remaining": 120
}
```
返答は `{"reply":"...","missionState":{"problem":true,"iced":true,"oat":true,"fix":false}}` 形式。

現時点では**Gemini実API接続・iPhone実機での動作は未検証**。安全性テストは実APIへの接続成功を証明するものではありません。キーがない状態ではAI本番公開済みとは扱いません。
