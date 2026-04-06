import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://husjeebdnunmapvkbrhi.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_SB4ioa4JYatprXv8qea7eQ_tQ0BSqwb";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);