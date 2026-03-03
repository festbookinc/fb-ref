import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(12, parseInt(searchParams.get("limit") || "24")));
    const offset = (page - 1) * limit;
    const sort = searchParams.get("sort") || "latest";
    const q = searchParams.get("q")?.trim() || "";
    const tagsParam = searchParams.get("tags") || "";
    const mine = searchParams.get("mine") === "1";
    const likes = searchParams.get("likes") === "1";
    const tagNames = tagsParam
      ? tagsParam.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)
      : [];

    const supabase = createAdminClient();

    let imageIdsFilter: string[] | null = null;
    let userIdFilter: string | null = null;
    const userParam = searchParams.get("user")?.trim();

    if (userParam) {
      userIdFilter = userParam;
    } else if (mine || likes) {
      const session = await auth();
      if (!session?.user?.email) {
        return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", session.user.email)
        .single();
      if (profile?.id) {
        if (mine) {
          userIdFilter = profile.id;
        } else if (likes) {
          const { data: likedRows } = await supabase
            .from("image_likes")
            .select("image_id")
            .eq("user_id", profile.id);
          imageIdsFilter = (likedRows || []).map((r) => r.image_id).filter(Boolean);
        }
      } else if (likes) {
        imageIdsFilter = [];
      }
    }

    // 검색어 필터 (RPC 사용 - 한글 검색 안정화. 마이그레이션 003_search_images.sql 실행 필요)
    if (q) {
      const normalizedQuery = q.normalize("NFC");
      const { data: searchResult, error: searchError } = await supabase.rpc("search_images", {
        search_query: normalizedQuery,
      });
      if (searchError) {
        console.error("Search RPC error:", searchError);
        return NextResponse.json({
          error: "검색 실패. Supabase SQL Editor에서 supabase/migrations/003_search_images.sql 내용을 실행해 주세요.",
        }, { status: 500 });
      }
      const ids = (searchResult || []).map((r: { image_id: string }) => r.image_id).filter(Boolean) as string[];
      imageIdsFilter = [...new Set(ids)];
    }

    // 태그 필터 (선택한 태그 중 하나라도 가진 이미지)
    if (tagNames.length > 0) {
      const { data: tags } = await supabase
        .from("tags")
        .select("id")
        .in("name", tagNames);
      const tagIds = (tags || []).map((t) => t.id);
      if (tagIds.length > 0) {
        const { data: imageTags } = await supabase
          .from("image_tags")
          .select("image_id")
          .in("tag_id", tagIds);
        const matchingIds = [...new Set((imageTags || []).map((row) => (row as { image_id: string }).image_id))];
        imageIdsFilter =
          imageIdsFilter === null
            ? matchingIds
            : imageIdsFilter.filter((id) => matchingIds.includes(id));
      }
    }

    let query = supabase
      .from("images")
      .select("id, title, description, link, image_url, created_at, user_id", {
        count: "exact",
      });

    if (userIdFilter) {
      query = query.eq("user_id", userIdFilter);
    }

    if (imageIdsFilter !== null) {
      if (imageIdsFilter.length === 0) {
        return NextResponse.json({ images: [], total: 0, hasMore: false });
      }
      query = query.in("id", imageIdsFilter);
    }

    if (sort === "random") {
      query = query.order("id");
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const { data: images, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: "이미지 조회 실패" }, { status: 500 });
    }

    let result = (images || []) as { id: string; user_id?: string }[];
    if (sort === "random") {
      result = [...result].sort(() => Math.random() - 0.5);
    }

    // ── 작성자·태그·댓글수 병렬 조회 ──────────────────────────────
    const imageIds = result.map((i) => i.id);
    const userIds = [...new Set((result as { user_id?: string }[]).map((i) => i.user_id).filter(Boolean))] as string[];

    const [profilesResult, imageTagsResult, commentRowsResult] = await Promise.all([
      // 작성자 profiles
      userIds.length > 0
        ? supabase.from("profiles").select("id, name, email").in("id", userIds)
        : Promise.resolve({ data: [] as { id: string; name: string | null; email: string }[] }),
      // 이미지-태그 연결
      imageIds.length > 0
        ? supabase.from("image_tags").select("image_id, tag_id").in("image_id", imageIds)
        : Promise.resolve({ data: [] as { image_id: string; tag_id: string }[] }),
      // 댓글 수 (image_id 컬럼만 가져와 JS에서 집계)
      imageIds.length > 0
        ? supabase.from("comments").select("image_id").in("image_id", imageIds)
        : Promise.resolve({ data: [] as { image_id: string }[] }),
    ]);

    const profilesMap = (profilesResult.data || []).reduce(
      (acc, p) => { acc[p.id] = { name: p.name, email: p.email }; return acc; },
      {} as Record<string, { name: string | null; email: string }>
    );

    // 태그 이름 resolve (image_tags → tags 추가 조회는 한 번만)
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

    const imagesWithMeta = result.map((img) => ({
      ...img,
      author: img.user_id ? profilesMap[img.user_id]?.name || profilesMap[img.user_id]?.email || "알 수 없음" : null,
      authorId: img.user_id ?? null,
      tags: tagsMap[img.id] || [],
      commentCount: commentCountMap[img.id] ?? 0,
    }));

    // 사용자별 필터(mine, likes, user) 없는 공개 목록은 CDN에서 30초 캐시
    const isPersonalized = mine || likes || !!searchParams.get("user");
    const cacheHeader = isPersonalized
      ? "private, no-store"
      : "public, s-maxage=30, stale-while-revalidate=60";

    return NextResponse.json(
      { images: imagesWithMeta, total: count ?? 0, hasMore: (count ?? 0) > offset + limit },
      { headers: { "Cache-Control": cacheHeader } }
    );
  } catch (err) {
    console.error("Images fetch error:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
