# Speakingym：支払い失敗のサンドボックス検証手順（2026-10-17）

## 現在の検証状況

- 実Stripeサンドボックスで、680円（税込）でのCheckout成功、支払い済み請求書、Pro付与、カウント減少、Customer Portalへの移動、期間終了時の解約予約とPro維持を確認済み。
- **未検証**：実Stripeでの更新決済失敗・支払い回復・更新日を過ぎた解約確定・Webhookイベント再送の実運用。
- Workerの模擬Stripe＋一時D1テストでは、更新失敗時Free、回復時Pro、イベント重複・逆転、期間切れがテスト対象。
- 本番の実課金は明示的な別承認まで開始しない。既存の10月17日購入済み・11月17日終了予定のテスト契約は触らない。

## 実際の更新失敗を検証するとき（管理画面で行う）

1. **既存テストユーザーと別の**Firebase Googleユーザーを用意し、そのUIDのみCloudflare Secretsの `BILLING_TEST_UIDS` に追加する。チャットにUIDやトークンを送らない。現在のUIDは残す。サンドボックスのみ使用。
2. 別ユーザーでSpeakingymにログイン → 正式な `/plans.html` のテストCheckoutから、Stripe公式テストカード `4242 4242 4242 4242` で月額680円のテスト契約を1件作成する。別のユーザーIDでCheckoutしたことを確認。実カードは使わない。
3. この**新しい契約に限り**Customer Portalで支払い方法を `4000 0000 0000 0341`（Stripeの「保存できるが請求は失敗する」テストカード）に変更する。カードを保存できない場合はそこで止め、無理に既存ユーザーの支払い方法は変えない。
4. Stripeサンドボックスの契約画面で「Run simulation / シミュレーション実行」が使える場合だけ、更新請求をテストする。StripeのTest Clocksは課金期間の時間経過を模擬できる。ただしStripeのシミュレーションによってCustomer/Subscription IDが変わる構成では、SpeakingymのD1にあるIDとの対応がなくなるため**エンドツーエンドテストとして合格扱いしない**。どのリソースが対象になるか確かめてから実行。終了時にシミュレーションのCustomer/Subscriptionが削除される場合があるので、既存契約には適用しない。
5. 更新失敗後、Stripe側で最新Invoiceが `open` 等、Subscriptionが `past_due` 等となっているか確認。Webhookの配送結果（2xx）を確認してから、**同じテストユーザー**のSpeakingym「契約状態を再確認」とマイページを確認する。期待値はFree。支払い失敗中にAI利用をProとして受け付けない。
6. 復旧の際は同じ新ユーザーの支払い方法をテスト用の成功カードに戻し、Stripeの該当InvoiceをStripeの標準操作で支払う。実際に `status=paid` と戻った後、SpeakingymがProに復帰するか確認する。**新しい契約を作ってテストしない。**
7. Stripe Webhookの同一イベント再送・古いイベント送信後も、Speakingymは「今現在」のStripe請求状態に同期し、二重決済や古いPro権限の復活がないことを確認する。

## 判定と安全上の制約

| 状態 | 期待する契約と権限 |
|---|---|
| `active` ＋ 当期 `paid` ＋ 有効期限内＋一致する価格 | Pro |
| `past_due` / `unpaid` / `incomplete` | Free |
| `active` でも最新Invoiceが未払い | Free |
| `cancel_at_period_end=true` かつ支払い済み・期限内 | Pro維持 |
| 期間終了 / 契約終了 | Free |
| Stripe API停止・D1同期失効 | Proの権限は閉じる（フェイルクローズ） |
| 別の顧客の失敗イベント | 現在ユーザーの状態を変更しない |

**禁止：** 本番用Stripeキー、実カード、既存契約のテストクロック、D1権限の手動昇格、課金用Secretのチャット貼り付け、Checkout再購入による「復旧」。

参考：
- https://docs.stripe.com/testing （保存は成功、請求は失敗する `4000000000000341`）
- https://docs.stripe.com/billing/testing/test-clocks/simulate-subscriptions
- https://docs.stripe.com/api/subscriptions/object

実Stripeの失敗・回復シナリオのテスト実施と結果は別途記録する。コードの自動テスト合格と混同しない。
