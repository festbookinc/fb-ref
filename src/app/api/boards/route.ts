import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", session.user.email)
      .single();
    if (!profile?.id) {
      return NextResponse.json({ boards: [] });
    }

    const { data: boards, error } = await supabase
      .from("boards")
      .select("id, name, created_at")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "보드 조회 실패" }, { status: 500 });
    }

    return NextResponse.json({ boards: boards || [] });
  } catch (err) {
    console.error("Boards fetch error:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const body = await request.json();
    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "보드 이름을 입력해 주세요" }, { status: 400 });
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

    const { data: board, error } = await supabase
      .from("boards")
      .insert({ name, user_id: userId })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "보드 생성 실패" }, { status: 500 });
    }

    return NextResponse.json({ board });
  } catch (err) {
    console.error("Board create error:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
