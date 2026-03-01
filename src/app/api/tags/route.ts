import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim().toLowerCase() || "";

    const supabase = createAdminClient();

    let query = supabase.from("tags").select("id, name").order("name");

    if (q) {
      query = query.ilike("name", `%${q}%`);
    }

    const { data: tags, error } = await query;

    if (error) {
      return NextResponse.json({ error: "태그 조회 실패" }, { status: 500 });
    }

    return NextResponse.json({ tags: tags || [] });
  } catch (err) {
    console.error("Tags fetch error:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
