import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Exécute le middleware sur toutes les routes sauf :
     * - fichiers statiques (_next/static, _next/image)
     * - favicon et assets du dossier public
     */
    "/((?!_next/static|_next/image|favicon.ico|showcase/).*)",
  ],
};
