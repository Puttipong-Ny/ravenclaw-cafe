"use client";

import { useMemo, useState } from "react";
import { STAFF } from "@/lib/staff";

type Props = {
  value: string;
  onChange: (name: string) => void;
  freeNames?: ReadonlySet<string>;
};

export default function RecipientSelect({ value, onChange, freeNames }: Props) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    setQuery(value);
  }

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? STAFF.filter((name) => name.toLowerCase().includes(q))
      : [...STAFF];
    if (!freeNames) return list;
    return list.sort((a, b) => Number(freeNames.has(b)) - Number(freeNames.has(a)));
  }, [query, freeNames]);

  function pick(name: string) {
    onChange(name);
    setQuery(name);
    setOpen(false);
  }

  return (
    <div className="recipient">
      <input
        className="discount-input"
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder="ค้นหาชื่อ"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          const trimmed = query.trim();
          if (!trimmed) {
            onChange("");
            setQuery("");
            return;
          }
          const exact = STAFF.find(
            (name) => name.toLowerCase() === trimmed.toLowerCase(),
          );
          if (exact) {
            onChange(exact);
            setQuery(exact);
            return;
          }
          setQuery(value);
        }}
      />
      {(query || value) && (
        <button
          type="button"
          className="recipient-clear"
          aria-label="ลบชื่อพนักงาน"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onChange("");
            setQuery("");
            setOpen(false);
          }}
        >
          ×
        </button>
      )}
      {open && (
        <ul className="recipient-list" role="listbox">
          {matches.length === 0 ? (
            <li className="recipient-empty">ไม่พบชื่อ</li>
          ) : (
            matches.map((name) => (
              <li key={name}>
                <button
                  type="button"
                  role="option"
                  aria-selected={name === value}
                  className={
                    name === value
                      ? "recipient-option is-active"
                      : "recipient-option"
                  }
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(name)}
                >
                  <span
                    className={
                      freeNames?.has(name)
                        ? "recipient-dot is-free"
                        : "recipient-dot"
                    }
                    aria-hidden="true"
                  />
                  <span className="recipient-name">{name}</span>
                  {freeNames ? (
                    <span
                      className={
                        freeNames.has(name) ? "recipient-free" : "recipient-busy"
                      }
                    >
                      {freeNames.has(name) ? "ว่าง" : "ไม่ว่าง"}
                    </span>
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
