import imageCompression from "browser-image-compression";

/** Vercel 서버리스 4.5MB 제한을 피하기 위해 업로드 전 압축 */
const MAX_SIZE_MB = 4;
const MAX_DIMENSION = 2048;

export async function compressImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: MAX_SIZE_MB,
      maxWidthOrHeight: MAX_DIMENSION,
      initialQuality: 0.85,
      useWebWorker: true,
    });
    return compressed;
  } catch (err) {
    console.warn("이미지 압축 실패, 원본 사용:", err);
    return file;
  }
}
