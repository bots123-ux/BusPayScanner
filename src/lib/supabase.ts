import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ipttskmwgormpiglhjmf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_4M1eP-LOz9KXx5UFjSL05A_-U2U2dy8";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});
