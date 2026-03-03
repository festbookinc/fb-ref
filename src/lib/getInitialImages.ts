import { createAdminClient } from "@/lib/supabase/admin";

export interface ImageItem {
  id: string;
  title: string;
  description: string | null;
  link: string | null;
  image_url: string;
  created_at: string;
  author: string | null;
  authorId: string | null;
  tags: string[];
  commentCount: number;
}

/** Server Component용 첫 페이지 이미지 조회 (필터 없는 공개 최신순) */
export async function getInitialImages(limit = 24): Promise<{
  images: ImageItem[];
  hasMore: boolean;
}> {
  try {
    const supabase = createAdminClient();

    const { data: images, error, count } = await supabase
      .from("images")
      .select("id, title, description, link, image_url, created_at, user_id", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(0, limit - 1);

    if (error || !images?.length) return { images: [], hasMore: false };

    const imageIds = images.map((i) => i.id);
    const userIds = [...new Set(images.map((i) => i.user_id).filter(Boolean))] as string[];

    const [profilesResult, imageTagsResult, commentRowsResult] = await Promise.all([
      userIds.length > 0
        ? supabase.from("profiles").select("id, name, email").in("id", userIds)
        : Promise.resolve({ data: [] as { id: string; name: string | null; email: string }[] }),
      supabase.from("image_tags").select("image_id, tag_id").in("image_id", imageIds),
      supabase.from("comments").select("image_id").in("image_id", imageIds),
    ]);

    const profilesMap = (profilesResult.data || []).reduce(
      (acc, p) => { acc[p.id] = { name: p.name, email: p.email }; return acc; },
      {} as Record<string, { name: string | null; email: string }>
    );

    const tagIds = [...new Set((imageTagsResult.data || []).map((it) => it.tag_id))];
    const { data: tagRows } = tagIds.length > 0
      ? await supabase.from("tags").select("id, name").in("id", tagIds)
      : { data: [] as { id: string; name: string }[] };
    const tagIdToName = (tagRows || []).reduce(
      (acc, t) => { acc[t.id] = t.name; return acc; },
      {} as Record<string, string>
    );
    const tagsMap: Record<string, string[]> = {};
    for (const it of imageTagsResult.data || []) {
      if (!tagsMap[it.image_id]) tagsMap[it.image_id] = [];
      if (tagIdToName[it.tag_id]) tagsMap[it.image_id].push(tagIdToName[it.tag_id]);
    }

    const commentCountMap = (commentRowsResult.data || []).reduce(
      (acc, row) => { acc[row.image_id] = (acc[row.image_id] ?? 0) + 1; return acc; },
      {} as Record<string, number>
    );

    const result: ImageItem[] = images.map((img) => ({
      id: img.id,
      title: img.title,
      description: img.description ?? null,
      link: img.link ?? null,
      image_url: img.image_url,
      created_at: img.created_at,
      author: img.user_id
        ? profilesMap[img.user_id]?.name || profilesMap[img.user_id]?.email || "알 수 없음"
        : null,
      authorId: img.user_id ?? null,
      tags: tagsMap[img.id] || [],
      commentCount: commentCountMap[img.id] ?? 0,
    }));

    return { images: result, hasMore: (count ?? 0) > limit };
  } catch {
    return { images: [], hasMore: false };
  }
}
