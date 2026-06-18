# Dotto Feedback Notifier

Google Formsからのフィードバックを自動的にNotionとSlackに通知するGoogle Apps Scriptプロジェクト。

## 技術スタック

- TypeScript
- Google Apps Script
- clasp (開発・デプロイツール)
- pnpm (パッケージマネージャー)

## セットアップ

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. スクリプトプロパティの設定

Google Apps Scriptのエディタで以下のプロパティを設定してください:

- `NOTION_API_TOKEN`: NotionのAPIトークン
- `DATABASE_ID`: NotionのデータベースID
- `SLACK_WEBHOOK_URL`: SlackのIncoming Webhook URL（オプション）

### 3. ビルド

TypeScriptからJavaScriptにコンパイル:

```bash
pnpm build
```

### 4. デプロイ

Google Apps Scriptにプッシュ:

```bash
pnpm push
```

または、ビルドとデプロイを一度に:

```bash
pnpm deploy
```

## 開発ワークフロー

1. `src/main.ts`を編集
2. `pnpm build`でビルド
3. `pnpm push`でGoogle Apps Scriptにプッシュ
4. Google Formsでトリガーを設定

## プロジェクト構造

```
.
├── src/
│   └── main.ts          # メインのTypeScriptファイル
├── dist/                # ビルド後のJavaScriptファイル
├── .clasp.json          # clasp設定
├── appsscript.json      # Apps Script設定
├── tsconfig.json        # TypeScript設定
└── package.json         # プロジェクト設定
```

## 機能

- Google Formsからフィードバックを受信
- Notionデータベースに自動登録
- Slack通知（オプション）
- バグ報告と機能要望の分類
