"use client";

import { useMemo, useState } from "react";

export const RECIPIENTS = [
  "Adelriana Fe Ferbulma",
  "Amin Ramirez",
  "Arloid Deeney",
  "Celine Cayla",
  "Dagnis De Valence",
  "Deimos Lolivan",
  "Eric Alaric Moonnox",
  "Gazelle Tataros Wayne",
  "Gemma Velestra Winterheart",
  "Jaymie Maccoille",
  "Kazuha Bloomfield",
  "Lim Shinyu",
  "LiYin Nina Rosendahl",
  "Mojiko Yellowtime",
  "Peach Grimoire",
  "Rachel Kaze",
  "Robert Raymond",
  "Seralynn Musetia",
  "Thames Aphroditemes",
  "Way Whal Wayne",
] as const;

type Props = {
  value: string;
  onChange: (name: string) => void;
};

export default function RecipientSelect({ value, onChange }: Props) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    setQuery(value);
  }

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...RECIPIENTS];
    return RECIPIENTS.filter((name) => name.toLowerCase().includes(q));
  }, [query]);

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
          const exact = RECIPIENTS.find(
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
          aria-label="ลบชื่อตัวเอง"
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
                  {name}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
