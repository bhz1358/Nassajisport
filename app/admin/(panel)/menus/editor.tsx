"use client";

import { useState } from "react";
import type { MenuItem, MenuRow } from "@/lib/menus";

type Row = MenuRow & { id: number; depth: number };
let nextId = 1;
const withIds = (rows: MenuRow[]): Row[] => rows.map((r) => ({ ...r, depth: r.depth === 1 ? 1 : 0, id: nextId++ }));

/** A top-level row and the submenu rows right after it: they move together. */
function blockRange(rows: Row[], i: number): [number, number] {
  let end = i + 1;
  while (end < rows.length && rows[end].depth === 1) end++;
  return [i, end];
}

/**
 * Edits one menu: rename, change the address, move up/down, delete, add, and (with
 * `nested`) turn an item into a submenu item of the one above it.
 * The rows travel to the server as JSON in a hidden field.
 */
export function MenuEditor({ rows: initial, suggestions, listId, nested = false }: { rows: MenuRow[]; suggestions: MenuItem[]; listId: string; nested?: boolean }) {
  const [rows, setRows] = useState<Row[]>(() => withIds(initial));
  const set = (id: number, patch: Partial<Row>) => setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const move = (i: number, d: -1 | 1) =>
    setRows((r) => {
      const row = r[i];
      if (row.depth === 1) {
        // Submenu items move among their siblings only.
        const j = i + d;
        if (j < 0 || j >= r.length || r[j].depth !== 1) return r;
        const next = [...r];
        [next[i], next[j]] = [next[j], next[i]];
        return next;
      }
      // A top-level item moves with its submenu, past the neighbouring item and its submenu.
      const [a, b] = blockRange(r, i);
      if (d === -1) {
        let p = a - 1;
        while (p > 0 && r[p].depth === 1) p--;
        if (p < 0) return r;
        return [...r.slice(0, p), ...r.slice(a, b), ...r.slice(p, a), ...r.slice(b)];
      }
      if (b >= r.length) return r;
      const [, nb] = blockRange(r, b);
      return [...r.slice(0, a), ...r.slice(b, nb), ...r.slice(a, b), ...r.slice(nb)];
    });

  // Deleting a parent keeps its submenu items, as top-level items.
  const remove = (id: number) =>
    setRows((r) => {
      const i = r.findIndex((x) => x.id === id);
      const [, b] = r[i].depth === 0 ? blockRange(r, i) : [i, i + 1];
      return [...r.slice(0, i), ...r.slice(i + 1, b).map((x) => ({ ...x, depth: 0 })), ...r.slice(b)];
    });

  const add = (item: MenuItem = { label: "", href: "" }) => setRows((r) => [...r, ...withIds([{ ...item, depth: 0 }])]);
  const isParent = (i: number) => rows[i].depth === 0 && rows[i + 1]?.depth === 1;
  const canGoUp = (i: number) => (rows[i].depth === 1 ? rows[i - 1]?.depth === 1 : rows.slice(0, i).some((x) => x.depth === 0));
  const canGoDown = (i: number) => (rows[i].depth === 1 ? rows[i + 1]?.depth === 1 : blockRange(rows, i)[1] < rows.length);

  return (
    <div className="a-menu-editor">
      <input type="hidden" name="items" value={JSON.stringify(rows.map(({ label, href, depth }) => ({ label, href, depth })))} />
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
          <li key={row.id} className={`a-menu-row ${row.depth ? "is-sub" : ""}`}>
            <span className="a-menu-num">{row.depth ? "↲" : (rows.slice(0, i + 1).filter((x) => x.depth === 0).length).toLocaleString("fa-IR")}</span>
            <input aria-label="عنوان" placeholder={row.depth ? "عنوان زیرمنو" : "عنوان، مثلاً اخبار"} value={row.label} maxLength={40} onChange={(e) => set(row.id, { label: e.target.value })} />
            <input
              aria-label="آدرس"
              placeholder={isParent(i) ? "اختیاری برای گزینه‌ی دارای زیرمنو" : "/category/news/ یا https://..."}
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
              {nested && (
                <button
                  type="button"
                  className={`a-icon-btn a-sub-btn ${row.depth ? "is-on" : ""}`}
                  aria-pressed={row.depth === 1}
                  title={row.depth ? "بیرون آوردن از زیرمنو" : "زیرمنوی گزینه‌ی بالایی شود"}
                  // The first item, and an item that has its own submenu, can't become a submenu item.
                  disabled={!row.depth && (i === 0 || isParent(i))}
                  onClick={() => set(row.id, { depth: row.depth ? 0 : 1 })}
                >
                  زیرمنو
                </button>
              )}
              <button type="button" className="a-icon-btn" aria-label="بالا" title="بالا" disabled={!canGoUp(i)} onClick={() => move(i, -1)}>
                ↑
              </button>
              <button type="button" className="a-icon-btn" aria-label="پایین" title="پایین" disabled={!canGoDown(i)} onClick={() => move(i, 1)}>
                ↓
              </button>
              <button type="button" className="a-icon-btn is-danger" aria-label={`حذف ${row.label}`} title={isParent(i) ? "حذف (زیرمنوهایش به منوی اصلی برمی‌گردند)" : "حذف"} onClick={() => remove(row.id)}>
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
