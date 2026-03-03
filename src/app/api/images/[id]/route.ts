import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    // [1단계] 이미지 조회 + 세션 병렬
    const [{ data: image, error: imgError }, session] = await Promise.all([
      supabase
        .from("images")
        .select("id, title, description, link, image_url, created_at, user_id")
        .eq("id", id)
        .single(),
      auth(),
    ]);

    if (imgError || !image) {
      return NextResponse.json({ error: "이미지를 찾을 수 없습니다" }, { status: 404 });
    }

    // [2단계] 작성자·태그·댓글·좋아요수·현재유저 프로필 병렬
    const [authorResult, imageTagsResult, commentsResult, likeCountResult, currentUserResult] =
      await Promise.all([
        image.user_id
          ? supabase.from("profiles").select("name, email").eq("id", image.user_id).single()
          : Promise.resolve({ data: null }),
        supabase.from("image_tags").select("tag_id").eq("image_id", id),
        supabase
          .from("comments")
          .select("id, content, created_at, user_id")
          .eq("image_id", id)
          .order("created_at", { ascending: true }),
        supabase
          .from("image_likes")
          .select("image_id", { count: "exact", head: true })
          .eq("image_id", id),
        session?.user?.email
          ? supabase.from("profiles").select("id").eq("email", session.user.email).single()
          : Promise.resolve({ data: null }),
      ]);

    const authorProfile = authorResult.data;
    const author = authorProfile
      ? authorProfile.name || authorProfile.email || "알 수 없음"
      : null;
    const authorEmail = authorProfile?.email ?? null;

    const tagIds = (imageTagsResult.data || []).map((it) => it.tag_id);
    const comments = commentsResult.data || [];
    const commentUserIds = [...new Set(comments.map((c) => c.user_id).filter(Boolean))];
    const currentProfile = currentUserResult.data;

    // [3단계] 태그명·댓글 작성자·좋아요 여부 병렬
    const [tagsResult, commentProfilesResult, likedByMeResult] = await Promise.all([
      tagIds.length
        ? supabase.from("tags").select("name").in("id", tagIds)
        : Promise.resolve({ data: [] as { name: string }[] }),
      commentUserIds.length > 0
        ? supabase.from("profiles").select("id, name, email").in("id", commentUserIds)
        : Promise.resolve({ data: [] as { id: string; name: string | null; email: string | null }[] }),
      currentProfile?.id
        ? supabase
            .from("image_likes")
            .select("image_id")
            .eq("image_id", id)
            .eq("user_id", currentProfile.id)
            .single()
        : Promise.resolve({ data: null }),
    ]);

    const tagNames = (tagsResult.data || []).map((t) => t.name);
    const commentAuthors = (commentProfilesResult.data || []).reduce(
      (acc, p) => {
        acc[p.id] = p.name || p.email || "알 수 없음";
        return acc;
      },
      {} as Record<string, string>
    );
    const commentsWithAuthor = comments.map((c) => ({
      ...c,
      author: c.user_id ? commentAuthors[c.user_id] : "알 수 없음",
    }));

    return NextResponse.json(
      {
        ...image,
        author,
        authorEmail,
        authorId: image.user_id ?? null,
        tags: tagNames,
        comments: commentsWithAuthor,
        isAuthor: session?.user?.email ? session.user.email === authorEmail : false,
        likeCount: likeCountResult.count ?? 0,
        likedByMe: !!likedByMeResult.data,
      },
      // isAuthor / likedByMe가 포함되므로 개인화 응답 — 브라우저는 30초 재사용, CDN 캐시 없음
      { headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=30" } }
    );
  } catch (err) {
    console.error("Image fetch error:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const supabase = createAdminClient();

    const { data: image } = await supabase.from("images").select("user_id").eq("id", id).single();
    if (!image) return NextResponse.json({ error: "이미지를 찾을 수 없습니다" }, { status: 404 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", session.user.email)
      .single();
    if (!profile || image.user_id !== profile.id) {
      return NextResponse.json({ error: "수정 권한이 없습니다" }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.link !== undefined) updateData.link = body.link;

    const tagsToUpdate = body.tags;
    const { error } = await supabase.from("images").update(updateData).eq("id", id);

    if (error) return NextResponse.json({ error: "수정 실패" }, { status: 500 });

    if (Array.isArray(tagsToUpdate)) {
      const trimmedNames = (tagsToUpdate as unknown[])
        .map((n) => String(n).trim().toLowerCase())
        .filter(Boolean);

      // 기존 태그 연결 삭제
      await supabase.from("image_tags").delete().eq("image_id", id);

      if (trimmedNames.length > 0) {
        // 태그 배치 upsert (N+1 제거)
        const { data: upsertedTags } = await supabase
          .from("tags")
          .upsert(trimmedNames.map((name) => ({ name })), { onConflict: "name" })
          .select("id");

        const { data: existingTags } = await supabase
          .from("tags")
          .select("id")
          .in("name", trimmedNames);

        const tagIds = [...new Set([
          ...(upsertedTags || []).map((t) => t.id),
          ...(existingTags || []).map((t) => t.id),
        ])].filter(Boolean);

        if (tagIds.length > 0) {
          await supabase
            .from("image_tags")
            .upsert(
              tagIds.map((tag_id) => ({ image_id: id, tag_id })),
              { onConflict: "image_id,tag_id" }
            );
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Image update error:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createAdminClient();

    const { data: image } = await supabase.from("images").select("user_id, image_url").eq("id", id).single();
    if (!image) return NextResponse.json({ error: "이미지를 찾을 수 없습니다" }, { status: 404 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", session.user.email)
      .single();
    if (!profile || image.user_id !== profile.id) {
      return NextResponse.json({ error: "삭제 권한이 없습니다" }, { status: 403 });
    }

    await supabase.from("images").delete().eq("id", id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Image delete error:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
