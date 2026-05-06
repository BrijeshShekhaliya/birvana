import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getPublicSupabaseEnv, hasSupabaseEnv, requireServerEnv } from "@/lib/env";

export async function getServerSupabase() {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const cookieStore = await cookies();
  const { url, anonKey } = getPublicSupabaseEnv();

  return createServerClient(url!, anonKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server components cannot always mutate cookies.
        }
      },
    },
  });
}

export async function getAdminSupabase() {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const { createClient } = await import("@supabase/supabase-js");
  const { url } = getPublicSupabaseEnv();
  const serviceRoleKey = requireServerEnv("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url!, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
