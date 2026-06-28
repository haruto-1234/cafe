// アプリ全体で使う設定値（お店・役割・スタッフ番号の変換）。

export const STORES = [
  { name: "渋谷店", color: "#C2703D" },
  { name: "新宿店", color: "#4F8A78" },
  { name: "横浜店", color: "#3E6FB0" },
];
export const storeColor = (n) =>
  (STORES.find((s) => s.name === n) || {}).color || "#999";

export const ROLE_LABELS = {
  admin: "管理者",
  manager: "店長",
  fulltime: "正社員",
  leader: "リーダー",
  part: "パート・アルバイト",
};
export const roleLabel = (r) => ROLE_LABELS[r] || r || "";

// スタッフ番号 → ログイン用の内部メールアドレスに変換
export const EMAIL_DOMAIN = "@cafe-more.local";
export const toEmail = (no) => String(no).trim() + EMAIL_DOMAIN;
