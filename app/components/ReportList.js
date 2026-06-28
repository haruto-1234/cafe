"use client";

import { storeColor } from "@/lib/constants";
import { fmtDate, fmtTime } from "@/lib/format";
import { supabase } from "@/lib/supabaseClient";

// 写真の保存パス → 表示用のURL に変換
function photoUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path; // すでにURLならそのまま
  return supabase.storage.from("report-photos").getPublicUrl(path).data
    .publicUrl;
}

// もらった日報リスト(reports)を並べて表示するだけの部品
export default function ReportList({ reports }) {
  if (!reports.length) {
    return (
      <div className="empty">
        <div className="em-ic">📋</div>
        <h3>まだ日報がありません</h3>
        <p>上のフォームから最初の1件を投稿してみましょう。</p>
      </div>
    );
  }

  return (
    <div>
      {reports.map((r) => {
        const c = storeColor(r.store);
        return (
          <article
            key={r.id}
            className="item"
            style={{ boxShadow: `inset 4px 0 0 ${c}` }}
          >
            <div className="item-top">
              <span className="pill" style={{ background: c }}>
                {r.store}
              </span>
              <span className="author">{r.author}</span>
              <span className="when">
                {fmtDate(r.report_date)} {fmtTime(r.created_at)}
              </span>
            </div>

            <p className="body">{r.body}</p>

            {r.photos && r.photos.length > 0 && (
              <div className="photos">
                {r.photos.map((p, i) => {
                  const u = photoUrl(p);
                  return (
                    <a key={i} href={u} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={u} alt="写真" loading="lazy" />
                    </a>
                  );
                })}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
