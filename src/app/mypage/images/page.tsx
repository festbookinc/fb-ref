import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MyImagesGrid } from "./MyImagesGrid";

export default async function MyImagesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="w-full px-4 py-6 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/mypage"
          className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-200 dark:hover:text-zinc-100"
        >
          ← 마이페이지
        </Link>
      </div>
      <h1 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        내가 업로드한 이미지
      </h1>
      <MyImagesGrid />
    </div>
  );
}
