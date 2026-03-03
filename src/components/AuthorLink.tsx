"use client";

import Link from "next/link";

interface AuthorLinkProps {
  author: string;
  authorId?: string | null;
  className?: string;
}

export function AuthorLink({ author, authorId, className }: AuthorLinkProps) {
  if (authorId) {
    return (
      <Link
        href={`/profile/${authorId}`}
        className={`text-xs text-zinc-600 transition-colors hover:text-zinc-900 hover:underline dark:text-zinc-200 dark:hover:text-zinc-100 ${className ?? ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        by {author}
      </Link>
    );
  }
  return (
    <span className={`text-xs text-zinc-600 dark:text-zinc-200 ${className ?? ""}`}>
      by {author}
    </span>
  );
}
