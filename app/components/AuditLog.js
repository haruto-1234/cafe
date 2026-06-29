"use client"; // 変更履歴（監査ログ）の表示（店長以上）

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AuditLog() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setRows(data || []);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ marginTop: 8 }}>
      <div className="list-head">
        <h2>変更履歴（監査ログ）</h2>
      </div>
      {loading ? (
        <p style={{ padding: 16, color: "#7A6B5C" }}>読み込み中…</p>
      ) : !rows.length ? (
        <div className="empty">
          <div className="em-ic">🛡️</div>
          <h3>まだ履歴はありません</h3>
        </div>
      ) : (
        rows.map((r) => (
          <div className="att-log" key={r.id}>
            <div className="staff-main">
              <div className="staff-name">
                {r.action}
                {r.detail ? (
                  <span style={{ fontWeight: 400, color: "var(--ink2)" }}>
                    {" "}
                    — {r.detail}
                  </span>
                ) : null}
              </div>
              <div className="staff-meta">
                {r.actor_name || "?"}
                {new Date(r.created_at).toLocaleString("ja-JP")}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
