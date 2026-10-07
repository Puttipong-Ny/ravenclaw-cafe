"use client";

import { useMemo, useState } from "react";
import { STAFF } from "@/lib/staff";

type Props = {
  value: string;
  onChange: (name: string) => void;
  names?: readonly string[];
  freeNames?: ReadonlySet<string>;
  clearLabel?: string;
  placeholder?: string;
  /** Keep text that is not already in the list, so a new role can be typed. */
  allowCustom?: boolean;
  dropUp?: boolean;
};

export default function RecipientSelect({
  value,
  onChange,
  names = STAFF,
  freeNames,
  clearLabel = "ลบชื่อ",
  placeholder = "ค้นหาชื่อ",
  allowCustom = false,
  dropUp = false,
}: Props) {
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
      ? names.filter((name) => name.toLowerCase().includes(q))
      : [...names];
    if (!freeNames) return list;
    return list.sort((a, b) => Number(freeNames.has(b)) - Number(freeNames.has(a)));
  }, [query, names, freeNames]);

  const trimmed = query.trim();
  const exact = names.find((name) => name.toLowerCase() === trimmed.toLowerCase());
  const showCreate =
    allowCustom && trimmed.length > 0 && !exact && matches.length === 0;

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
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          if (!trimmed) {
            onChange("");
            setQuery("");
            return;
          }
          if (exact) {
            onChange(exact);
            setQuery(exact);
            return;
          }
          if (allowCustom) {
            onChange(trimmed);
            setQuery(trimmed);
            return;
          }
          setQuery(value);
        }}
      />
      {(query || value) && (
        <button
          type="button"
          className="recipient-clear"
          aria-label={clearLabel}
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
        <ul
          className={dropUp ? "recipient-list recipient-list--up" : "recipient-list"}
          role="listbox"
        >
          {matches.length === 0 && !showCreate ? (
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
                  {freeNames ? (
                    <span
                      className={
                        freeNames.has(name)
                          ? "recipient-dot is-free"
                          : "recipient-dot"
                      }
                      aria-hidden="true"
                    />
                  ) : null}
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
          {showCreate ? (
            <li>
              <button
                type="button"
                role="option"
                className="recipient-option"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(trimmed)}
              >
                <span className="recipient-name">เพิ่ม “{trimmed}”</span>
              </button>
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );
}
