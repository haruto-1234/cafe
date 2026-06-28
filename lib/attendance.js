// 勤怠（打刻）の計算をまとめた部品。個人用・全員用の両方で使う。

// ISO日時 → ローカルの "YYYY-MM-DD"
export function localDateStr(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ミリ秒 → "○時間○分"
export function fmtDur(ms) {
  if (ms < 0) ms = 0;
  const m = Math.floor(ms / 60000);
  return Math.floor(m / 60) + "時間" + (m % 60) + "分";
}

// 打刻イベント（古い順）から、働いた時間と休憩時間を合算する。
// firstIn / lastOut は「全員の勤怠」表示用（最初の出勤・最後の退勤）。
export function computeWork(events) {
  let worked = 0,
    brk = 0,
    workSince = null,
    breakSince = null,
    firstIn = null,
    lastOut = null;
  for (const r of events) {
    const t = new Date(r.created_at).getTime();
    if (r.type === "in") {
      workSince = t;
      if (!firstIn) firstIn = r;
    } else if (r.type === "break_start") {
      if (workSince != null) {
        worked += t - workSince;
        workSince = null;
      }
      breakSince = t;
    } else if (r.type === "break_end") {
      if (breakSince != null) {
        brk += t - breakSince;
        breakSince = null;
      }
      workSince = t;
    } else if (r.type === "out") {
      if (workSince != null) {
        worked += t - workSince;
        workSince = null;
      }
      lastOut = r;
    }
  }
  const now = Date.now();
  if (workSince != null) worked += now - workSince; // 勤務中
  if (breakSince != null) brk += now - breakSince; // 休憩中
  return { worked, brk, firstIn, lastOut };
}
