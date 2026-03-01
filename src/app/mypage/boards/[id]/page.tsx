import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BoardDetailContent } from "./BoardDetailContent";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <Link
        href="/mypage"
        className="mb-6 inline-block text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-200 dark:hover:text-zinc-100"
      >
        ← 마이페이지
      </Link>
      <BoardDetailContent boardId={id} />
    </div>
  );
}
