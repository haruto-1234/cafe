// 日付・時刻を見やすい形にする関数たち。

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];
const pad = (n) => String(n).padStart(2, "0");

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// "2026-06-28" → "今日 ・ 6月28日(日)"
export function fmtDate(ds) {
  if (!ds) return "";
  const [y, m, d] = ds.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  let label = `${m}月${d}日(${WEEK[dt.getDay()]})`;
  if (ds === todayStr()) label = "今日 ・ " + label;
  return label;
}

// ISO日時 → "14:05"
export function fmtTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
