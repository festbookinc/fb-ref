import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const formData = await request.formData();
    const title = formData.get("title") as string;
    const description = (formData.get("description") as string) || null;
    const link = (formData.get("link") as string) || null;
    const tagsInput = (formData.get("tags") as string) || "";
    const imageFile = formData.get("image") as File | null;
    const imageUrl = formData.get("imageUrl") as string | null;

    if (!title?.trim()) {
      return NextResponse.json({ error: "제목은 필수입니다" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 프로필 upsert (NextAuth 사용자 → profiles)
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
      return NextResponse.json({ error: "프로필 생성 실패" }, { status: 500 });
    }

    let finalImageUrl: string;

    if (imageFile && imageFile.size > 0) {
      // 파일 업로드 → WebP 변환
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      const webpBuffer = await sharp(buffer)
        .webp({ quality: 85 })
        .toBuffer();

      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(fileName, webpBuffer, {
          contentType: "image/webp",
          upsert: false,
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        return NextResponse.json({ error: "이미지 업로드 실패" }, { status: 500 });
      }

      const { data: urlData } = supabase.storage.from("images").getPublicUrl(fileName);
      finalImageUrl = urlData.publicUrl;
    } else if (imageUrl?.trim()) {
      // URL에서 이미지 가져와서 WebP 변환 후 업로드
      const res = await fetch(imageUrl.trim());
      if (!res.ok) {
        return NextResponse.json({ error: "이미지 URL을 불러올 수 없습니다" }, { status: 400 });
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      const webpBuffer = await sharp(buffer)
        .webp({ quality: 85 })
        .toBuffer();

      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(fileName, webpBuffer, {
          contentType: "image/webp",
          upsert: false,
        });

      if (uploadError) {
        return NextResponse.json({ error: "이미지 업로드 실패" }, { status: 500 });
      }

      const { data: urlData } = supabase.storage.from("images").getPublicUrl(fileName);
      finalImageUrl = urlData.publicUrl;
    } else {
      return NextResponse.json({ error: "이미지 파일 또는 URL이 필요합니다" }, { status: 400 });
    }

    // 이미지 레코드 삽입
    const { data: image, error: imageError } = await supabase
      .from("images")
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        link: link?.trim() || null,
        image_url: finalImageUrl,
        user_id: userId,
      })
      .select()
      .single();

    if (imageError) {
      return NextResponse.json({ error: "이미지 저장 실패" }, { status: 500 });
    }

    // 태그 처리
    const tagNames = tagsInput
      .split(/[,，\s]+/)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    if (tagNames.length > 0) {
      for (const name of tagNames) {
        const { data: tag } = await supabase
          .from("tags")
          .upsert({ name }, { onConflict: "name" })
          .select("id")
          .single();

        if (tag?.id) {
          await supabase.from("image_tags").upsert(
            { image_id: image.id, tag_id: tag.id },
            { onConflict: "image_id,tag_id" }
          );
        }
      }
    }

    return NextResponse.json({ success: true, image });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
