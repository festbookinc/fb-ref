import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MyPageContent } from "./MyPageContent";

export default async function MyPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        마이페이지
      </h1>

      <div className="mb-8 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-4">
          {session.user.image && (
            <img
              src={session.user.image}
              alt=""
              className="h-16 w-16 rounded-full"
            />
          )}
          <div>
            <p className="font-medium text-zinc-900 dark:text-zinc-100">
              {session.user.name}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {session.user.email}
            </p>
          </div>
        </div>
      </div>

      <MyPageContent />
    </div>
  );
}
