import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ChatInterface from "@/components/ChatInterface";

export default async function ChatPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <ChatInterface
      userName={session.user.name ?? session.user.email}
      isAdmin={session.user.role === "admin"}
    />
  );
}
