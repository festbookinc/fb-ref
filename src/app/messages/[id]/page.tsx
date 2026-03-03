import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ChatContent } from "./ChatContent";
import Link from "next/link";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-4 py-6 sm:px-6" style={{ height: "calc(100dvh - 56px)" }}>
      <div className="mb-4 flex items-center gap-3">
        <Link
          href="/messages"
          className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-200 dark:hover:text-zinc-100"
        >
          ← 메시지
        </Link>
      </div>
      <ChatContent conversationId={id} />
    </div>
  );
}
