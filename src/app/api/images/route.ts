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
    const tagNames = tagsParam
      ? tagsParam.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)
      : [];

    const supabase = createAdminClient();

    let imageIdsFilter: string[] | null = null;
    let userIdFilter: string | null = null;

    if (mine) {
      const session = await auth();
      if (!session?.user?.email) {
        return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", session.user.email)
        .single();
      if (profile?.id) userIdFilter = profile.id;
    }

    // 검색어 필터
    if (q) {
      const searchPattern = `%${q}%`;
      const idsFromTitle = await supabase
        .from("images")
        .select("id")
        .ilike("title", searchPattern);
      const idsFromDesc = await supabase
        .from("images")
        .select("id")
        .ilike("description", searchPattern);
      const { data: tags } = await supabase
        .from("tags")
        .select("id")
        .ilike("name", searchPattern);
      const tagIds = (tags || []).map((t) => t.id);
      let idsFromTags: { id: string }[] = [];
      if (tagIds.length > 0) {
        const { data: it } = await supabase
          .from("image_tags")
          .select("image_id")
          .in("tag_id", tagIds);
        idsFromTags = (it || []).map((row) => ({ id: (row as { image_id: string }).image_id }));
      }
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id")
        .or(`name.ilike.${searchPattern},email.ilike.${searchPattern}`);
      const profileIds = (profiles || []).map((p) => p.id);
      let idsFromAuthor: { id: string }[] = [];
      if (profileIds.length > 0) {
        const { data: imgs } = await supabase
          .from("images")
          .select("id")
          .in("user_id", profileIds);
        idsFromAuthor = imgs || [];
      }
      const { data: comments } = await supabase
        .from("comments")
        .select("image_id")
        .ilike("content", searchPattern);
      const idsFromComments = (comments || []).map((c) => ({ id: (c as { image_id: string }).image_id }));

      const allIds = new Set<string>([
        ...(idsFromTitle.data || []).map((r) => r.id),
        ...(idsFromDesc.data || []).map((r) => r.id),
        ...idsFromTags.map((r) => r.id),
        ...idsFromAuthor.map((r) => r.id),
        ...idsFromComments.map((r) => r.id),
      ]);
      imageIdsFilter = [...allIds];
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

    // 작성자 정보 조회 (user_id로 profiles 조인)
    const userIds = [...new Set((result as { user_id?: string }[]).map((i) => i.user_id).filter(Boolean))];
    let profilesMap: Record<string, { name: string | null; email: string }> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", userIds);
      profilesMap = (profiles || []).reduce(
        (acc, p) => {
          acc[p.id] = { name: p.name, email: p.email };
          return acc;
        },
        {} as Record<string, { name: string | null; email: string }>
      );
    }

    // 태그 조회
    const imageIds = result.map((i) => i.id);
    let tagsMap: Record<string, string[]> = {};
    if (imageIds.length > 0) {
      const { data: imageTags } = await supabase
        .from("image_tags")
        .select("image_id, tag_id")
        .in("image_id", imageIds);
      const tagIds = [...new Set((imageTags || []).map((it) => it.tag_id))];
      const { data: tags } = await supabase.from("tags").select("id, name").in("id", tagIds);
      const tagIdToName = (tags || []).reduce((acc, t) => {
        acc[t.id] = t.name;
        return acc;
      }, {} as Record<string, string>);
      for (const it of imageTags || []) {
        if (!tagsMap[it.image_id]) tagsMap[it.image_id] = [];
        if (tagIdToName[it.tag_id]) tagsMap[it.image_id].push(tagIdToName[it.tag_id]);
      }
    }

    const imagesWithMeta = result.map((img) => ({
      ...img,
      author: img.user_id ? profilesMap[img.user_id]?.name || profilesMap[img.user_id]?.email || "알 수 없음" : null,
      tags: tagsMap[img.id] || [],
    }));

    return NextResponse.json({
      images: imagesWithMeta,
      total: count ?? 0,
      hasMore: (count ?? 0) > offset + limit,
    });
  } catch (err) {
    console.error("Images fetch error:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
