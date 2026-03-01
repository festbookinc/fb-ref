import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const body = await request.json();
    const ids = Array.isArray(body.ids) ? body.ids.filter((id: unknown) => typeof id === "string") : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: "삭제할 이미지를 선택해 주세요" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", session.user.email)
      .single();
    if (!profile?.id) {
      return NextResponse.json({ error: "프로필을 찾을 수 없습니다" }, { status: 403 });
    }

    const { data: images } = await supabase
      .from("images")
      .select("id")
      .in("id", ids)
      .eq("user_id", profile.id);

    const deletableIds = (images || []).map((i) => i.id);
    if (deletableIds.length === 0) {
      return NextResponse.json({ error: "삭제할 수 있는 이미지가 없습니다" }, { status: 403 });
    }

    await supabase.from("images").delete().in("id", deletableIds);

    return NextResponse.json({ success: true, deleted: deletableIds.length });
  } catch (err) {
    console.error("Bulk delete error:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
