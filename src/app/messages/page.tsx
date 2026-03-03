import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MessagesContent } from "./MessagesContent";

export default async function MessagesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <h1 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-100">메시지</h1>
      <MessagesContent />
    </div>
  );
}
