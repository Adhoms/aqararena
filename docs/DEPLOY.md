# نشر الموقع أونلاين (Deploy) — Vercel + Neon

الموقع بيتنشر على **Vercel** (استضافة مجانية لمواقع Next.js)، وقاعدة البيانات على **Neon** (PostgreSQL مجاني). الاتنين بيدخلوا بحساب GitHub، ومش محتاجين كارت فيزا في الخطة المجانية.

> كلمات السر وعناوين قاعدة البيانات **ماتتكتبش في الشات ولا في GitHub**. بتتحط في ملف `.env` على جهازك (الملف ده مش بيترفع) وفي إعدادات Vercel بس.

---

## 0) جهّز الكود على `main`

Vercel بينشر فرع `main` كموقع أساسي. ادمج الـ pull requests بالترتيب:

1. PR #2 — قاعدة البيانات
2. PR #3 — التصميم الذكي (حوّل الـ base بتاعه لـ `main` بعد دمج #2)
3. PR النشر ده

## 1) أنشئ قاعدة البيانات على Neon

1. ادخل على https://neon.tech واعمل حساب بـ GitHub.
2. **Create project**:
   - الاسم: `aqararena`
   - المنطقة (Region): **AWS Europe Central 1 (Frankfurt)** — الأقرب لمصر.
3. من زر **Connect** في الصفحة الرئيسية للمشروع خد نسختين من عنوان الاتصال:
   - **Pooled connection** (فيه كلمة `-pooler`) → ده `DATABASE_URL`
   - شيل علامة "Connection pooling" وخد العنوان التاني → ده `DIRECT_URL`

## 2) جهّز الجداول والبيانات من جهازك

في ملف `.env` على جهازك (مش `.env.example`):

1. حط `#` قبل سطور قاعدة البيانات المحلية الحالية (`DATABASE_URL`, `SHADOW_DATABASE_URL`, `DATABASE_POOL_MAX`).
2. أضف السطرين دول بالعناوين اللي نسختها من Neon:

```
DATABASE_URL="...العنوان الـ pooled..."
DIRECT_URL="...العنوان الـ direct..."
```

3. شغّل في الـ terminal:

```bash
npx prisma migrate deploy
```

ده بيعمل كل الجداول في Neon.

4. (اختياري) عشان الموقع مايبقاش فاضي لحد ما تضيف المشروعات الحقيقية، حمّل البيانات التجريبية — في PowerShell:

```powershell
$env:ALLOW_DEMO_SEED=1; npm run db:seed
```

بعد كده ترجّع `.env` لقاعدة البيانات المحلية لو عايز تشتغل على جهازك.

## 3) انشر على Vercel

1. ادخل على https://vercel.com واعمل حساب بـ GitHub.
2. **Add New → Project** → اختار الـ repo **Adhoms/aqararena** → Import.
3. Framework: **Next.js** (بيتعرف لوحده). سيب Build Command زي ما هو — المشروع فيه `vercel-build` اللي بيعمل:
   `prisma generate` ← `prisma migrate deploy` ← `next build`
4. افتح **Environment Variables** وأضف:

| الاسم | القيمة |
| --- | --- |
| `DATABASE_URL` | عنوان Neon الـ **pooled** |
| `DIRECT_URL` | عنوان Neon الـ **direct** |

   ماتضيفش `DATABASE_POOL_MAX` ولا `SHADOW_DATABASE_URL` (دول للجهاز المحلي بس).
5. **Deploy**. بعد دقيقتين تقريبًا هتاخد رابط زي `aqararena.vercel.app`.
6. (مستحسن) **Settings → Functions → Function Region** → **Frankfurt (fra1)** عشان السيرفر يبقى جنب قاعدة البيانات.

## 4) بعد النشر

- كل push على `main` بينشر نسخة جديدة لوحده.
- كل pull request بياخد رابط معاينة (Preview) خاص بيه.
- الأسعار والبيانات بتتحدّث في الموقع كل ساعة (أو فورًا لما بوابة المطورين تتعمل).

## لو حصلت مشكلة

| المشكلة | الحل |
| --- | --- |
| البناء فشل عند `prisma migrate deploy` | اتأكد إن `DIRECT_URL` هو العنوان **من غير** `-pooler`. |
| الموقع بيفتح بس مافيش مشروعات | قاعدة البيانات فاضية: نفّذ خطوة 2-4 أو أضف مشروعات حقيقية. |
| `DATABASE_URL is not set` | المتغيرات مش متضافة في Vercel، أو اتضافت بعد آخر Deploy — اعمل **Redeploy**. |
