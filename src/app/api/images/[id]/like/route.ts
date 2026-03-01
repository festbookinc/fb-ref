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
    const supabase = createAdminClient();

    const { data: image } = await supabase
      .from("images")
      .select("id")
      .eq("id", imageId)
      .single();
    if (!image) {
      return NextResponse.json({ error: "이미지를 찾을 수 없습니다" }, { status: 404 });
    }

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

    const { data: existingLike } = await supabase
      .from("image_likes")
      .select("image_id")
      .eq("image_id", imageId)
      .eq("user_id", userId)
      .single();

    if (existingLike) {
      await supabase
        .from("image_likes")
        .delete()
        .eq("image_id", imageId)
        .eq("user_id", userId);
    } else {
      await supabase.from("image_likes").insert({
        image_id: imageId,
        user_id: userId,
      });
    }

    const { count } = await supabase
      .from("image_likes")
      .select("image_id", { count: "exact", head: true })
      .eq("image_id", imageId);

    return NextResponse.json({
      liked: !existingLike,
      likeCount: count ?? 0,
    });
  } catch (err) {
    console.error("Like toggle error:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
