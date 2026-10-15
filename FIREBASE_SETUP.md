# Speakingym: Firebase Spark (無料) 初期設定

現在のサイトはログイン機能のコードを準備した状態です。**Firebaseプロジェクトをサイトオーナーが設定するまではゲストモードのまま**で、Googleログイン・クラウド同期は有効になりません。

## 料金を0円に保つ

- Firebaseコンソール https://console.firebase.google.com/ で**Spark (無料)** を選び、クレジットカードやCloud Billingを登録しない。Blazeプランへ変更しない。
- AuthenticationのGoogleログインだけを有効化。電話認証や課金が必要な機能は追加しない。
- Cloud Firestoreは無料枠対象の**最初の (default) データベースを1個だけ**作る。
- Cloud Functions、課金の必要なバックアップ・TTL・追加DBなどは使わない。
- 無料利用上限に達した場合は同期が失敗・停止する。課金への自動アップグレードはしない。
- Cloudflare WorkersおよびGeminiには別々の無料枠がある。それぞれの課金設定も維持する。

## 1. Firebase Webアプリを登録

1. Firebaseコンソール → プロジェクトを追加。Sparkを選ぶ。Google Analyticsは任意。
2. プロジェクトでWebアプリ (</>) を登録。Firebase Hostingへの移行は不要。
3. 公開Web設定の apiKey, authDomain, projectId, appId を控える。**Gemini APIキー・サービスアカウントの秘密鍵を混ぜない。**

## 2. Googleログインを有効化

1. Authentication → Sign-in method → Googleを有効化し、サポートメールを設定。
2. Authentication → Settings → Authorized domainsに **speakingym.pages.dev** を追加。旧GitHub Pagesも使用するなら **keito0518.github.io** を追加。
3. このサイトはポップアップ認証方式。iPhone Safariなどのブラウザではポップアップ制限があり得るため実機確認する。別ドメインでのリダイレクト方式にはサードパーティCookieの制限がある。
公式: https://firebase.google.com/docs/auth/web/google-signin
公式: https://firebase.google.com/docs/auth/web/redirect-best-practices

## 3. Cloud Firestoreを作成

1. Firestore Database → データベースを作成。Spark無料枠対象の (default) 1個だけ。
2. 作成したDBの**ルール**欄で、このリポジトリに含まれる firestore.rules の内容をすべて貼り付けて**公開**する。
3. **allow read, write: if true** のような公開ルールにはしない。別ユーザーの記録へのアクセスを禁止する。
公式: https://firebase.google.com/docs/firestore/security/rules-conditions

## 4. 公開Web設定をGitHubに入力

リポジトリ keito0518/speakingym の firebase-config.js を編集。以下の4つをFirebaseコンソールで表示された公開値に置き換える。

    export const firebaseConfig = {
      apiKey: "Firebase Web API key",
      authDomain: "project-id.firebaseapp.com",
      projectId: "project-id",
      appId: "Firebase Web app ID"
    };

これらのFirebase Web設定値は公開クライアント用であり、サービスアカウント秘密鍵とは異なる。**Gemini APIキーをここに貼らないこと。**

## 5. テストする

1. 公開サイト https://speakingym.pages.dev/account.html を開きGoogleログインする。
2. これまでゲスト利用した記録を取り込むか確認する。
3. 60秒チャレンジを行ってフレーズを保存。マイページの「同期」でクラウド保存を確認。
4. PCなど別ブラウザから同じGoogleアカウントでログインし、記録とフレーズが見えるか確認。
5. 別Googleアカウントでは前のユーザーの記録が表示されないことを確認。
6. ログアウト後には元のゲスト記録に戻ることを確認。
7. FirebaseのプロジェクトがSpark、Cloud Billingなしのままであることを確認。

## 保存の範囲とプライバシー

クラウド保存するのは以下の9カテゴリだけ:
- 60秒チャレンジの回数と自己評価
- 苦手カードID
- 直近20回のセッション履歴
- AI先生の講評履歴
- お気に入りフレーズ
- AIロールプレイの場面別達成回数
- AIロールプレイの保存表現
- カフェ練習の回数
- 旧トップの学習記録

音声ファイル、Googleパスワード、Gemini APIキー、Workerの接続先URLはクラウド保存しない。60秒チャレンジで認識した英文は、ユーザーが「英文の履歴保存」にチェックした場合だけ、履歴とともに同期される。

一度ログインしたブラウザでは、画面表示のためにローカルにも学習データを保持する。ログアウトするとアカウントデータを通常の学習画面から切り離し、ゲスト表示に戻す。異なる端末で同じ記録を同時編集した場合、ベータ版では最後に同期された変更が優先されることがある。

## 無料枠を抑える設計

- ログイン時、最大9個のFirestoreドキュメントを読み込む。
- 保存時は変更されたカテゴリだけを書き込む。常時リアルタイム監視は使わない。
- オフライン時はまず端末内に記録を残し、後で再同期する。
- 初回ゲストデータ取り込みは本人の確認を必要とする。
- Firestoreセキュリティルールが本人のUIDに一致する場合だけ読み書きを許可する。

**本番公開には、Google/Firebase側の設定が必要。コード変更だけではアカウント登録・同期は動かない。**
