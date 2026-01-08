# 勤怠KUN - 勤怠管理システム【デモ版】

<p align="center">
  <img src="assets/images/logo.png" alt="勤怠KUN" width="200">
</p>

<p align="center">
  <strong>飲食店向け勤怠管理システム</strong><br>
  出退勤打刻・休憩管理・勤怠確認がワンストップで完結
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/demo-online-green.svg" alt="Demo">
  <img src="https://img.shields.io/badge/license-MIT-yellow.svg" alt="License">
</p>

---

## 🎮 デモを試す

**デモアカウント：**

| 種別 | ログインID | パスワード |
|------|-----------|-----------|
| 店舗用 | `demo` | `demo1234` |
| 管理者 | `admin` | `admin1234` |

**従業員ID：** `D001` ~ `D005`

---

## ✨ 主な機能

### 📱 従業員向け機能
- **出退勤打刻** - ワンタップで出勤・退勤を記録
- **休憩管理** - 休憩開始・終了をリアルタイム記録
- **ヘルプ勤務** - 他店舗へのヘルプ勤務にも対応
- **勤怠確認** - 自分の勤務履歴を確認

### 👨‍💼 管理者向け機能
- **従業員管理** - スタッフの追加・編集・削除
- **勤怠確認** - 全従業員の勤怠データを一覧表示
- **勤怠修正** - 打刻漏れ・誤りの修正
- **Excel出力** - 勤怠データをExcel形式でエクスポート
- **時給設定** - 従業員ごとの時給管理

---

## 🛠️ 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フロントエンド | HTML5, CSS3, JavaScript (Vanilla) |
| バックエンド | PHP 8.x, MySQL |
| デモ版 | LocalStorage（サーバーレス） |
| その他 | SheetJS（Excel出力） |

---

## 📁 プロジェクト構成

```
KintaiKUN-Demo/
├── index.html          # メインHTML
├── css/
│   └── styles.css      # スタイルシート
├── js/
│   ├── demo-api.js     # デモ用モックAPI
│   ├── main.js         # メインロジック
│   ├── attendance.js   # 勤怠処理
│   ├── clock.js        # 時計表示
│   └── ...             # その他モジュール
├── assets/
│   └── images/         # 画像ファイル
└── README.md
```

---

## 🚀 ローカルで実行

```bash
# リポジトリをクローン
git clone https://github.com/yourusername/KintaiKUN-Demo.git

# ディレクトリに移動
cd KintaiKUN-Demo

# ローカルサーバーを起動（Python）
python -m http.server 8000

# または Node.js の場合
npx serve .
```

ブラウザで `http://localhost:8000` にアクセス

---

## 📸 スクリーンショット

### ログイン画面
デモ用のログインヒントが表示されます。

### 打刻画面
シンプルで直感的なUI。出勤・退勤・休憩をワンタップで記録。

### 管理画面
従業員一覧、勤怠データの確認・修正が可能。

---

## 🎯 このプロジェクトのポイント

1. **実務で使える設計**
   - 複数店舗対応（ヘルプ勤務機能）
   - 時給計算・給与計算機能
   - Excel出力によるデータ連携

2. **使いやすいUI/UX**
   - タブレット・スマホ対応のレスポンシブデザイン
   - 大きなボタンで打刻ミスを防止
   - リアルタイム時計表示

3. **堅牢なアーキテクチャ**
   - フロントエンド/バックエンド分離
   - RESTful API設計
   - データベース正規化

---

## 📄 ライセンス

MIT License

---

## 👤 作者

**Your Name**

- GitHub: [@yourusername](https://github.com/yourusername)
- Portfolio: [your-portfolio.com](https://your-portfolio.com)

---

<p align="center">
  ⭐ このプロジェクトが参考になりましたらStarをお願いします！
</p>
