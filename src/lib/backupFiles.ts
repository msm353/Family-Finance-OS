import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
export async function downloadJson(data: unknown) {
  const text = JSON.stringify(data, null, 2);
  if (new Blob([text]).size > 10 * 1024 * 1024)
    throw new Error("حجم پشتیبان از سقف ۱۰ مگابایت بیشتر است.");
  const name = `ffos-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  if (Capacitor.isNativePlatform()) {
    const file = await Filesystem.writeFile({
      path: name,
      data: text,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    try {
      await Share.share({
        title: "پشتیبان FFOS",
        url: file.uri,
        dialogTitle: "ذخیره فایل پشتیبان",
      });
    } catch (error) {
      if (error instanceof Error && error.message === "Share canceled")
        return "اشتراک لغو شد؛ داده‌های برنامه حفظ شدند.";
      throw error;
    }
    return "پشتیبان آماده شد؛ ذخیره‌شدن فایل را در مقصد بررسی کنید.";
  }
  const url = URL.createObjectURL(
    new Blob([text], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return "فایل پشتیبان آمادهٔ دانلود شد.";
}
