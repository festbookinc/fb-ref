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

    const { data: image, error: imgError } = await supabase
      .from("images")
      .select("id, title, description, link, image_url, created_at, user_id")
      .eq("id", id)
      .single();

    if (imgError || !image) {
      return NextResponse.json({ error: "이미지를 찾을 수 없습니다" }, { status: 404 });
    }

    // 작성자 정보
    let author = null;
    let authorEmail: string | null = null;
    if (image.user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, email")
        .eq("id", image.user_id)
        .single();
      author = profile?.name || profile?.email || "알 수 없음";
      authorEmail = profile?.email ?? null;
    }

    // 태그
    const { data: imageTags } = await supabase
      .from("image_tags")
      .select("tag_id")
      .eq("image_id", id);
    const tagIds = (imageTags || []).map((it) => it.tag_id);
    const { data: tags } = tagIds.length
      ? await supabase.from("tags").select("name").in("id", tagIds)
      : { data: [] };
    const tagNames = (tags || []).map((t) => t.name);

    // 댓글
    const { data: comments } = await supabase
      .from("comments")
      .select("id, content, created_at, user_id")
      .eq("image_id", id)
      .order("created_at", { ascending: true });

    const commentUserIds = [...new Set((comments || []).map((c) => c.user_id).filter(Boolean))];
    let commentAuthors: Record<string, string> = {};
    if (commentUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", commentUserIds);
      commentAuthors = (profiles || []).reduce(
        (acc, p) => {
          acc[p.id] = p.name || p.email || "알 수 없음";
          return acc;
        },
        {} as Record<string, string>
      );
    }

    const commentsWithAuthor = (comments || []).map((c) => ({
      ...c,
      author: c.user_id ? commentAuthors[c.user_id] : "알 수 없음",
    }));

    // 좋아요 수 및 현재 사용자 좋아요 여부
    const { count: likeCount } = await supabase
      .from("image_likes")
      .select("image_id", { count: "exact", head: true })
      .eq("image_id", id);

    let likedByMe = false;
    const session = await auth();
    if (session?.user?.email) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", session.user.email)
        .single();
      if (profile?.id) {
        const { data: like } = await supabase
          .from("image_likes")
          .select("image_id")
          .eq("image_id", id)
          .eq("user_id", profile.id)
          .single();
        likedByMe = !!like;
      }
    }

    return NextResponse.json({
      ...image,
      author,
      authorEmail,
      tags: tagNames,
      comments: commentsWithAuthor,
      isAuthor: session?.user?.email ? session.user.email === authorEmail : false,
      likeCount: likeCount ?? 0,
      likedByMe,
    });
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
      await supabase.from("image_tags").delete().eq("image_id", id);
      for (const name of tagsToUpdate) {
        const trimmed = String(name).trim().toLowerCase();
        if (!trimmed) continue;
        const { data: tag } = await supabase
          .from("tags")
          .upsert({ name: trimmed }, { onConflict: "name" })
          .select("id")
          .single();
        if (tag?.id) {
          await supabase.from("image_tags").upsert(
            { image_id: id, tag_id: tag.id },
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
