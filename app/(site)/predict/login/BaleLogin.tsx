"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Via = "bale" | "telegram";
type Step =
  | { kind: "idle" }
  | { kind: "wait"; via: Via; code: string; link?: string; inBot: boolean; error?: string }
  | { kind: "expired"; via: Via }
  | { kind: "error"; message: string };

const MESSENGERS: Record<Via, { url: string; app: string; bot: string; start: string; botWord: string; host: RegExp }> = {
  bale: { url: "/predict/login/status/", app: "بله", bot: "بازوی نساجی اسپرت", start: "ورود با بله", botWord: "بازو", host: /ble\.ir\/([^?]+)/ },
  telegram: { url: "/predict/login/telegram/", app: "تلگرام", bot: "ربات نساجی اسپرت", start: "ورود با تلگرام", botWord: "ربات", host: /\/([^/?]+)\?start=/ },
};

const fa = (s: string) => s.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

/** Sign-in through the site's bot in Bale and/or Telegram: a code, the bot, the fan's own number. */
export function BaleLogin({ next, via = ["bale"] }: { next: string; via?: Via[] }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ kind: "idle" });
  const [busy, setBusy] = useState<Via | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const waitingVia = step.kind === "wait" ? step.via : null;

  const check = useCallback(async () => {
    if (!waitingVia) return;
    try {
      const r = await fetch(MESSENGERS[waitingVia].url, { cache: "no-store" }).then((x) => x.json());
      if (r.status === "done") {
        router.replace(r.named ? next : `/predict/me/?welcome=1&next=${encodeURIComponent(next)}`);
        router.refresh();
        return;
      }
      if (r.status === "expired") return setStep({ kind: "expired", via: waitingVia });
      if (r.status === "blocked") return setStep({ kind: "error", message: "حساب شما در مسابقه غیرفعال شده است." });
      setStep((s) => (s.kind === "wait" ? { ...s, inBot: r.status === "bale", error: r.error } : s));
    } catch {
      /* offline for a moment: try again */
    }
    timer.current = setTimeout(check, 2000);
  }, [next, router, waitingVia]);

  // Poll while waiting; come back at once when the fan returns to this tab.
  useEffect(() => {
    if (!waitingVia) return;
    timer.current = setTimeout(check, 2000);
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
  }, [check, waitingVia]);

  async function start(which: Via) {
    setBusy(which);
    try {
      const res = await fetch(MESSENGERS[which].url, { method: "POST" });
      const r = await res.json();
      if (!res.ok) return setStep({ kind: "error", message: r.error ?? "ورود فعلاً ممکن نیست." });
      setStep({ kind: "wait", via: which, code: r.code, link: r.link, inBot: false });
      if (r.link) window.open(r.link, "_blank", "noopener");
    } catch {
      setStep({ kind: "error", message: "اتصال به سایت برقرار نشد؛ دوباره امتحان کنید." });
    } finally {
      setBusy(null);
    }
  }

  if (step.kind === "wait") {
    const m = MESSENGERS[step.via];
    const bot = step.link?.match(m.host)?.[1];
    return (
      <div className={`bale-login via-${step.via}`}>
        <ol className="bale-steps">
          <li className={step.inBot ? "done" : "now"}>
            {m.app} را باز کنید و در {m.bot} «شروع» (Start) را بزنید.
            {step.link && (
              <a href={step.link} target="_blank" rel="noopener" className="btn btn-primary bale-open">
                باز کردن {m.app}
              </a>
            )}
          </li>
          <li className={step.inBot ? "now" : ""}>در {m.app} دکمهٔ «📱 ارسال شمارهٔ من» را بزنید.</li>
          <li>به همین صفحه برگردید؛ خودکار وارد می‌شوید.</li>
        </ol>
        <div className="bale-code">
          <span>اگر پیام {m.botWord} نیامد، این کد را در {bot ? <b dir="ltr">@{bot}</b> : m.botWord} بفرستید:</span>
          <strong dir="ltr">{fa(step.code)}</strong>
        </div>
        <p className="bale-wait" aria-live="polite">
          <span className="live-dot" /> {step.inBot ? `منتظر شمارهٔ شما در ${m.app}…` : `منتظر شروع در ${m.app}…`}
        </p>
        {step.error && <p className="form-error">{step.error}</p>}
        {via.length > 1 && (
          <button type="button" className="btn-link bale-switch" onClick={() => setStep({ kind: "idle" })}>
            انتخاب پیام‌رسان دیگر
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bale-login">
      {step.kind === "expired" && <p className="form-error">مهلت ورود (۱۰ دقیقه) تمام شد؛ دوباره «{MESSENGERS[step.via].start}» را بزنید.</p>}
      {step.kind === "error" && <p className="form-error">{step.message}</p>}
      <div className="bale-choices">
        {via.map((v) => (
          <button key={v} type="button" className={`btn btn-primary bale-start via-${v}`} onClick={() => start(v)} disabled={!!busy}>
            {busy === v ? "لطفاً صبر کنید…" : MESSENGERS[v].start}
          </button>
        ))}
      </div>
      <p className="muted">
        ثبت‌نام و ورود یکی است و رمز عبور لازم ندارد.{via.length > 1 ? " با هر دو پیام‌رسان و یک شماره، حساب شما یکی است." : ""} شمارهٔ شما فقط برای جلوگیری از حساب تکراری و تماس با برندگان است و در سایت نمایش داده نمی‌شود.
      </p>
    </div>
  );
}
