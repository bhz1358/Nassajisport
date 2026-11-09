"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

export function SubmitButton({
  children,
  className = "a-btn a-btn-primary",
  confirm: confirmText,
  name,
  value,
  pendingText = "در حال ذخیره…",
}: {
  children: React.ReactNode;
  className?: string;
  confirm?: string;
  pendingText?: string;
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
      {pending ? pendingText : children}
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
    title: "عکس از آدرس (مثلاً آدرسی که از بخش رسانه کپی کرده‌اید)",
    run: () => {
      const url = window.prompt("آدرس عکس:");
      if (url) document.execCommand("insertImage", false, url);
    },
  },
];

const MEDIA_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm";
const escapeAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** Sends one picture or video to the server; returns where it was saved. */
async function uploadMedia(file: File): Promise<{ url: string; kind: "image" | "video" }> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/admin/upload/", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) throw new Error(data.error || `بارگذاری «${file.name}» انجام نشد.`);
  return data;
}

/**
 * Visual editor with an HTML source view; the HTML travels in a hidden input named `name`.
 * Pictures and videos go straight into the text: the 📷 button, pasting a picture, or
 * dropping files where they should appear.
 */
export function RichEditor({ name, defaultValue }: { name: string; defaultValue: string }) {
  const [html, setHtml] = useState(defaultValue);
  const [source, setSource] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const editor = useRef<HTMLDivElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  // Where the cursor was in the text, so files land there after the file dialog.
  const caret = useRef<Range | null>(null);

  useEffect(() => {
    if (!source && editor.current && editor.current.innerHTML !== html) editor.current.innerHTML = html || "<p><br></p>";
  }, [source, html]);

  useEffect(() => {
    // New lines are <p>, not <div>.
    document.execCommand("defaultParagraphSeparator", false, "p");
  }, []);

  const rememberCaret = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && editor.current?.contains(sel.anchorNode)) caret.current = sel.getRangeAt(0).cloneRange();
  };
  const restoreCaret = () => {
    const el = editor.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    if (caret.current && el.contains(caret.current.startContainer)) sel.addRange(caret.current);
    else {
      // No cursor in the text yet: add at the end.
      const r = document.createRange();
      r.selectNodeContents(el);
      r.collapse(false);
      sel.addRange(r);
    }
  };

  /**
   * Puts a picture or video in its own block after the paragraph the cursor is in (or
   * in place of an empty one), then an empty paragraph after it to keep typing in.
   */
  const placeMedia = (markup: string) => {
    const root = editor.current;
    if (!root) return;
    restoreCaret();
    let block: Node | null = window.getSelection()?.rangeCount ? window.getSelection()!.getRangeAt(0).startContainer : null;
    while (block && block.parentNode !== root) block = block.parentNode;
    const tpl = document.createElement("template");
    tpl.innerHTML = markup;
    const media = tpl.content.firstElementChild!;
    const after = document.createElement("p");
    after.appendChild(document.createElement("br"));
    const emptyBlock = block instanceof HTMLElement && !block.textContent?.trim() && !block.querySelector("img,video,iframe");
    if (block && emptyBlock) root.replaceChild(media, block);
    else if (block) root.insertBefore(media, block.nextSibling);
    else root.appendChild(media);
    media.after(after);
    const r = document.createRange();
    r.setStart(after, 0);
    r.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(r);
    caret.current = r.cloneRange();
  };

  const insertFiles = async (files: File[]) => {
    const list = files.filter((f) => /^(image|video)\//.test(f.type) || /\.(jpe?g|png|webp|gif|avif|mp4|webm)$/i.test(f.name));
    if (!list.length) return;
    setError(null);
    for (let i = 0; i < list.length; i++) {
      setBusy(list.length > 1 ? `در حال بارگذاری ${(i + 1).toLocaleString("fa-IR")} از ${list.length.toLocaleString("fa-IR")}…` : "در حال بارگذاری…");
      try {
        const { url, kind } = await uploadMedia(list[i]);
        placeMedia(
          kind === "video"
            ? `<video src="${escapeAttr(url)}" controls playsinline preload="metadata"></video>`
            : `<p><img src="${escapeAttr(url)}" alt=""></p>`,
        );
        setHtml(editor.current?.innerHTML ?? "");
      } catch (e) {
        setError((e as Error).message);
      }
    }
    setBusy(null);
  };

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
        {!source && (
          <button
            type="button"
            className="editor-media"
            title="افزودن عکس یا ویدیو از کامپیوتر/گوشی (یا عکس را در متن بچسبانید یا بکشید)"
            onMouseDown={(e) => {
              e.preventDefault();
              rememberCaret();
              picker.current?.click();
            }}
            disabled={!!busy}
          >
            📷 عکس / ویدیو
          </button>
        )}
        <input
          ref={picker}
          type="file"
          accept={MEDIA_ACCEPT}
          multiple
          hidden
          onChange={(e) => {
            const files = [...(e.target.files ?? [])];
            e.target.value = "";
            void insertFiles(files);
          }}
        />
        <button type="button" className="editor-mode" onClick={() => setSource((s) => !s)}>
          {source ? "نمای ویرایشگر" : "کد HTML"}
        </button>
      </div>
      {(busy || error) && (
        <p className={`editor-status ${error ? "is-error" : ""}`} role="status">
          {busy ?? error}
        </p>
      )}
      {source ? (
        <textarea className="editor-source" dir="ltr" value={html} onChange={(e) => setHtml(e.target.value)} rows={20} />
      ) : (
        <div
          ref={editor}
          className="editor-area prose"
          contentEditable
          suppressContentEditableWarning
          onInput={(e) => setHtml(e.currentTarget.innerHTML)}
          onKeyUp={rememberCaret}
          onMouseUp={rememberCaret}
          onPaste={(e) => {
            const files = [...e.clipboardData.files];
            if (files.length) {
              e.preventDefault();
              rememberCaret();
              void insertFiles(files);
            }
          }}
          onDragOver={(e) => {
            if ([...e.dataTransfer.types].includes("Files")) e.preventDefault();
          }}
          onDrop={(e) => {
            const files = [...e.dataTransfer.files];
            if (!files.length) return;
            e.preventDefault();
            // Put the cursor where the files were dropped.
            const range = document.caretRangeFromPoint?.(e.clientX, e.clientY);
            if (range) caret.current = range;
            void insertFiles(files);
          }}
        />
      )}
      <input type="hidden" name={name} value={html} />
    </div>
  );
}

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/avif";
const VIDEO_ACCEPT = "video/mp4,video/webm";
const isVideoSrc = (u: string) => /\.(mp4|webm)(\?|#|$)/i.test(u);

/** Image field: shows the current image, lets you upload a new one or paste a URL. With `video`, also takes an MP4/WebM file and previews it. */
export function ImageField({ name, defaultValue, label, video = false }: { name: string; defaultValue?: string; label: string; video?: boolean }) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [preview, setPreview] = useState(defaultValue ?? "");
  const [previewIsVideo, setPreviewIsVideo] = useState(isVideoSrc(defaultValue ?? ""));
  const noun = video ? "فایل" : "عکس";
  return (
    <div className="image-field">
      <span className="a-label">{label}</span>
      <div className="image-field-box">
        {preview && previewIsVideo ? (
          <video src={preview} muted loop autoPlay playsInline />
        ) : preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" />
        ) : (
          <span className="muted">بدون {noun}</span>
        )}
      </div>
      <input
        type="file"
        name={`${name}File`}
        accept={video ? `${IMAGE_ACCEPT},${VIDEO_ACCEPT}` : IMAGE_ACCEPT}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            setPreview(URL.createObjectURL(f));
            setPreviewIsVideo(f.type.startsWith("video/"));
          }
        }}
      />
      <input
        name={name}
        value={url}
        dir="ltr"
        placeholder={`یا آدرس ${noun}: /uploads/...`}
        onChange={(e) => {
          setUrl(e.target.value);
          setPreview(e.target.value);
          setPreviewIsVideo(isVideoSrc(e.target.value));
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
          حذف {noun}
        </button>
      )}
    </div>
  );
}

/** Reloads the page's data every few seconds while something runs on the server. */
export function AutoRefresh({ every = 3 }: { every?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), every * 1000);
    return () => clearInterval(t);
  }, [router, every]);
  return null;
}

/** «انتخاب همه» / «هیچ‌کدام» for a list of checkboxes in a form. */
export function CheckAll({ form, name }: { form: string; name: string }) {
  const set = (on: boolean) =>
    document.querySelectorAll<HTMLInputElement>(`#${form} input[type=checkbox][name="${name}"]:not(:disabled)`).forEach((c) => (c.checked = on));
  return (
    <span className="a-checkall">
      <button type="button" className="a-link" onClick={() => set(true)}>
        انتخاب همه
      </button>
      <button type="button" className="a-link" onClick={() => set(false)}>
        هیچ‌کدام
      </button>
    </span>
  );
}
