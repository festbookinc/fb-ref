import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

async function getMyProfileId(supabase: ReturnType<typeof createAdminClient>, email: string) {
  const { data } = await supabase.from("profiles").select("id").eq("email", email).single();
  return data?.id as string | undefined;
}

/** 특정 대화의 메시지 목록 조회 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const { id: conversationId } = await params;
    const supabase = createAdminClient();
    const myId = await getMyProfileId(supabase, session.user.email);
    if (!myId) return NextResponse.json({ error: "프로필 없음" }, { status: 400 });

    // 대화 참여자 확인
    const { data: conv } = await supabase
      .from("conversations")
      .select("user_a, user_b")
      .eq("id", conversationId)
      .single();

    if (!conv || (conv.user_a !== myId && conv.user_b !== myId)) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }

    // 메시지 조회
    const { data: messages, error } = await supabase
      .from("messages")
      .select("id, sender_id, content, created_at, read_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: "메시지 조회 실패" }, { status: 500 });

    // 상대방 정보
    const partnerId = conv.user_a === myId ? conv.user_b : conv.user_a;
    const { data: partner } = await supabase
      .from("profiles")
      .select("id, name, image")
      .eq("id", partnerId)
      .single();

    // 안읽은 메시지 읽음 처리
    const unreadIds = (messages || [])
      .filter((m) => m.sender_id !== myId && !m.read_at)
      .map((m) => m.id);
    if (unreadIds.length > 0) {
      await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .in("id", unreadIds);
    }

    return NextResponse.json({
      messages: messages || [],
      partner: partner ?? { id: partnerId, name: "알 수 없음", image: null },
      myId,
    });
  } catch (err) {
    console.error("Messages [id] GET error:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

/** 메시지 전송 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const { id: conversationId } = await params;
    const { content } = await request.json();
    if (!content?.trim()) {
      return NextResponse.json({ error: "메시지 내용이 필요합니다" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const myId = await getMyProfileId(supabase, session.user.email);
    if (!myId) return NextResponse.json({ error: "프로필 없음" }, { status: 400 });

    // 참여자 확인
    const { data: conv } = await supabase
      .from("conversations")
      .select("user_a, user_b")
      .eq("id", conversationId)
      .single();

    if (!conv || (conv.user_a !== myId && conv.user_b !== myId)) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }

    const { data: message, error } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: myId, content: content.trim() })
      .select()
      .single();

    if (error || !message) {
      return NextResponse.json({ error: "메시지 전송 실패" }, { status: 500 });
    }

    return NextResponse.json({ message });
  } catch (err) {
    console.error("Messages [id] POST error:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
