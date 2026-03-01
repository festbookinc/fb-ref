import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const { id: imageId } = await params;
    const supabase = createAdminClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", session.user.email)
      .single();
    if (!profile?.id) return NextResponse.json({ boardIds: [] });

    const { data: boardImages } = await supabase
      .from("board_images")
      .select("board_id")
      .eq("image_id", imageId);

    const boardIds = (boardImages || []).map((r) => (r as { board_id: string }).board_id);
    if (boardIds.length === 0) return NextResponse.json({ boardIds: [] });

    const { data: boards } = await supabase
      .from("boards")
      .select("id")
      .in("id", boardIds)
      .eq("user_id", profile.id);

    const myBoardIds = (boards || []).map((b) => b.id);
    return NextResponse.json({ boardIds: myBoardIds });
  } catch (err) {
    console.error("Image boards fetch error:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
