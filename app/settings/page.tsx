"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import RecipientSelect from "@/components/RecipientSelect";
import { useMyStaff } from "@/components/useMyStaff";
import {
  GENDER_LABEL,
  resolveRole,
  staffBoard,
  type Gender,
  type RoleInfo,
} from "@/lib/staff";

type Person = {
  name: string;
  role: string;
  gender?: Gender;
};

export default function SettingsPage() {
  const { name, role, ready, save, saveRole } = useMyStaff();
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftRole, setDraftRole] = useState("");
  const [draftGender, setDraftGender] = useState<Gender | "">("");
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState("");
  const [pendingRemove, setPendingRemove] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/people", { cache: "no-store" });
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as { roles?: RoleInfo[]; people?: Person[] };
      if (cancelled) return;
      setRoles(data.roles ?? []);
      setPeople(data.people ?? []);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const picked = resolveRole(roles, draftRole);
  const needsGender = picked?.id === "staff";
  const floor = staffBoard(
    people.flatMap((person) =>
      person.role === "staff" && (person.gender === "f" || person.gender === "m")
        ? [{ name: person.name, gender: person.gender }]
        : [],
    ),
    [],
  );
  const others = people
    .filter((person) => person.role === role)
    .sort((a, b) => a.name.localeCompare(b.name, "th"));

  async function addPerson(event: FormEvent) {
    event.preventDefault();
    setAddError("");
    setSaving(true);
    try {
      const res = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draftName,
          role: draftRole,
          gender: needsGender ? draftGender : undefined,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        roles?: RoleInfo[];
        people?: Person[];
      };
      if (!res.ok) {
        setAddError(data.error || "เพิ่มชื่อไม่สำเร็จ");
        return;
      }
      setRoles(data.roles ?? []);
      setPeople(data.people ?? []);
      if (picked) saveRole(picked.id);
      setDraftName("");
      setDraftGender("");
    } catch {
      setAddError("เพิ่มชื่อไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function removePerson(personName: string) {
    setAddError("");
    setPendingRemove("");
    try {
      const res = await fetch(`/api/people?name=${encodeURIComponent(personName)}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as {
        error?: string;
        roles?: RoleInfo[];
        people?: Person[];
      };
      if (!res.ok) {
        setAddError(data.error || "เอาชื่อออกไม่สำเร็จ");
        return;
      }
      setRoles(data.roles ?? []);
      setPeople(data.people ?? []);
      if (name === personName) save("");
      if (!(data.roles ?? []).some((item) => item.id === role)) saveRole("staff");
    } catch {
      setAddError("เอาชื่อออกไม่สำเร็จ");
    }
  }

  function personRow(personName: string) {
    return (
      <li key={personName} className="person-row">
        <button
          type="button"
          className={personName === name ? "staff-chip is-picked" : "staff-chip"}
          aria-pressed={personName === name}
          onClick={() => save(personName)}
        >
          {personName}
        </button>
        {pendingRemove === personName ? (
          <span className="person-confirm">
            <button type="button" onClick={() => void removePerson(personName)}>
              เอาออก
            </button>
            <button type="button" onClick={() => setPendingRemove("")}>
              ไม่
            </button>
          </span>
        ) : (
          <button
            type="button"
            className="person-remove"
            aria-label={`เอา ${personName} ออก`}
            onClick={() => setPendingRemove(personName)}
          >
            ×
          </button>
        )}
      </li>
    );
  }

  return (
    <div className="pos-shell orders-shell">
      <header className="pos-header">
        <img
          className="brand-logo"
          src="/ravencool-whisper-haven-logo.png"
          alt="Ravencool Warmwhisper Haven"
          width={1774}
          height={887}
        />
        <div className="pos-header-bar">
          <h1 className="pos-title">ตั้งค่า</h1>
          <div className="header-actions">
            <Link className="btn btn-secondary" href="/orders">
              ออเดอร์
            </Link>
            <Link className="btn btn-secondary" href="/">
              หน้าขาย
            </Link>
          </div>
        </div>
      </header>

      <section className="sales-log" aria-label="เลือกชื่อพนักงาน">
        <div className="sales-log-head">
          <div>
            <p className="sales-day-panel-kicker">
              {roles.find((item) => item.id === role)?.label ?? "บทบาท"}
            </p>
            <h2 className="menu-set-title">
              {ready && name ? name : "ยังไม่ได้เลือก"}
            </h2>
          </div>
          {role === "staff" && name ? (
            <Link className="btn btn-secondary" href="/orders">
              ดูออเดอร์
            </Link>
          ) : null}
        </div>
        <div className="settings-body">
          {!loaded ? (
            <p className="sales-empty">กำลังโหลด…</p>
          ) : (
            <div className="settings-layout">
              <div className="settings-people">
                <div className="role-pick" role="group" aria-label="บทบาท">
                  {roles.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={role === item.id ? "role-card is-on" : "role-card"}
                      aria-pressed={role === item.id}
                      onClick={() => {
                        saveRole(item.id);
                        setPendingRemove("");
                      }}
                    >
                      <span className="role-card-title">{item.label}</span>
                      <span className="role-card-hint">
                        {item.id === "staff"
                          ? "ตั้งสถานะและดูออเดอร์ของตัวเอง"
                          : item.id === "cashier"
                            ? "รับออเดอร์ที่หน้าขาย"
                            : `${people.filter((person) => person.role === item.id).length} คน`}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="orders-day">เลือกชื่อตัวเอง</p>
                {role === "staff" ? (
                  <div className="staff-groups">
                    {(["f", "m"] as Gender[]).map((gender) => (
                      <div key={gender} className="staff-group">
                        <p className="staff-group-title">{GENDER_LABEL[gender]}</p>
                        <ul className="staff-board-list">
                          {floor
                            .filter((member) => member.gender === gender)
                            .map((member) => personRow(member.name))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <ul className="staff-board-list">
                    {others.map((person) => personRow(person.name))}
                  </ul>
                )}
              </div>
              <form className="people-add" onSubmit={(event) => void addPerson(event)}>
                <p className="orders-day">เพิ่มชื่อ</p>
                <label className="name-field">
                  <span>ชื่อ</span>
                  <input
                    className="discount-input"
                    value={draftName}
                    maxLength={80}
                    placeholder="ชื่อคน"
                    onChange={(event) => setDraftName(event.target.value)}
                  />
                </label>
                <label className="name-field">
                  <span>บทบาท</span>
                  <RecipientSelect
                    value={draftRole}
                    names={roles.map((item) => item.label)}
                    placeholder="ค้นหาหรือพิมพ์บทบาทใหม่"
                    clearLabel="ลบบทบาท"
                    allowCustom
                    onChange={(next) => {
                      setDraftRole(next);
                      setDraftGender("");
                    }}
                  />
                </label>
                {needsGender ? (
                  <div className="people-gender" role="group" aria-label="เพศ">
                    {(["f", "m"] as Gender[]).map((gender) => (
                      <button
                        key={gender}
                        type="button"
                        className={
                          draftGender === gender
                            ? "discount-type is-active"
                            : "discount-type"
                        }
                        aria-pressed={draftGender === gender}
                        onClick={() => setDraftGender(gender)}
                      >
                        {GENDER_LABEL[gender]}
                      </button>
                    ))}
                  </div>
                ) : null}
                {addError ? <p className="pos-error">{addError}</p> : null}
                <button
                  className="btn"
                  type="submit"
                  disabled={
                    saving ||
                    !draftName.trim() ||
                    !draftRole.trim() ||
                    (needsGender && !draftGender)
                  }
                >
                  เพิ่ม
                </button>
              </form>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
