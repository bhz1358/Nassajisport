import Link from "next/link";

export default function NotFound() {
  return (
    <section className="not-found">
      <h1>صفحه پیدا نشد</h1>
      <p className="muted">ممکن است این مطلب جابه‌جا یا حذف شده باشد.</p>
      <Link href="/">بازگشت به صفحه اصلی</Link>
    </section>
  );
}
