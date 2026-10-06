"use client";

import Link from "next/link";
import { useMyStaff } from "@/components/useMyStaff";
import { GENDER_LABEL, ROLE_LABEL, STAFF_ROSTER, type Gender } from "@/lib/staff";

export default function SettingsPage() {
  const { name, role, ready, save, saveRole } = useMyStaff();

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
            {role === "cashier" ? null : (
              <p className="sales-day-panel-kicker">
                {ready ? ROLE_LABEL[role] : "บทบาท"}
              </p>
            )}
            <h2 className="menu-set-title">
              {role === "cashier"
                ? ROLE_LABEL.cashier
                : ready && name
                  ? name
                  : "ยังไม่ได้เลือก"}
            </h2>
          </div>
          {role === "staff" && name ? (
            <Link className="btn btn-secondary" href="/orders">
              ดูออเดอร์
            </Link>
          ) : null}
        </div>
        <div className="settings-body">
        <div className="role-pick" role="group" aria-label="บทบาท">
          {(
            [
              ["staff", "ตั้งสถานะและดูออเดอร์ของตัวเอง"],
              ["cashier", "รับออเดอร์ที่หน้าขาย"],
            ] as const
          ).map(([value, hint]) => (
            <button
              key={value}
              type="button"
              className={role === value ? "role-card is-on" : "role-card"}
              aria-pressed={role === value}
              onClick={() => saveRole(value)}
            >
              <span className="role-card-title">{ROLE_LABEL[value]}</span>
              <span className="role-card-hint">{hint}</span>
            </button>
          ))}
        </div>
        {role === "staff" ? (
          <>
            <p className="orders-day">เลือกชื่อตัวเอง</p>
            <div className="staff-groups">
              {(["f", "m"] as Gender[]).map((gender) => (
                <div key={gender} className="staff-group">
                  <p className="staff-group-title">{GENDER_LABEL[gender]}</p>
                  <ul className="staff-board-list">
                    {STAFF_ROSTER.filter((member) => member.gender === gender).map(
                      (member) => (
                        <li key={member.name}>
                          <button
                            type="button"
                            className={
                              member.name === name
                                ? "staff-chip is-picked"
                                : "staff-chip"
                            }
                            aria-pressed={member.name === name}
                            onClick={() => save(member.name)}
                          >
                            {member.name}
                          </button>
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </>
        ) : null}
        </div>
      </section>
    </div>
  );
}
