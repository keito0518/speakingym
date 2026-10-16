# Speakingym 会員プラン制御：無料プラン先行導入

この機能は **決済ではありません**。既存のFirebaseログインを使い、Cloudflare Workers Free + D1 Freeで、AI実戦英会話とAI先生の回数を**サーバー側で厳密に制御する準備**です。

## 利用枠（仮設定）

| プラン | AI実戦英会話 | AI先生 | 60秒チャレンジ・復習 |
|---|---|---|---|
| Free | 1日3セッション | 1日1回 | 無制限 |
| Pro（動作確認用） | 1日20セッション | 1日10回 | 無制限 |

- 日本時間の午前0時に1日分の枠が更新される。
- AI会話は1セッション7分以内、1セッション20リクエスト以内。利用枠に空きがあっても既存のIP・全体レート制限が優先される。
- **Proの販売・クレジットカード決済・Stripe連携は未実装。** ProはCloudflare D1上で**運営者のみが**検証用に設定可能。
- 1日利用枠はGoogleログインアカウントに紐づく。Googleログインをしていない場合、**制御有効後のAI機能は使えない**。60秒チャレンジのAIを使わない部分はゲストでも使える。
- 無料枠のGemini APIキーは請求先未設定を維持。D1やWorkersもFreeの範囲内に収め、無料枠に到達したら処理を停止する。自動課金はしない。

## 重要：Cloudflareへのデプロイの順番

**データベースの準備が完了するまで、`ENFORCE_PLANS=true` を設定しないでください。** 未設定またはfalseのときは、従来と同じ公開ベータ版として動作します。過去のコードに戻す必要はありません。

### ステップ1：D1（Free）データベースを作る

1. Cloudflare Dashboard → **Workers & Pages → D1** → **Create Database** で `speakingym-plans` を作成する。
2. D1の **Console** で `worker/schema-plans.sql` を実行する。PCのターミナルなら：
   ```sh
   npx wrangler d1 create speakingym-plans
   npx wrangler d1 execute speakingym-plans --remote --file=./schema-plans.sql
   ```
   ※ ターミナル実行時は `worker` フォルダで実行。
3. 作成したデータベースの **Database ID（UUID）** を控える。IDは秘密鍵ではない。
4. `worker/wrangler.toml` に以下を追加してデプロイ。**UUIDは実際の値に置き換える**（プレースホルダーのままコミットしない）。
   ```toml
   [[d1_databases]]
   binding = "PLAN_DB"
   database_name = "speakingym-plans"
   database_id = "実際のUUID"
   ```
5. WorkerのSettingsでも `PLAN_DB` というD1バインディングが存在することを確認。公開Workerへの設定は **`speakingym-survival-ai`** と一致させる。

### ステップ2：事前動作確認

- `https://speakingym-survival-ai.keitokeitokeito0518.workers.dev/health` の `plansReady:true` が確認できるまで先に進まない。
- Googleログイン済みの本番Webアプリから、実際に `GET /entitlement` と `POST /sessions` が正しく認証されることをテストする（`ENFORCE_PLANS=true` での最終確認が必要）。
- Firestoreの `firestore.rules` を変更しない。プランはD1のみを信用し、Web上の自己申告や学習記録からProを判断しない。

### ステップ3：本番制限を有効にする

Cloudflare Workerの **Variables and Secrets** に `ENFORCE_PLANS` = `true` を追加し再デプロイ。

- `GET /health`: `plansEnabled:true` `plansReady:true` を確認。
- 一般のゲスト：AIリクエストに `login_required`（HTTP 401）。
- Free会員：AI会話を3セッション開始したら4回目は `daily_session_limit`（HTTP 429）。
- AI先生：初回利用後の2回目は `daily_teacher_limit`（HTTP 429）。
- マイページに本日の残り回数が表示される。
- Workerに `PLAN_DB` がない場合はエラーで処理を停止（プラン判定なしでGeminiを呼ばない）。
- もし問題が出たら `ENFORCE_PLANS` を `false` に戻して従来のAIベータに切り替えられる。

### テスト用Proの設定（運営者専用）

Cloudflare D1の管理画面（またはWrangler）でのみ実行する。UIDはGoogleログインのFirebase UIDから取得し、他人のUIDを誤入力しないこと。

```sql
INSERT INTO account_plans (uid,tier,updated_at) VALUES ('FirebaseのUID','pro',strftime('%s','now'))
ON CONFLICT(uid) DO UPDATE SET tier='pro',updated_at=excluded.updated_at;
```

Freeへ戻す：

```sql
DELETE FROM account_plans WHERE uid='FirebaseのUID';
```

※ ユーザー側のWeb画面・Firestoreを編集してもProに変更できない。

## 利用上限の安全設計

- Google署名のFirebase IDトークンをWorkersのWebCryptoで検証する。署名、kid、alg、aud、iss、sub、exp、iat、auth_timeを確認。
- 自分のUID以外のセッションは利用できない。作成時のカウントと許可は単一SQLite文で行い、同時リクエストでも上限を守る。
- 返答時のセッションIDは運営サーバー側でランダムに採番。セッションの7分制限・最大20ターンがある。
- Geminiがエラーを返したAI先生の利用枠は可能な範囲で返却。AI会話はセッション作成で枠を消費する。
- 残回数は `GET /entitlement` から取得。クライアントの値は表示専用。
- FirebaseのWeb公開設定は秘密鍵ではない。**サービスアカウント秘密鍵、Geminiキー、Stripe secret keyはGitHubに保存しない。**

## 決済は次フェーズ

StripeのテストモードでCheckout・Webhookを追加する際、**Stripeから署名検証済みWebhookの支払い完了を受けた時だけ**D1の `account_plans` をproに変更する。決済前に手動Proを一般開放しない。課金開始まで決済UIや料金の確約をしない。
