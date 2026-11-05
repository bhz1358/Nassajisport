"use client";

import { useState } from "react";
import { SubmitButton } from "../../ui-client";
import { COLOR_MODES, isHex, THEME_PRESETS, themeVars } from "@/lib/themes";
import type { Settings } from "@/lib/types";

export function ThemePicker({ theme, siteTitle, logo }: { theme: Settings["theme"]; siteTitle: string; logo: string }) {
  const [preset, setPreset] = useState(theme.preset);
  const [brand, setBrand] = useState(theme.brand ?? THEME_PRESETS[0].brand);
  const [accent, setAccent] = useState(theme.accent ?? THEME_PRESETS[0].accent);
  const [mode, setMode] = useState(theme.mode);

  const chosen = preset === "custom" ? { brand, accent } : (THEME_PRESETS.find((t) => t.id === preset) ?? THEME_PRESETS[0]);
  const vars = themeVars(isHex(chosen.brand) ? chosen.brand : THEME_PRESETS[0].brand, isHex(chosen.accent) ? chosen.accent : THEME_PRESETS[0].accent);

  return (
    <div className="a-theme">
      <div>
        <fieldset className="a-card">
          <legend>تم‌های آماده</legend>
          <div className="a-theme-grid">
            {THEME_PRESETS.map((t) => (
              <label key={t.id} className={`a-theme-card ${preset === t.id ? "is-selected" : ""}`}>
                <input type="radio" name="preset" value={t.id} checked={preset === t.id} onChange={() => setPreset(t.id)} />
                <span className="a-swatch">
                  <span style={{ background: t.brand }} />
                  <span style={{ background: t.accent }} />
                </span>
                {t.name}
              </label>
            ))}
            <label className={`a-theme-card ${preset === "custom" ? "is-selected" : ""}`}>
              <input type="radio" name="preset" value="custom" checked={preset === "custom"} onChange={() => setPreset("custom")} />
              <span className="a-swatch">
                <span style={{ background: brand }} />
                <span style={{ background: accent }} />
              </span>
              رنگ دلخواه
            </label>
          </div>
        </fieldset>

        <fieldset className="a-card" disabled={preset !== "custom"}>
          <legend>رنگ دلخواه</legend>
          <div className="a-row">
            <label className="a-field">
              <span className="a-label">رنگ اصلی (هدر، تیترها)</span>
              <span className="a-color">
                <input type="color" name="brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
                <code dir="ltr">{brand}</code>
              </span>
            </label>
            <label className="a-field">
              <span className="a-label">رنگ تأکیدی (دکمه‌ها، برچسب‌ها، زنده)</span>
              <span className="a-color">
                <input type="color" name="accent" value={accent} onChange={(e) => setAccent(e.target.value)} />
                <code dir="ltr">{accent}</code>
              </span>
            </label>
          </div>
          <p className="a-hint">برای خوانایی، رنگ اصلی را تیره‌تر و رنگ تأکیدی را پررنگ و متفاوت انتخاب کنید.</p>
        </fieldset>

        <fieldset className="a-card">
          <legend>حالت روشن / تیره</legend>
          {COLOR_MODES.map((m) => (
            <label key={m.id} className="a-check">
              <input type="radio" name="mode" value={m.id} checked={mode === m.id} onChange={() => setMode(m.id)} />
              {m.label}
            </label>
          ))}
        </fieldset>

        <SubmitButton>ذخیره و اعمال روی سایت</SubmitButton>
      </div>

      <div className="a-card a-theme-preview-wrap">
        <span className="a-label">پیش‌نمایش</span>
        <div className="a-theme-preview" style={vars as React.CSSProperties} data-mode={mode === "dark" ? "dark" : undefined}>
          <div className="tp-strip">
            <span>لیگ برتر</span>
            <span className="tp-live">نساجی ۱ - ۱ سپاهان · ۶۳′</span>
          </div>
          <div className="tp-header">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} alt="" className="tp-logo" />
            <strong>{siteTitle}</strong>
            <span className="tp-btn">خرید بلیت</span>
          </div>
          <div className="tp-body">
            <div className="tp-hero">
              <span className="tp-badge">اخبار</span>
              <strong>تیتر خبر اصلی در این قسمت</strong>
            </div>
            <div className="tp-card">
              <span className="tp-kicker">نقد و بررسی</span>
              <strong>عنوان یک خبر</strong>
              <span className="tp-meta">۴ آبان</span>
            </div>
            <div className="tp-row is-club">
              <span>۵</span>
              <span>نساجی مازندران</span>
              <b>۱۷</b>
            </div>
            <div className="tp-row">
              <span>۶</span>
              <span>گل‌گهر سیرجان</span>
              <b>۱۵</b>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
