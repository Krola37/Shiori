# Shiori

Windowsのエクスプローラーのような操作感で、大量のブックマークを整理できるブックマーク管理アプリ(Next.js)。
データはブラウザの LocalStorage に保存されるため、サーバー側にデータベースは不要で、オフラインでも動きます。

## 主な機能

- **フォルダの階層管理**: 親/子/孫の入れ子フォルダ。開閉、親子セットでのドラッグ移動、同名フォルダの重複作成防止、右クリックでの作成・名前変更・削除(「未分類」は削除不可)
- **エクスプローラー風の操作**: ブックマークをフォルダへドラッグ&ドロップで移動、パンくずリスト、日本語UI
- **ブックマーク編集**: URL・タイトル・メモ・タグの編集。URL保存時にタイトルとOGP画像を自動取得(`/api/getTitle`)
- **並べ替えと検索**: 日付順・名前順の切り替え
- **一括整理**: 複数選択・全選択して、まとめて移動・削除
- **CSVインポート**: Raindrop.io などから書き出したCSVを一括取り込み

機能の詳細は [function.md](function.md) を参照してください。

## 技術構成

- Next.js 16(App Router)/ React 19 / Tailwind CSS
- 保存: LocalStorage(ブラウザ内で完結)
- API: `app/api/getTitle` が、指定URLのHTMLからタイトルとOGP画像を取得
- デプロイ: Netlify(`netlify.toml`)

## 開発

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開きます。

```bash
npm run build   # 本番ビルド
npm run lint    # ESLint
```

## 注意

データはブラウザごとに保存されます。別のブラウザやPCへ移す場合や、ブラウザのデータを消去する前には、バックアップに注意してください。
