import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import BillingView from "./BillingView";

export default async function BillingPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  return <BillingView />;
}
