"use client";

import { useRef, useState } from "react";

/** A Persian «choose photo» button; choosing a photo sends the form right away. */
export function PhotoPicker({ label }: { label: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <input
        ref={ref}
        id="photo"
        name="photo"
        type="file"
        accept="image/*"
        required
        className="sr-only"
        onChange={(e) => {
          if (!e.target.files?.length) return;
          setBusy(true);
          e.target.form?.requestSubmit();
        }}
      />
      <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => ref.current?.click()}>
        {busy ? "در حال بارگذاری…" : label}
      </button>
      <noscript>
        <button type="submit" className="btn btn-sm btn-outline">ارسال</button>
      </noscript>
    </>
  );
}
