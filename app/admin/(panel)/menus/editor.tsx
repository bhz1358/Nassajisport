"use client";

import { useState } from "react";
import type { MenuItem } from "@/lib/menus";

type Row = MenuItem & { id: number };
let nextId = 1;
const withIds = (items: MenuItem[]): Row[] => items.map((i) => ({ ...i, id: nextId++ }));

/**
 * Edits one menu: rename, change the address, move up/down, delete, add.
 * The list travels to the server as JSON in a hidden field.
 */
export function MenuEditor({ items, suggestions, listId }: { items: MenuItem[]; suggestions: MenuItem[]; listId: string }) {
  const [rows, setRows] = useState<Row[]>(() => withIds(items));
  const set = (id: number, patch: Partial<MenuItem>) => setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const move = (i: number, d: -1 | 1) =>
    setRows((r) => {
      const j = i + d;
      if (j < 0 || j >= r.length) return r;
      const next = [...r];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const add = (item: MenuItem = { label: "", href: "" }) => setRows((r) => [...r, ...withIds([item])]);

  return (
    <div className="a-menu-editor">
      <input type="hidden" name="items" value={JSON.stringify(rows.map(({ label, href }) => ({ label, href })))} />
      <datalist id={listId}>
        {suggestions.map((s) => (
          <option key={s.href} value={s.href}>
            {s.label}
          </option>
        ))}
      </datalist>
      {rows.length === 0 && <p className="muted">این منو خالی است؛ با «افزودن گزینه» شروع کنید.</p>}
      <ol className="a-menu-rows">
        {rows.map((row, i) => (
          <li key={row.id} className="a-menu-row">
            <span className="a-menu-num">{(i + 1).toLocaleString("fa-IR")}</span>
            <input aria-label="عنوان" placeholder="عنوان، مثلاً اخبار" value={row.label} maxLength={40} onChange={(e) => set(row.id, { label: e.target.value })} />
            <input
              aria-label="آدرس"
              placeholder="/category/news/ یا https://..."
              dir="ltr"
              list={listId}
              value={row.href}
              onChange={(e) => {
                const href = e.target.value;
                // Picking a suggestion fills an empty title with its name.
                const s = suggestions.find((x) => x.href === href);
                set(row.id, { href, ...(s && !row.label.trim() ? { label: s.label } : {}) });
              }}
            />
            <span className="a-menu-tools">
              <button type="button" className="a-icon-btn" aria-label="بالا" title="بالا" disabled={i === 0} onClick={() => move(i, -1)}>
                ↑
              </button>
              <button type="button" className="a-icon-btn" aria-label="پایین" title="پایین" disabled={i === rows.length - 1} onClick={() => move(i, 1)}>
                ↓
              </button>
              <button type="button" className="a-icon-btn is-danger" aria-label={`حذف ${row.label}`} title="حذف" onClick={() => setRows((r) => r.filter((x) => x.id !== row.id))}>
                ×
              </button>
            </span>
          </li>
        ))}
      </ol>
      <div className="a-menu-add">
        <button type="button" className="a-btn a-btn-small" onClick={() => add()}>
          + افزودن گزینه
        </button>
        <select
          aria-label="افزودن از صفحه‌های سایت"
          value=""
          onChange={(e) => {
            const s = suggestions.find((x) => x.href === e.target.value);
            if (s) add(s);
          }}
        >
          <option value="">افزودن از صفحه‌ها و دسته‌ها…</option>
          {suggestions.map((s) => (
            <option key={s.href} value={s.href}>
              {s.label} ({s.href})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
