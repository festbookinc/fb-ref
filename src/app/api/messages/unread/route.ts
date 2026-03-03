import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

/** 읽지 않은 메시지 총 개수 반환 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ unread: 0 });
    }

    const supabase = createAdminClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", session.user.email)
      .single();

    const myId = profile?.id;
    if (!myId) return NextResponse.json({ unread: 0 });

    // 내가 참여한 대화 ID 목록
    const { data: convs } = await supabase
      .from("conversations")
      .select("id")
      .or(`user_a.eq.${myId},user_b.eq.${myId}`);

    const convIds = (convs || []).map((c) => c.id);
    if (convIds.length === 0) return NextResponse.json({ unread: 0 });

    // 내가 받은 메시지 중 읽지 않은 것 카운트
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", convIds)
      .neq("sender_id", myId)
      .is("read_at", null);

    return NextResponse.json({ unread: count ?? 0 });
  } catch (err) {
    console.error("Unread count error:", err);
    return NextResponse.json({ unread: 0 });
  }
}
