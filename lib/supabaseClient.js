// Supabase への接続クライアントを作る部品。
// アプリのどこからでも「import { supabase } from "@/lib/supabaseClient"」で使えます。
import { createClient } from "@supabase/supabase-js";

// .env.local に書いた接続情報を読み込む
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// クライアントを1つだけ作って、みんなで使い回す
export const supabase = createClient(url, anonKey);
