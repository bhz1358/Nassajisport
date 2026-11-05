"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  className = "a-btn a-btn-primary",
  confirm: confirmText,
  name,
  value,
}: {
  children: React.ReactNode;
  className?: string;
  confirm?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      name={name}
      value={value}
      onClick={(e) => {
        if (confirmText && !window.confirm(confirmText)) e.preventDefault();
      }}
    >
      {pending ? "در حال ذخیره…" : children}
    </button>
  );
}

export function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="a-btn a-btn-small"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(new URL(text, window.location.origin).href);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard blocked */
        }
      }}
    >
      {done ? "کپی شد" : "کپی آدرس"}
    </button>
  );
}

/** Turns a title into a URL slug; Persian letters are kept, as WordPress does. */
export function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Fills the slug field from the title until the slug is edited by hand. */
export function SlugField({ titleId, defaultValue }: { titleId: string; defaultValue: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const touched = useRef(!!defaultValue);
  useEffect(() => {
    const title = document.getElementById(titleId) as HTMLInputElement | null;
    if (!title) return;
    const onInput = () => {
      if (!touched.current && ref.current) ref.current.value = slugify(title.value);
    };
    title.addEventListener("input", onInput);
    return () => title.removeEventListener("input", onInput);
  }, [titleId]);
  return (
    <input
      ref={ref}
      name="slug"
      id="slug"
      defaultValue={defaultValue}
      dir="auto"
      onInput={() => (touched.current = true)}
      placeholder="از روی عنوان ساخته می‌شود"
    />
  );
}

const TOOLS: { label: string; title: string; run: () => void }[] = [
  { label: "B", title: "پررنگ", run: () => document.execCommand("bold") },
  { label: "I", title: "کج", run: () => document.execCommand("italic") },
  { label: "H2", title: "تیتر", run: () => document.execCommand("formatBlock", false, "h2") },
  { label: "H3", title: "زیرتیتر", run: () => document.execCommand("formatBlock", false, "h3") },
  { label: "¶", title: "پاراگراف", run: () => document.execCommand("formatBlock", false, "p") },
  { label: "❝", title: "نقل‌قول", run: () => document.execCommand("formatBlock", false, "blockquote") },
  { label: "•", title: "فهرست", run: () => document.execCommand("insertUnorderedList") },
  { label: "1.", title: "فهرست شماره‌دار", run: () => document.execCommand("insertOrderedList") },
  {
    label: "🔗",
    title: "لینک",
    run: () => {
      const url = window.prompt("آدرس لینک:");
      if (url) document.execCommand("createLink", false, url);
    },
  },
  {
    label: "🖼",
    title: "عکس از آدرس (آدرس را از بخش رسانه کپی کنید)",
    run: () => {
      const url = window.prompt("آدرس عکس:");
      if (url) document.execCommand("insertImage", false, url);
    },
  },
];

/** Visual editor with an HTML source view; the HTML travels in a hidden input named `name`. */
export function RichEditor({ name, defaultValue }: { name: string; defaultValue: string }) {
  const [html, setHtml] = useState(defaultValue);
  const [source, setSource] = useState(false);
  const editor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!source && editor.current && editor.current.innerHTML !== html) editor.current.innerHTML = html;
  }, [source, html]);

  return (
    <div className="editor">
      <div className="editor-toolbar" role="toolbar" aria-label="ابزار ویرایش">
        {!source &&
          TOOLS.map((t) => (
            <button
              key={t.title}
              type="button"
              title={t.title}
              aria-label={t.title}
              onMouseDown={(e) => {
                e.preventDefault();
                t.run();
                setHtml(editor.current?.innerHTML ?? "");
              }}
            >
              {t.label}
            </button>
          ))}
        <button type="button" className="editor-mode" onClick={() => setSource((s) => !s)}>
          {source ? "نمای ویرایشگر" : "کد HTML"}
        </button>
      </div>
      {source ? (
        <textarea className="editor-source" dir="ltr" value={html} onChange={(e) => setHtml(e.target.value)} rows={20} />
      ) : (
        <div
          ref={editor}
          className="editor-area prose"
          contentEditable
          suppressContentEditableWarning
          onInput={(e) => setHtml(e.currentTarget.innerHTML)}
        />
      )}
      <input type="hidden" name={name} value={html} />
    </div>
  );
}

/** Image field: shows the current image, lets you upload a new one or paste a URL. */
export function ImageField({ name, defaultValue, label }: { name: string; defaultValue?: string; label: string }) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [preview, setPreview] = useState(defaultValue ?? "");
  return (
    <div className="image-field">
      <span className="a-label">{label}</span>
      <div className="image-field-box">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" />
        ) : (
          <span className="muted">بدون عکس</span>
        )}
      </div>
      <input
        type="file"
        name={`${name}File`}
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setPreview(URL.createObjectURL(f));
        }}
      />
      <input
        name={name}
        value={url}
        dir="ltr"
        placeholder="یا آدرس عکس: /uploads/..."
        onChange={(e) => {
          setUrl(e.target.value);
          setPreview(e.target.value);
        }}
      />
      {url && (
        <button
          type="button"
          className="a-link"
          onClick={() => {
            setUrl("");
            setPreview("");
          }}
        >
          حذف عکس
        </button>
      )}
    </div>
  );
}
