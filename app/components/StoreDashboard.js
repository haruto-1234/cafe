"use client"; // 店舗別の月次ダッシュボード（店長以上）

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { STORES } from "@/lib/constants";
import { localDateStr, computeWork, fmtDur } from "@/lib/attendance";

const pad = (n) => String(n).padStart(2, "0");

export default function StoreDashboard() {
  const [month, setMonth] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const d = new Date();
    setMonth(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  }, []);

  useEffect(() => {
    if (!month) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [y, m] = month.split("-").map(Number);
      const lo = new Date(new Date(y, m - 1, 1).getTime() - 86400000).toISOString();
      const hi = new Date(new Date(y, m, 1).getTime() + 86400000).toISOString();

      const [{ data: att }, { data: profs }, { data: reps }] = await Promise.all([
        supabase
          .from("attendance")
          .select("*")
          .gte("created_at", lo)
          .lt("created_at", hi)
          .order("created_at", { ascending: true })
          .limit(10000),
        supabase.from("profiles").select("id, store"),
        supabase
          .from("reports")
          .select("store, report_date, sales")
          .gte("report_date", `${month}-01`)
          .lte("report_date", `${month}-31`),
      ]);
      if (cancelled) return;

      const storeOf = (id) => {
        const p = (profs || []).find((x) => x.id === id);
        return p ? p.store : null;
      };

      // 労働時間：店舗 → 集計
      const acc = {};
      STORES.forEach((s) => (acc[s.name] = { ms: 0, workdays: 0 }));
      const byUserDay = {};
      (att || []).forEach((r) => {
        const day = localDateStr(r.created_at);
        if (day.slice(0, 7) !== month) return;
        const key = r.user_id + "|" + day;
        byUserDay[key] = byUserDay[key] || {
          store: storeOf(r.user_id),
          events: [],
        };
        byUserDay[key].events.push(r);
      });
      Object.values(byUserDay).forEach(({ store, events }) => {
        if (!store || !acc[store]) return;
        const { worked } = computeWork(events);
        if (worked > 0) {
          acc[store].ms += worked;
          acc[store].workdays += 1;
        }
      });

      // 日報数・売上：店舗 → 集計
      const repCount = {};
      const salesSum = {};
      STORES.forEach((s) => {
        repCount[s.name] = 0;
        salesSum[s.name] = 0;
      });
      (reps || []).forEach((r) => {
        if (repCount[r.store] != null) {
          repCount[r.store] += 1;
          salesSum[r.store] += Number(r.sales) || 0;
        }
      });

      setData(
        STORES.map((s) => ({
          name: s.name,
          color: s.color,
          ms: acc[s.name].ms,
          workdays: acc[s.name].workdays,
          reports: repCount[s.name],
          sales: salesSum[s.name],
        }))
      );
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [month]);

  return (
    <div style={{ marginTop: 8 }}>
      <div className="list-head">
        <h2>店舗別ダッシュボード</h2>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          style={{
            border: "1.5px solid var(--line)",
            borderRadius: 9,
            padding: "7px 9px",
            fontFamily: "inherit",
            fontSize: 13,
          }}
        />
      </div>

      {loading ? (
        <p style={{ padding: 16, color: "#7A6B5C" }}>読み込み中…</p>
      ) : (
        data.map((s) => (
          <div
            className="item"
            key={s.name}
            style={{ boxShadow: `inset 4px 0 0 ${s.color}` }}
          >
            <div className="item-top">
              <span className="pill" style={{ background: s.color }}>
                {s.name}
              </span>
            </div>
            <div style={{ display: "flex", gap: 18, marginTop: 4, flexWrap: "wrap" }}>
              <div>
                <b style={{ fontSize: 16 }}>
                  {s.sales ? `${s.sales.toLocaleString()}円` : "—"}
                </b>
                <div style={{ fontSize: 12, color: "var(--ink2)" }}>売上</div>
              </div>
              <div>
                <b style={{ fontSize: 16 }}>{fmtDur(s.ms)}</b>
                <div style={{ fontSize: 12, color: "var(--ink2)" }}>労働時間</div>
              </div>
              <div>
                <b style={{ fontSize: 16 }}>{s.workdays}</b>
                <div style={{ fontSize: 12, color: "var(--ink2)" }}>のべ出勤日</div>
              </div>
              <div>
                <b style={{ fontSize: 16 }}>{s.reports}</b>
                <div style={{ fontSize: 12, color: "var(--ink2)" }}>日報数</div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
