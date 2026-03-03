import Link from "next/link";
import { ProfilePageContent } from "./ProfilePageContent";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link
        href="/"
        className="mb-6 inline-block text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-200 dark:hover:text-zinc-100"
      >
        ← 아카이브
      </Link>
      <ProfilePageContent userId={userId} />
    </div>
  );
}
