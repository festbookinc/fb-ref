import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

async function getProfileId(supabase: ReturnType<typeof createAdminClient>, email: string) {
  const { data } = await supabase.from("profiles").select("id").eq("email", email).single();
  return data?.id;
}

export async function GET(
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
    const profileId = await getProfileId(supabase, session.user.email);

    const { data: board, error } = await supabase
      .from("boards")
      .select("id, name, created_at, user_id")
      .eq("id", id)
      .single();

    if (error || !board) {
      return NextResponse.json({ error: "보드를 찾을 수 없습니다" }, { status: 404 });
    }

    const boardUserId = (board as { user_id?: string }).user_id;
    if (boardUserId !== profileId) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }

    const { data: boardImages } = await supabase
      .from("board_images")
      .select("image_id")
      .eq("board_id", id)
      .order("created_at", { ascending: false });

    const imageIds = (boardImages || []).map((r) => (r as { image_id: string }).image_id);

    if (imageIds.length === 0) {
      return NextResponse.json({ ...board, images: [] });
    }

    const { data: images } = await supabase
      .from("images")
      .select("id, title, description, image_url, created_at")
      .in("id", imageIds);

    const { data: imageTags } = await supabase
      .from("image_tags")
      .select("image_id, tag_id")
      .in("image_id", imageIds);
    const tagIds = [...new Set((imageTags || []).map((it) => it.tag_id))];
    const { data: tags } = tagIds.length
      ? await supabase.from("tags").select("id, name").in("id", tagIds)
      : { data: [] };
    const tagMap = (tags || []).reduce((acc, t) => {
      acc[t.id] = t.name;
      return acc;
    }, {} as Record<string, string>);
    const tagsByImage = (imageTags || []).reduce(
      (acc, it) => {
        const imgId = (it as { image_id: string }).image_id;
        if (!acc[imgId]) acc[imgId] = [];
        const tagName = tagMap[(it as { tag_id: string }).tag_id];
        if (tagName) acc[imgId].push(tagName);
        return acc;
      },
      {} as Record<string, string[]>
    );

    const imgById = new Map(
      (images || []).map((img) => [
        img.id,
        { ...img, tags: tagsByImage[img.id] || [] },
      ])
    );
    const imagesWithTags = imageIds
      .map((id) => imgById.get(id))
      .filter(Boolean);

    const { user_id: _, ...boardWithoutUserId } = board as { user_id?: string };
    return NextResponse.json({ ...boardWithoutUserId, images: imagesWithTags });
  } catch (err) {
    console.error("Board fetch error:", err);
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
    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "보드 이름을 입력해 주세요" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const profileId = await getProfileId(supabase, session.user.email);

    const { data: board } = await supabase.from("boards").select("user_id").eq("id", id).single();
    if (!board || (board as { user_id: string }).user_id !== profileId) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }

    const { error } = await supabase.from("boards").update({ name }).eq("id", id);
    if (error) return NextResponse.json({ error: "수정 실패" }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Board update error:", err);
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
    const profileId = await getProfileId(supabase, session.user.email);

    const { data: board } = await supabase.from("boards").select("user_id").eq("id", id).single();
    if (!board || (board as { user_id: string }).user_id !== profileId) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }

    await supabase.from("boards").delete().eq("id", id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Board delete error:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
