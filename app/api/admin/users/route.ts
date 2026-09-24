import { requireAdmin } from "@/lib/auth/requireAdmin";
import { listAdminUsers } from "@/lib/admin/users";
import { ok, failFrom } from "@/lib/admin/http";

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;

  try {
    return ok(await listAdminUsers());
  } catch (error) {
    return failFrom(error, "liste des utilisateurs");
  }
}
