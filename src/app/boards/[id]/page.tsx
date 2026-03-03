import { BoardPublicContent } from "./BoardPublicContent";

export default async function PublicBoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <BoardPublicContent boardId={id} />
    </div>
  );
}
