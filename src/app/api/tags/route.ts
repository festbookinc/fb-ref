import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim().toLowerCase() || "";

    const supabase = createAdminClient();

    let tagsQuery = supabase.from("tags").select("id, name");
    if (q) {
      tagsQuery = tagsQuery.ilike("name", `*${q}*`);
    }
    const { data: tagsData, error: tagsError } = await tagsQuery;

    if (tagsError) {
      return NextResponse.json({ error: "태그 조회 실패" }, { status: 500 });
    }

    const tags = tagsData || [];
    if (tags.length === 0) {
      return NextResponse.json({ tags: [] });
    }

    const tagIds = tags.map((t) => t.id);
    const { data: imageTags } = await supabase
      .from("image_tags")
      .select("tag_id")
      .in("tag_id", tagIds);

    const countMap: Record<string, number> = {};
    for (const row of imageTags || []) {
      const tid = row.tag_id;
      countMap[tid] = (countMap[tid] || 0) + 1;
    }

    const sorted = [...tags].sort((a, b) => (countMap[b.id] || 0) - (countMap[a.id] || 0));
    return NextResponse.json({ tags: sorted });
  } catch (err) {
    console.error("Tags fetch error:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
