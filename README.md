# SCIE Builder

سامانهٔ کشف، ارزیابی شواهد، حل هویت و نمایش ظرفیت‌های انسانی مرتبط با اردکان.

- وضعیت: در حال توسعه
- نسخه: `0.2.0`
- داشبورد عمومی: <https://mrbehzadi-code.github.io/scie-builder/>
- API مدیریتی: Cloudflare Worker + D1
- دادهٔ عمومی: Snapshotهای نسخه‌بندی‌شده در `docs/`

## واژگان داده

این مفاهیم عمداً از هم جدا هستند:

- **Discovery / کاندیدای کشف‌شده:** خروجی خام یک منبع یا جست‌وجو؛ هنوز به معنی شخص معتبر یا اردکانی‌بودن نیست.
- **Validated person / فرد عبورکرده از دروازهٔ کیفیت:** نام شخص‌مانند با منشأ منبع و شاهد مستقل قابل استناد برای ارتباط با اردکان.
- **Human-confirmed person / فرد تأییدشدهٔ انسانی:** پرونده‌ای که تصمیم بازبین، همراه زمان و توضیح، برای آن ثبت شده است.
- **Social-capital indicator / شاخص سرمایهٔ اجتماعی:** سنجه‌ای تحلیلی که به کیفیت، نوع و ساختار روابط نیاز دارد؛ تعداد یا شهرت افراد به‌تنهایی چنین شاخصی نیست.

نام خانوادگی «اردکانی» به‌تنهایی شاهد ارتباط فرد با شهرستان اردکان محسوب نمی‌شود.

## Quality Gate

دروازهٔ کیفیت در این مرحله به‌صورت fail-closed و **Shadow Mode** اجرا می‌شود. یعنی:

1. `docs/data.json` و فهرست عمومی را حذف یا بازنویسی نمی‌کند.
2. برای هر ورودی شناسهٔ پایدار، وضعیت، علت تصمیم، قدرت شاهد و provenance می‌سازد.
3. موارد غیرشخص، مبهم، فاقد منشأ، فاقد شاهد محلی کافی یا احتمالاً تکراری را از افراد معتبر جدا می‌کند.
4. خروجی قابل بازبینی را در `docs/quality_gate_shadow.json` می‌نویسد.

اجرای محلی:

```bash
python engines/quality_gate.py
python engines/validate_quality_gate.py
python -m unittest discover -s tests -p "*quality_gate.py" -v
```

فعال‌سازی فیلتر عمومی فقط پس از بررسی گزارش Shadow و تصمیم صریح مدیر انجام می‌شود.

## اجرای داشبورد

داشبورد یک سایت استاتیک است و Backend محلی آن FastAPI نیست. برای مشاهدهٔ محلی از ریشهٔ مخزن اجرا کنید:

```bash
python -m http.server 8000 --directory docs
```

سپس <http://127.0.0.1:8000/> را باز کنید. عملیات ماندگار مدیریتی مانند ورود، ویرایش، ادغام و صف بازبینی از Cloudflare Worker استفاده می‌کنند و صرفاً با `http.server` پیاده‌سازی نشده‌اند.

## مسیر پردازش هدف

```text
Discovery
→ normalization
→ person-type gate
→ locality/evidence gate
→ entity resolution
→ human-review queue
→ canonical entities
→ knowledge graph
→ dashboard snapshot
→ validation
→ Pages
```

در PR جاری Quality Gate هنوز Shadow است و Snapshot عمومی را مسدود نمی‌کند. تبدیل آن به gate اجباری یک تصمیم انتشار جداگانه است.

## حریم خصوصی و دامنهٔ منابع

فقط اطلاعات عمومی و حرفه‌ای مرتبط نگهداری می‌شود. شماره تماس خصوصی، نشانی منزل، دادهٔ حساس و محتوای پشت ورود یا حساب خصوصی جمع‌آوری نمی‌شود. خطای دسترسی به منبع نیز به معنی نبود فرد یا تغییر اطلاعات نیست.

## کنترل کیفیت و انتشار

- `Quality Gate PR checks` تست‌های واحد، سازگاری Snapshot، provenance و JavaScript داشبورد را روی PR اجرا می‌کند.
- workflow هوش، خروجی Quality Gate را بازسازی و اعتبارسنجی می‌کند.
- workflow Pages شمارش‌ها، گراف، schema و smoke test مرورگر را بررسی می‌کند.
- تغییرات زمان‌بندی‌شدهٔ داده باید از تغییرات کد در commit جدا نگه داشته شوند.

Checkpoint این مرحله: [`docs/checkpoints/2026-10-09-quality-gate-shadow.md`](docs/checkpoints/2026-10-09-quality-gate-shadow.md)
