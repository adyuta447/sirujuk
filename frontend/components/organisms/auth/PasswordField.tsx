"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { AUTH_INPUT_CLASS } from "../../../lib/ui-classes";

export function PasswordField() {
  const [lihat, setLihat] = useState(false);
  const ToggleIcon = lihat ? EyeOff : Eye;

  return (
    <div>
      <label htmlFor="sandi" className="block text-sm font-bold text-[#0E1B2A] mb-1.5">Kata sandi</label>
      <div className="relative">
        <input
          id="sandi"
          name="sandi"
          type={lihat ? "text" : "password"}
          autoComplete="current-password"
          className={`${AUTH_INPUT_CLASS} pr-14`}
        />
        <button
          type="button"
          onClick={() => setLihat(!lihat)}
          aria-label={lihat ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-[#56657A]"
        >
          <ToggleIcon aria-hidden="true" size={20} />
        </button>
      </div>
    </div>
  );
}
