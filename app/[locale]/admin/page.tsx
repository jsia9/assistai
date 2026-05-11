import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminDashboard from "@/components/AdminDashboard";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user.role ?? "";
  if (!session || (role !== "admin" && role !== "superadmin")) redirect("/chat");
  return (
    <AdminDashboard
      isSuperAdmin={role === "superadmin"}
      sessionTenantId={session.user.tenantId}
    />
  );
}
