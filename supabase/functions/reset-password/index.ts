// 店長・管理者が、スタッフのパスワードを初期化するための安全な関数。
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";

    const { targetId, newPassword } = await req.json();
    if (!targetId || !newPassword || String(newPassword).length < 6) {
      return json({ error: "入力が不正です（パスワードは6文字以上）" }, 400);
    }

    const caller = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await caller.auth.getUser();
    if (!user) return json({ error: "ログインが必要です" }, 401);

    const admin = createClient(url, serviceKey);
    const { data: prof } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!prof || !["admin", "manager"].includes(prof.role)) {
      return json({ error: "権限がありません" }, 403);
    }

    const { error } = await admin.auth.admin.updateUserById(targetId, {
      password: String(newPassword),
    });
    if (error) return json({ error: error.message }, 400);

    return json({ ok: true }, 200);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
