"use client"; // 全員の勤怠＋管理者による打刻の追加・削除（店長以上）

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { fmtTime, todayStr } from "@/lib/format";
import { localDateStr, fmtDur, computeWork } from "@/lib/attendance";
import { logAudit } from "@/lib/audit";

const PUNCH_LABELS = {
  in: "出勤",
  break_start: "休憩開始",
  break_end: "休憩終了",
  out: "退勤",
};

const inputStyle = {
  border: "1.5px solid var(--line)",
  borderRadius: 9,
  padding: "8px 9px",
  fontFamily: "inherit",
  fontSize: 13,
  background: "#fff",
  color: "var(--ink)",
};

export default function AttendanceAdmin({ profile }) {
  const [date, setDate] = useState(todayStr());
  const [rows, setRows] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null); // 修正パネルを開いているユーザー
  const [busy, setBusy] = useState(false);

  // 手動追加フォーム
  const [addStaffId, setAddStaffId] = useState("");
  const [addType, setAddType] = useState("in");
  const [addTime, setAddTime] = useState("09:00");

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, full_name")
      .then(({ data }) => setStaff(data || []));
  }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("attendance")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(3000);
    setRows((data || []).filter((r) => localDateStr(r.created_at) === date));
    setLoading(false);
  }

  useEffect(() => {
    load();
    setEditId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const nameOf = (id) => {
    const p = staff.find((s) => s.id === id);
    return p ? p.full_name || "名無し" : "(不明)";
  };

  const byUser = {};
  rows.forEach((r) => {
    (byUser[r.user_id] = byUser[r.user_id] || []).push(r);
  });
  const ids = Object.keys(byUser);

  async function deletePunch(r) {
    if (!confirm("この打刻を削除します。よろしいですか？")) return;
    setBusy(true);
    const { error } = await supabase.from("attendance").delete().eq("id", r.id);
    setBusy(false);
    if (error) {
      alert("削除できませんでした。権限のSQLが実行されているか確認してください。");
      return;
    }
    logAudit(
      profile,
      "打刻削除",
      `${nameOf(r.user_id)} ${PUNCH_LABELS[r.type]} ${fmtTime(r.created_at)}`
    );
    await load();
  }

  async function addPunch() {
    if (!addStaffId) return alert("スタッフを選んでください。");
    const [hh, mm] = addTime.split(":").map(Number);
    const [y, m, d] = date.split("-").map(Number);
    const when = new Date(y, m - 1, d, hh, mm, 0);
    setBusy(true);
    const { error } = await supabase.from("attendance").insert({
      user_id: addStaffId,
      type: addType,
      store: null,
      created_at: when.toISOString(),
    });
    setBusy(false);
    if (error) {
      alert("追加できませんでした。権限のSQLが実行されているか確認してください。");
      return;
    }
    logAudit(
      profile,
      "打刻追加",
      `${nameOf(addStaffId)} ${PUNCH_LABELS[addType]} ${addTime}`
    );
    await load();
  }

  return (
    <div>
      <div className="list-head">
        <h2>全員の勤怠</h2>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={inputStyle}
        />
      </div>

      {/* 打刻を手動で追加（打刻し忘れ対応） */}
      <div className="staff-add" style={{ marginBottom: 12 }}>
        <p className="staff-add-title">打刻を手動で追加</p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 8,
          }}
        >
          <select
            value={addStaffId}
            onChange={(e) => setAddStaffId(e.target.value)}
            style={inputStyle}
          >
            <option value="">— スタッフを選ぶ —</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name || "名無し"}
              </option>
            ))}
          </select>
          <div style={{ display: "flex", gap: 8 }}>
            <select
              value={addType}
              onChange={(e) => setAddType(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            >
              {Object.entries(PUNCH_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <input
              type="time"
              value={addTime}
              onChange={(e) => setAddTime(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              type="button"
              className="act-btn primary"
              disabled={busy}
              onClick={addPunch}
            >
              追加
            </button>
          </div>
        </div>
        <p style={{ fontSize: 11.5, color: "var(--ink3)", margin: "8px 2px 0" }}>
          選んだ日付（{date}）に記録されます。
        </p>
      </div>

      {loading ? (
        <p style={{ padding: 16, color: "#7A6B5C" }}>読み込み中…</p>
      ) : !ids.length ? (
        <div className="empty">
          <div className="em-ic">⏰</div>
          <h3>この日の打刻はありません</h3>
        </div>
      ) : (
        ids.map((id) => {
          const events = byUser[id];
          const s = computeWork(events);
          const inT = s.firstIn ? fmtTime(s.firstIn.created_at) : "—";
          const outT = s.lastOut ? fmtTime(s.lastOut.created_at) : "勤務中";
          const editing = editId === id;
          return (
            <div key={id} style={{ borderTop: "1px solid var(--line)" }}>
              <div className="att-log">
                <div className="staff-main">
                  <div className="staff-name">{nameOf(id)}</div>
                  <div className="staff-meta">
                    {inT} 〜 {outT}　{fmtDur(s.worked)}
                    {!s.lastOut && (
                      <span style={{ color: "var(--warn)", fontWeight: 700 }}>
                        　⚠️退勤なし
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  className="act-btn"
                  onClick={() => setEditId(editing ? null : id)}
                >
                  {editing ? "閉じる" : "修正"}
                </button>
              </div>

              {editing && (
                <div style={{ padding: "0 2px 12px" }}>
                  {events.map((r) => (
                    <div
                      className="att-log"
                      key={r.id}
                      style={{ marginBottom: 6 }}
                    >
                      <span className="t">{fmtTime(r.created_at)}</span>
                      <span className="lbl">{PUNCH_LABELS[r.type]}</span>
                      <button
                        type="button"
                        className="act-btn danger"
                        style={{ marginLeft: "auto" }}
                        disabled={busy}
                        onClick={() => deletePunch(r)}
                      >
                        削除
                      </button>
                    </div>
                  ))}
                  <p
                    style={{
                      fontSize: 11.5,
                      color: "var(--ink3)",
                      margin: "2px 2px 0",
                    }}
                  >
                    時刻を直したいときは、いったん削除して上の「手動で追加」から入れ直してください。
                  </p>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
