import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

/** 읽지 않은 메시지 총 개수 반환 — 단일 RPC 호출 (006_rpc_unread_count.sql 실행 필요) */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ unread: 0 });
    }

    const supabase = createAdminClient();

    // profiles → conversations → messages 3단계 순차 쿼리를 RPC 1회로 대체
    const { data, error } = await supabase.rpc("get_unread_count", {
      p_email: session.user.email,
    });

    if (error) {
      // RPC가 아직 배포되지 않은 환경을 위한 폴백 (3단계 순차 쿼리)
      const { data: profile } = await supabase
        .from("profiles").select("id").eq("email", session.user.email).single();
      const myId = profile?.id;
      if (!myId) return NextResponse.json({ unread: 0 });
      const { data: convs } = await supabase
        .from("conversations").select("id").or(`user_a.eq.${myId},user_b.eq.${myId}`);
      const convIds = (convs || []).map((c) => c.id);
      if (convIds.length === 0) return NextResponse.json({ unread: 0 });
      const { count } = await supabase
        .from("messages").select("id", { count: "exact", head: true })
        .in("conversation_id", convIds).neq("sender_id", myId).is("read_at", null);
      return NextResponse.json(
        { unread: count ?? 0 },
        { headers: { "Cache-Control": "private, max-age=25, stale-while-revalidate=5" } }
      );
    }

    // 폴링 주기(30s)보다 짧게 캐시
    return NextResponse.json(
      { unread: (data as number) ?? 0 },
      { headers: { "Cache-Control": "private, max-age=25, stale-while-revalidate=5" } }
    );
  } catch (err) {
    console.error("Unread count error:", err);
    return NextResponse.json({ unread: 0 });
  }
}
