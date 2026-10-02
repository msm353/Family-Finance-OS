# امضای پایدار APK

نسخهٔ `0.1.2-beta` با امضای آزمایشی ساخته شده است. گردش انتشار بعدی فقط APK امضاشده با کلید ثابت را منتشر می‌کند و اگر اطلاعات امضا آماده نباشد، ساخت و انتشار متوقف می‌شود. تغییر کلید امضا ممکن است نصب نسخهٔ جدید روی نسخهٔ فعلی را ناممکن کند؛ پیش از حذف برنامهٔ قبلی، از داخل آن فایل پشتیبان JSON بگیرید و وجود فایل را بررسی کنید.

## آماده‌سازی یک‌باره توسط مالک پروژه

1. یک keystore اختصاصی برای FFOS و یک alias بسازید. رمزهای قوی و جداگانه انتخاب کنید. keystore و رمزها را خارج از مخزن Git، در محلی امن و دارای نسخهٔ پشتیبان نگه دارید. از دست‌رفتن این کلید می‌تواند به‌روزرسانی نسخه‌های نصب‌شده با همان امضا را ناممکن کند.
2. در بخش GitHub Actions secrets همین مخزن، این چهار مقدار را ثبت کنید:
   - `FFOS_KEYSTORE_BASE64`: محتوای فایل keystore به صورت Base64، بدون خط جدید
   - `FFOS_KEYSTORE_PASSWORD`: رمز keystore
   - `FFOS_KEY_ALIAS`: نام alias کلید
   - `FFOS_KEY_PASSWORD`: رمز کلید
3. پیش از انتشار، نسخهٔ برنامه در `package.json` و `android/app/build.gradle`، `versionCode` اندروید و فایل یادداشت انتشار را برای نسخهٔ جدید هماهنگ کنید. workflow فعلی فایل `docs/RELEASE-0.1.2-beta.md` را می‌خواند و باید برای نسخهٔ بعدی به‌روز شود.
4. ابتدا خروجی را روی نصب تازه آزمایش کنید. برای انتقال داده از APK آزمایشی فعلی، در نسخهٔ قدیمی پشتیبان بگیرید، فایل را خارج از برنامه نگه دارید، نسخهٔ قدیمی را حذف کنید، APK جدید را نصب و فایل را بازیابی کنید. داده‌های برنامه با حذف آن از گوشی پاک می‌شوند.

در گردش انتشار، keystore فقط روی runner موقت از secret بازسازی می‌شود، Gradle خروجی `assembleRelease` می‌سازد و امضای APK پیش از انتشار بررسی می‌شود. هیچ فایل کلید یا رمز نباید در Git، artifactهای عمومی یا خروجی دستورها قرار گیرد.

راهنمای رسمی: [امضای برنامهٔ اندروید](https://developer.android.com/studio/publish/app-signing) و [نگهداری فایل دودویی در GitHub Actions secrets](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets#storing-base64-binary-blobs-as-secrets).

## APK جداگانه برای آزمون، بدون انتشار

workflow جدید `.github/workflows/android-test.yml` با نام **Android isolated test APK** دستی یا با push روی `develop` و پیام آخرین commit دارای `[android-test]` اجرا می‌شود. pushهای عادی ساخت APK آزمایشی را اجرا نمی‌کنند. برای اجرای دستی، پس از ثبت فایل workflow در شاخهٔ پیش‌فرض مخزن، در GitHub Actions همین workflow را انتخاب و شاخهٔ `develop` را تعیین کنید. نتیجهٔ ساخت در صفحهٔ همان run و چک‌لیست آماده‌سازی ثبت می‌شود.

این workflow ابتدا test، lint و build را اجرا می‌کند، دارایی‌های وب را به Android منتقل می‌کند و سپس `assembleDebug -PffosTestBuild=true` را می‌سازد. نتیجه فقط artifact هفت‌روزهٔ همان run است؛ tag یا GitHub Release ساخته نمی‌شود و secrets امضای release لازم نیستند. پس از ساخت، امضای APK و شناسهٔ `io.github.msm353.ffos.test` بررسی می‌شوند.

فایل خروجی برنامهٔ **FFOS Test** است و کنار FFOS فعلی با فضای دادهٔ جدا نصب می‌شود. تغییر شناسه و نام فقط با گزینهٔ `ffosTestBuild=true` و در build نوع debug فعال است؛ شناسهٔ انتشار اصلی همان `io.github.msm353.ffos` باقی می‌ماند. نصب این APK آزمون ارتقای نسخهٔ اصلی با کلید ثابت را اثبات نمی‌کند. debug از کلید آزمایشی runner استفاده می‌کند؛ امضای ثابت بین دو run تضمین نمی‌شود، بنابراین آن را برای اطلاعات مالی واقعی استفاده نکنید.

برای ساخت همین خروجی در محیط محلیِ دارای JDK 21 و Android SDK 36، پس از build وب و `npx cap sync android`، در پوشهٔ `android` اجرا کنید:

```powershell
.\gradlew.bat assembleDebug -PffosTestBuild=true --no-daemon
```

برای آزمون گوشی در FFOS Test، fixture ساختگی `tests/fixtures/backup-browser/legacy-v1.json` را بازیابی کنید، پشتیبان را خارج از Cache برنامه ذخیره و وجود فایل را بررسی کنید؛ ثبت آفلاین، بستن/بازکردن، لغو تأیید، بازیابی و انتقال فایل بین وب آزمایشی و APK را آزموده و نتیجه را در P7 ثبت کنید. نسخهٔ اصلی یا داده‌های آن را برای این آزمون حذف نکنید.

مبنای جداسازی: [build variant و applicationIdSuffix در مستندات Android](https://developer.android.com/build/build-variants#application-id). نگهداری خروجی: [راهنمای رسمی upload-artifact](https://github.com/actions/upload-artifact).
