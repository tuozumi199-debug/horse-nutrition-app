# HorseFeed Manager

馬の給餌量、飼料成分、栄養要求量、日次記録、月次集計、シミュレーションを管理するブラウザアプリです。GitHub Pages で静的サイトとして公開できます。

## できること

- 馬プロフィール管理：体重、BCS、活動量、写真、健康メモ
- 飼料マスタ管理：乾物率、DE、粗タンパク、Ca、P、Na、Seなど
- 給餌記録：朝・昼・夕・夕飼いの4回を個別に入力。量は毎回変更可能
- 栄養分析：4回分を合算した1日合計を、要求量100%に対する達成率、棒グラフ、レーダーチャート、アラートで表示
- シミュレーション：餌の量を変更し、スコア差分を確認して標準メニューに反映
- 月次集計：馬別・飼料別の使用量と概算金額を、4回分の給餌履歴から合算してCSV出力
- バックアップ：JSON出力・読み込み

## 注意

このリポジトリに含まれる飼料成分値・要求量は、動作確認用のサンプルです。実運用では、飼料メーカーの分析値、牧草分析値、獣医師・栄養士の判断、出典確認済みの要求量に差し替えてください。有料書籍・有料DBの成分表をそのまま公開リポジトリに含めないでください。

## ローカルで動かす

```bash
npm install
npm run dev
```

ブラウザで表示された URL を開きます。

## ビルド

```bash
npm run build
npm run preview
```

## GitHub Pages で公開する

### 1. GitHubで新しいリポジトリを作る

例：`horse-nutrition-app`

### 2. このフォルダの中身をアップロード

GitHub の Web UI からアップロードする場合は、以下をすべて含めてください。

- `src/`
- `public/`
- `index.html`
- `package.json`
- `vite.config.ts`
- `tsconfig.json`
- `.github/workflows/deploy.yml`

### 3. Actions を有効化

`main` ブランチへ push すると、GitHub Actions が `npm run build` を実行し、`dist` を GitHub Pages に配置します。

### 4. Pages 設定

リポジトリの `Settings > Pages` で、Source が `GitHub Actions` になっていることを確認してください。

## iPhoneでホーム画面に追加

Safariで公開URLを開き、共有ボタンから「ホーム画面に追加」を選びます。ホーム追加後は、PWA風の画面として開けます。

## データ保存の仕様

MVPでは IndexedDB に保存します。つまり、データはブラウザ・端末ごとに保存されます。公開サイトのサーバーやGitHubには入力データは送信されません。共有運用をする場合は、次段階で Supabase、Firebase、SharePoint などのバックエンド追加を想定してください。

## 次に追加しやすい機能

- 牧草分析PDF/CSVの取り込み
- 体重・BCSの推移グラフ
- 複数スタッフのログイン
- 変更承認フロー
- 獣医師コメント欄
- SharePoint List / Microsoft 365 連携
- 給餌担当者チェックリスト
