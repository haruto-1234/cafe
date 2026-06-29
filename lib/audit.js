import { supabase } from "./supabaseClient";

// 重要な操作（打刻修正・役割変更など）の履歴を記録する。
// 失敗しても操作自体は止めない（best-effort）。
export async function logAudit(profile, action, detail) {
  try {
    await supabase.from("audit_log").insert({
      actor_id: profile?.id || null,
      actor_name: profile?.full_name || null,
      action,
      detail: detail || null,
    });
  } catch (e) {
    // 監査ログの失敗で本処理は止めない
  }
}
