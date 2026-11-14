"use client";

import { useState } from "react";

/** The captcha image with a «کد جدید» button and the answer field. */
export function Captcha() {
  const [n, setN] = useState(() => Date.now());
  return (
    <div className="a-captcha">
      <label htmlFor="captcha">کد امنیتی</label>
      <div className="a-captcha-row">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/admin/login/captcha/?t=${n}`} alt="کد امنیتی: عددهای داخل تصویر" width={220} height={72} />
        <button type="button" className="a-btn a-btn-ghost" onClick={() => setN(Date.now())} aria-label="کد جدید" title="کد جدید">
          ↻
        </button>
      </div>
      <input id="captcha" name="captcha" inputMode="numeric" autoComplete="off" required dir="ltr" maxLength={8} placeholder="عددهای تصویر" />
    </div>
  );
}
