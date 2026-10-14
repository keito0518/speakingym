# Speakingym SURVIVAL — AI接続ガイド（開発者向け）

Speakingym の [3分ミッション](../mission.html) は、GitHub Pages 上で **無料・設定不要のルール型分岐**として動作します。

このディレクトリの worker は、**将来、本物のAI返答を使いたいときの任意の拡張**です。GitHub にファイルを置くだけではAIは接続されません。Cloudflare Workers のデプロイ・Google Gemini API キーの登録が必要です。

## 構成

- \`mission.html\`（GitHub Pages）: テキスト入力、ブラウザ音声認識、会話の表示、3分間のタイマー、達成判定、振り返り
- \`mission-worker.js\`（Cloudflare Workers にデプロイ）: Gemini APIキーをサーバー側の secret に保持し、Emma の自然な英文の返答を生成
- Geminiの音声認識・音声合成は使いません。これらは現在のブラウザ機能のままです。

## AI接続（任意）

1. Cloudflare の管理画面で Worker を新規作成し、\`mission-worker.js\` のコードを登録してデプロイ
2. Worker の **Secrets** へ \`GEMINI_API_KEY\` を登録（コードには書き込まない）
3. Worker の **Variables** へ \`ALLOW_AI\` = \`true\` を設定。ローカル開発を許可する場合のみ \`ALLOW_LOCAL_DEV\` = \`true\` も設定
4. Google AI Studio で \`gemini-2.5-flash-lite\` の利用枠・課金・クォータを確認し、**無料枠内に収まる制限を設定**する
5. [mission.html](../mission.html) の「AI自由会話を接続する（開発者向け）」に Worker の HTTPS URL を登録

登録されたURLはそのブラウザのローカルストレージに保存されます。失敗したら自動的にルール型分岐へ戻ります。Gemini APIキーは **Webページのコードにも利用者のブラウザにも公開されません**。

## セキュリティ・費用に関する注意

- Google Geminiの無料枠にはリクエスト数制限やデータ利用条件があります。課金が有効なプロジェクトを使う場合、意図しない費用が発生する可能性があります。
- Worker は **GitHub Pagesのオリジン以外のブラウザをCORSで拒否**しますが、CORSはAPIの認証や完全な不正利用対策ではありません。第三者は偽のOriginヘッダを付けて直接アクセスできる場合があります。**一般公開前に、Cloudflare等のレート制限、ボット対策、Gemini側の厳格なクォータ設定を必ず追加してください。**
- 接続されたAIサーバーにはユーザーが入力・発話して文字起こしされた英文、直近の会話履歴、進行状況が送信されます。ユーザーへの明示とプライバシーポリシー整備が必要です。
- \`mission-worker.js\` のAPI実行部分は雛形です。実際のCloudflare・Gemini環境での接続確認は、デプロイしてから行う必要があります。
- \`ALLOW_AI=true\` を設定しなければ、WorkerはAIリクエストを実行しません。

## API仕様（試作版）

ブラウザからWorkerへ \`POST application/json\`：

\`\`\`json
{
  "level": "standard",
  "goal": "Correct a wrong café order",
  "userText": "I ordered an iced oat latte. Can you remake it?",
  "history": [{"role": "assistant", "content": "Is everything alright?"}],
  "facts": {"problem": false, "iced": false, "oat": false, "fix": false},
  "remaining": 155
}
\`\`\`

レスポンス：

\`\`\`json
{
  "reply": "I'm sorry about that! I'll make a fresh iced oat latte for you.",
  "missionState": {"problem": true, "iced": true, "oat": true, "fix": true}
}
\`\`\`

\`missionState\` が示す事実が確定した場合に限り、ブラウザ側の達成チェックが進みます。正規の発話データが得られない場合、発音や文法の正確さは採点しません。
