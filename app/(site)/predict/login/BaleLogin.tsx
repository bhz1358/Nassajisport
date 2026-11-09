"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Step = { kind: "idle" } | { kind: "wait"; code: string; link?: string; inBale: boolean; error?: string } | { kind: "expired" } | { kind: "error"; message: string };

const fa = (s: string) => s.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

export function BaleLogin({ next }: { next: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ kind: "idle" });
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const check = useCallback(async () => {
    try {
      const r = await fetch("/predict/login/status/", { cache: "no-store" }).then((x) => x.json());
      if (r.status === "done") {
        router.replace(r.named ? next : `/predict/me/?welcome=1&next=${encodeURIComponent(next)}`);
        router.refresh();
        return;
      }
      if (r.status === "expired") return setStep({ kind: "expired" });
      if (r.status === "blocked") return setStep({ kind: "error", message: "حساب شما در مسابقه غیرفعال شده است." });
      setStep((s) => (s.kind === "wait" ? { ...s, inBale: r.status === "bale", error: r.error } : s));
    } catch {
      /* offline for a moment: try again */
    }
    timer.current = setTimeout(check, 2000);
  }, [next, router]);

  useEffect(() => {
    const again = () => {
      if (document.visibilityState === "visible" && timer.current) {
        clearTimeout(timer.current);
        check();
      }
    };
    document.addEventListener("visibilitychange", again);
    return () => {
      document.removeEventListener("visibilitychange", again);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [check]);

  async function start() {
    setBusy(true);
    try {
      const res = await fetch("/predict/login/status/", { method: "POST" });
      const r = await res.json();
      if (!res.ok) return setStep({ kind: "error", message: r.error ?? "ورود فعلاً ممکن نیست." });
      setStep({ kind: "wait", code: r.code, link: r.link, inBale: false });
      if (r.link) window.open(r.link, "_blank", "noopener");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(check, 2000);
    } catch {
      setStep({ kind: "error", message: "اتصال به سایت برقرار نشد؛ دوباره امتحان کنید." });
    } finally {
      setBusy(false);
    }
  }

  if (step.kind === "wait") {
    const bot = step.link?.match(/ble\.ir\/([^?]+)/)?.[1];
    return (
      <div className="bale-login">
        <ol className="bale-steps">
          <li className={step.inBale ? "done" : "now"}>
            بله را باز کنید و در بازوی نساجی اسپرت «شروع» را بزنید.
            {step.link && (
              <a href={step.link} target="_blank" rel="noopener" className="btn btn-primary bale-open">
                باز کردن بله
              </a>
            )}
          </li>
          <li className={step.inBale ? "now" : ""}>در بله دکمهٔ «📱 ارسال شمارهٔ من» را بزنید.</li>
          <li>به همین صفحه برگردید؛ خودکار وارد می‌شوید.</li>
        </ol>
        <div className="bale-code">
          <span>اگر پیام بازو نیامد، این کد را در {bot ? <b dir="ltr">@{bot}</b> : "بازو"} بفرستید:</span>
          <strong dir="ltr">{fa(step.code)}</strong>
        </div>
        <p className="bale-wait" aria-live="polite">
          <span className="live-dot" /> {step.inBale ? "منتظر شمارهٔ شما در بله…" : "منتظر شروع در بله…"}
        </p>
        {step.error && <p className="form-error">{step.error}</p>}
      </div>
    );
  }

  return (
    <div className="bale-login">
      {step.kind === "expired" && <p className="form-error">مهلت ورود (۱۰ دقیقه) تمام شد؛ دوباره «ورود با بله» را بزنید.</p>}
      {step.kind === "error" && <p className="form-error">{step.message}</p>}
      <button type="button" className="btn btn-primary bale-start" onClick={start} disabled={busy}>
        {busy ? "لطفاً صبر کنید…" : "ورود با بله"}
      </button>
      <p className="muted">ثبت‌نام و ورود یکی است و رمز عبور لازم ندارد. شمارهٔ شما فقط برای جلوگیری از حساب تکراری و تماس با برندگان است و در سایت نمایش داده نمی‌شود.</p>
    </div>
  );
}
