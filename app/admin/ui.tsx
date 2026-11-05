import Link from "next/link";

const MESSAGES: Record<string, string> = {
  saved: "تغییرات ذخیره شد.",
  created: "ایجاد شد.",
  deleted: "حذف شد.",
  uploaded: "فایل‌ها بارگذاری شد.",
  imported: "درون‌ریزی انجام شد.",
  password: "رمز عبور تغییر کرد.",
};

type SP = Promise<Record<string, string | string[] | undefined>>;

/** Success/error banner driven by ?ok= / ?error= after a form submits. */
export async function Flash({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const ok = typeof sp.ok === "string" ? (MESSAGES[sp.ok] ?? sp.ok) : undefined;
  const error = typeof sp.error === "string" ? sp.error : undefined;
  if (!ok && !error) return null;
  return (
    <div className={`a-flash ${error ? "is-error" : ""}`} role={error ? "alert" : "status"}>
      {error ?? ok}
    </div>
  );
}

export function PageHead({ title, children, back }: { title: string; children?: React.ReactNode; back?: string }) {
  return (
    <div className="a-pagehead">
      <div>
        {back && (
          <Link href={back} className="a-back">
            → بازگشت
          </Link>
        )}
        <h1>{title}</h1>
      </div>
      {children && <div className="a-pagehead-actions">{children}</div>}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
  wide,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`a-field ${wide ? "is-wide" : ""}`}>
      <span className="a-label">{label}</span>
      {children}
      {hint && <span className="a-hint">{hint}</span>}
    </label>
  );
}
