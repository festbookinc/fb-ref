import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

async function getMyProfileId(supabase: ReturnType<typeof createAdminClient>, email: string) {
  const { data } = await supabase.from("profiles").select("id").eq("email", email).single();
  return data?.id as string | undefined;
}

/** 내 대화 목록 조회 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const myId = await getMyProfileId(supabase, session.user.email);
    if (!myId) return NextResponse.json({ conversations: [] });

    const { data: convs, error } = await supabase
      .from("conversations")
      .select("id, user_a, user_b, last_message_at")
      .or(`user_a.eq.${myId},user_b.eq.${myId}`)
      .order("last_message_at", { ascending: false });

    if (error) return NextResponse.json({ error: "조회 실패" }, { status: 500 });
    if (!convs?.length) return NextResponse.json({ conversations: [] });

    const convIds = convs.map((c) => c.id);
    const partnerIds = [...new Set(convs.map((c) => (c.user_a === myId ? c.user_b : c.user_a)))];

    // 파트너 프로필 + 대화 통계(최신 메시지·unread) 병렬 조회
    const [profilesResult, statsResult] = await Promise.all([
      supabase.from("profiles").select("id, name, image").in("id", partnerIds),
      // RPC: 007_rpc_conversation_stats.sql 실행 필요
      supabase.rpc("get_conversation_stats", { p_conv_ids: convIds, p_my_id: myId }),
    ]);

    const profileMap = (profilesResult.data || []).reduce(
      (acc, p) => { acc[p.id] = p; return acc; },
      {} as Record<string, { id: string; name: string | null; image: string | null }>
    );

    // RPC 실패 시 폴백 (무제한 로드 → 전체 메시지 JS 집계)
    let lastMsgMap: Record<string, { content: string; created_at: string }> = {};
    let unreadMap: Record<string, number> = {};

    if (statsResult.error) {
      const { data: recentMsgs } = await supabase
        .from("messages")
        .select("conversation_id, content, created_at, sender_id, read_at")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: false })
        .limit(convIds.length * 20); // 대화당 최대 20개로 제한
      for (const msg of recentMsgs || []) {
        if (!lastMsgMap[msg.conversation_id]) {
          lastMsgMap[msg.conversation_id] = { content: msg.content, created_at: msg.created_at };
        }
        if (msg.sender_id !== myId && !msg.read_at) {
          unreadMap[msg.conversation_id] = (unreadMap[msg.conversation_id] ?? 0) + 1;
        }
      }
    } else {
      type StatRow = { conversation_id: string; last_content: string; last_created_at: string; unread_count: number };
      for (const row of (statsResult.data as StatRow[]) || []) {
        lastMsgMap[row.conversation_id] = {
          content: row.last_content,
          created_at: row.last_created_at,
        };
        unreadMap[row.conversation_id] = Number(row.unread_count ?? 0);
      }
    }

    const conversations = convs.map((c) => {
      const partnerId = c.user_a === myId ? c.user_b : c.user_a;
      const partner = profileMap[partnerId];
      return {
        id: c.id,
        partner: {
          id: partnerId,
          name: partner?.name || "알 수 없음",
          image: partner?.image || null,
        },
        lastMessage: lastMsgMap[c.id] ?? null,
        unreadCount: unreadMap[c.id] ?? 0,
        last_message_at: c.last_message_at,
      };
    });

    return NextResponse.json({ conversations });
  } catch (err) {
    console.error("Messages GET error:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

/** 대화 시작 or 기존 대화 가져오기 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const { targetUserId } = await request.json();
    if (!targetUserId) {
      return NextResponse.json({ error: "대상 사용자 ID가 필요합니다" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const myId = await getMyProfileId(supabase, session.user.email);
    if (!myId) return NextResponse.json({ error: "프로필 없음" }, { status: 400 });
    if (myId === targetUserId) {
      return NextResponse.json({ error: "자기 자신에게는 메시지를 보낼 수 없습니다" }, { status: 400 });
    }

    // user_a < user_b 순서로 정규화하여 중복 방지
    const [userA, userB] = [myId, targetUserId].sort();

    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("user_a", userA)
      .eq("user_b", userB)
      .single();

    if (existing?.id) {
      return NextResponse.json({ conversationId: existing.id });
    }

    const { data: created, error } = await supabase
      .from("conversations")
      .insert({ user_a: userA, user_b: userB })
      .select("id")
      .single();

    if (error || !created) {
      return NextResponse.json({ error: "대화 생성 실패" }, { status: 500 });
    }

    return NextResponse.json({ conversationId: created.id });
  } catch (err) {
    console.error("Messages POST error:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
