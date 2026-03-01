import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

async function getProfileId(supabase: ReturnType<typeof createAdminClient>, email: string) {
  const { data } = await supabase.from("profiles").select("id").eq("email", email).single();
  return data?.id;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const { id: boardId } = await params;
    const body = await request.json();
    const imageId = body.imageId;

    if (!imageId) {
      return NextResponse.json({ error: "이미지 ID가 필요합니다" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const profileId = await getProfileId(supabase, session.user.email);

    const { data: board } = await supabase
      .from("boards")
      .select("user_id")
      .eq("id", boardId)
      .single();

    if (!board || (board as { user_id: string }).user_id !== profileId) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }

    const { error } = await supabase
      .from("board_images")
      .upsert({ board_id: boardId, image_id: imageId }, { onConflict: "board_id,image_id" });

    if (error) {
      return NextResponse.json({ error: "추가 실패" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Board image add error:", err);
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

    const { id: boardId } = await params;
    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get("imageId");

    if (!imageId) {
      return NextResponse.json({ error: "이미지 ID가 필요합니다" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const profileId = await getProfileId(supabase, session.user.email);

    const { data: board } = await supabase
      .from("boards")
      .select("user_id")
      .eq("id", boardId)
      .single();

    if (!board || (board as { user_id: string }).user_id !== profileId) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }

    await supabase
      .from("board_images")
      .delete()
      .eq("board_id", boardId)
      .eq("image_id", imageId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Board image remove error:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
