# 🍷 ブラインドワイン会クイズ

> 準備ゼロで始められる、五感のためのブラインドクイズ・プラットフォーム

## セットアップ手順

### 1. Firebase プロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを追加」でプロジェクト作成
3. **Authentication** → 「始める」→「匿名」を有効化
4. **Firestore Database** → 「始める」→ テストモードで開始（後でルールを設定）

### 2. 環境変数の設定

```bash
cp .env.local.example .env.local
```

Firebase コンソール → プロジェクト設定 → マイアプリ → Firebase SDK snippet → 構成  
表示された値を `.env.local` に貼り付け。

### 3. 依存パッケージのインストール

```bash
npm install
```

### 4. ローカル起動

```bash
npm run dev
```

http://localhost:3000 にアクセス

### 5. Firestoreセキュリティルールの適用

```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # 既存プロジェクトを選択
firebase deploy --only firestore:rules
```

---

## 使い方

### 主催者（管理者）

1. `/` にアクセス → 「新しいワイン会を始める」
2. タイトル・評価項目・選択肢・正解・配点を入力
3. 作成後、管理者URLが発行される（**このURLを保存すること**）
4. QRコードを会場に表示 → 参加者をスキャン誘導
5. 「回答受付を開始する」ボタンで参加者の回答フェーズへ
6. 「集計して結果を発表する」で全員の画面が結果表示に切り替わる
7. CSV出力で結果をダウンロード

### 参加者

1. QRコードをスキャン
2. ニックネームを入力
3. 主催者のスタートを待つ
4. 各項目を選んで「投票する」（集計前であれば何度でも変更可）
5. 主催者が集計したら自動的に結果画面へ

---

## 画面構成

```
/                      ← ランディングページ
/admin/new             ← セッション作成（主催者）
/admin/[id]?token=xxx  ← コントロールパネル（主催者）
/join/[id]             ← 参加者画面（QRリンク先）
```

---

## データ構造

```
Firestore
└── sessions/{session_id}
    ├── title: string
    ├── status: "entry" | "answering" | "revealed"
    ├── adminToken: string (UUID)
    ├── createdAt: timestamp
    └── items: [
          {
            name: string,       // 例: "産地"
            options: string[],  // 例: ["フランス", "イタリア", "スペイン"]
            correct: string,    // 例: "フランス"
            point: number       // 例: 2
          }
        ]
    └── answers/{user_id}
        ├── nickname: string
        ├── lastUpdatedAt: timestamp
        └── responses: { "産地": "フランス", "品種": "ピノ・ノワール" }
```

---

## デプロイ（Firebase Hosting）

```bash
npm run build
firebase init hosting   # out ディレクトリを指定
firebase deploy
```

または Vercel に GitHub 連携してワンクリックデプロイも可能。
