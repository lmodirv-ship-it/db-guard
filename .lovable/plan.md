## الخطة: حزم موقع hn-db.fun في ملف ZIP قابل للتحميل

### الخطوات
1. **التحقق من وجود الملفات** في `/tmp/hn-db-fun/` (index.html, styles.css, script.js, favicon.svg, robots.txt, sitemap.xml, README.txt).
2. **إنشاء ملف ZIP** باسم `hn-db-fun.zip` ووضعه في `/mnt/documents/` ليصبح قابلاً للتحميل.
3. **عرض رابط التحميل** عبر `<presentation-artifact>` حتى تستطيع تنزيله بضغطة واحدة.
4. **تعليمات التشغيل المحلي** المختصرة:
   - فك الضغط
   - افتح Terminal داخل المجلد
   - شغّل: `python -m http.server 8000`
   - افتح المتصفح على: `http://localhost:8000`

### النتيجة
ملف `hn-db-fun.zip` جاهز للتحميل، يحتوي على كامل الموقع الثابت المستقل (بدون أي روابط Lovable أو SSO)، يمكنك:
- تجربته محلياً على حاسوبك
- رفعه مباشرة إلى استضافة LWS لنطاق `hn-db.fun`
