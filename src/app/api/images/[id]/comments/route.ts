import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const { id: imageId } = await params;
    const body = await request.json();
    const content = body.content?.trim();

    if (!content) {
      return NextResponse.json({ error: "댓글 내용을 입력해 주세요" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: profile } = await supabase
      .from("profiles")
      .upsert(
        {
          email: session.user.email,
          name: session.user.name ?? null,
          image: session.user.image ?? null,
        },
        { onConflict: "email" }
      )
      .select("id")
      .single();

    let userId = profile?.id;
    if (!userId) {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", session.user.email)
        .single();
      userId = existing?.id;
    }
    if (!userId) {
      return NextResponse.json({ error: "프로필을 찾을 수 없습니다" }, { status: 500 });
    }

    const { data: comment, error } = await supabase
      .from("comments")
      .insert({ image_id: imageId, user_id: userId, content })
      .select()
      .single();

    if (error) return NextResponse.json({ error: "댓글 작성 실패" }, { status: 500 });

    const author = session.user.name || session.user.email || "알 수 없음";

    return NextResponse.json({
      ...comment,
      author,
    });
  } catch (err) {
    console.error("Comment create error:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
