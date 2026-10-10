"use client";
import { useState } from "react";
import { Archive, Pencil, RefreshCw } from "lucide-react";
import { PrimaryButton } from "../atoms/PrimaryButton";
import { useReferralMutations } from "../../hooks/useReferralMutations";
import { useSession } from "../../hooks/useSession";
import { validateReferral } from "../../lib/validate";
import type { RujukanCase } from "../../lib/sirujuk-data";

const field = "w-full px-4 py-2.5 text-sm bg-white border border-[#DCE3EC] rounded-4xl focus:outline-none focus:border-[#1E3A5F]";
const secondary = "min-h-11 px-4 py-2 border border-[#DCE3EC] bg-white text-[#1E3A5F] font-semibold rounded-4xl hover:bg-[#F8FAFC] disabled:opacity-50 inline-flex items-center gap-2 text-sm";

type Mode = "idle" | "edit" | "arsip";

/** Hitung ulang, ubah, dan arsipkan rujukan. Semua skor tetap dihitung ML di backend; arsip hanya TKMKB. */
export const ReferralActions = ({ kasus, onArchived }: { kasus: RujukanCase; onArchived: () => void }) => {
  const { data: sesi } = useSession();
  const { update, rescore, archive } = useReferralMutations();
  const [mode, setMode] = useState<Mode>("idle");
  const [diagnosis, setDiagnosis] = useState(kasus.diagnosa);
  const [alasan, setAlasan] = useState(kasus.alasanRujukan ?? "");
  const [narasi, setNarasi] = useState(kasus.narasi ?? "");
  const [catatan, setCatatan] = useState("");
  const [galat, setGalat] = useState<string | null>(null);

  const bisaArsip = sesi?.role === "tkmkb";
  // Kasus merah hanya boleh diubah TKMKB (server menolak 403 FORBIDDEN_LEVEL untuk verifikator).
  const bisaUbah = !(kasus.risk === "tinggi" && sesi?.role === "verifikator");
  const pesanGagal = (update.error ?? rescore.error ?? archive.error)?.message;
  const sibuk = update.isPending || rescore.isPending || archive.isPending;
  const gagal = update.isError || rescore.isError || archive.isError;

  const simpan = () => {
    const edit = {
      doctor_id: kasus.dokter,
      origin_facility_id: kasus.fasalOrigin,
      destination_facility_id: kasus.fasalTujuan,
      diagnosis_code: diagnosis.trim(),
      reason: alasan.trim(),
      clinical_narrative: narasi.trim(),
    };
    const salah = validateReferral({ referral_no: kasus.id, ...edit });
    setGalat(salah);
    if (!salah) update.mutate({ id: kasus.id, edit }, { onSuccess: () => setMode("idle") });
  };

  const arsipkan = () => {
    if (!catatan.trim()) return setGalat("Alasan pengarsipan wajib diisi.");
    setGalat(null);
    archive.mutate({ id: kasus.id, note: catatan.trim() }, { onSuccess: onArchived });
  };

  return (
    <section aria-label="Aksi rujukan" className="bg-white rounded-4xl border border-[#DCE3EC] p-5 space-y-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={sibuk} onClick={() => rescore.mutate(kasus.id)} className={secondary}>
          <RefreshCw aria-hidden="true" size={16} /> Hitung ulang (ML)
        </button>
        {bisaUbah && (
          <button type="button" disabled={sibuk} onClick={() => setMode(mode === "edit" ? "idle" : "edit")} className={secondary}>
            <Pencil aria-hidden="true" size={16} /> Ubah data
          </button>
        )}
        {bisaArsip && (
          <button type="button" disabled={sibuk} onClick={() => setMode(mode === "arsip" ? "idle" : "arsip")} className={secondary}>
            <Archive aria-hidden="true" size={16} /> Arsipkan
          </button>
        )}
      </div>

      {mode === "edit" && (
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-[#56657A]">Kode diagnosis
            <input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} maxLength={10} className={`${field} mt-1`} />
          </label>
          <label className="block text-xs font-semibold text-[#56657A]">Alasan rujukan
            <input value={alasan} onChange={(e) => setAlasan(e.target.value)} maxLength={200} className={`${field} mt-1`} />
          </label>
          <label className="block text-xs font-semibold text-[#56657A]">Narasi klinis
            <textarea value={narasi} onChange={(e) => setNarasi(e.target.value)} maxLength={4000} className={`${field} mt-1 h-32 resize-none`} />
          </label>
          <PrimaryButton onClick={simpan} disabled={sibuk} className="px-5 py-3">Simpan dan hitung ulang</PrimaryButton>
        </div>
      )}

      {mode === "arsip" && (
        <div className="space-y-3">
          <p className="text-xs text-[#56657A]">Rujukan disembunyikan dari daftar. Skor dan riwayat audit tetap tersimpan untuk banding.</p>
          <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} maxLength={2000} placeholder="Alasan pengarsipan"
            aria-label="Alasan pengarsipan" className={`${field} h-24 resize-none`} />
          <PrimaryButton onClick={arsipkan} disabled={sibuk} className="px-5 py-3">Arsipkan rujukan</PrimaryButton>
        </div>
      )}

      {galat && <p role="alert" className="text-xs text-[#9B1C1C]">{galat}</p>}
      {gagal && <p role="alert" className="text-xs text-[#9B1C1C]">{pesanGagal ?? "Aksi gagal."} Data tidak berubah.</p>}
      {(update.isSuccess || rescore.isSuccess) && !gagal && <p role="status" className="text-xs text-[#146134]">Skor diperbarui oleh ML.</p>}
    </section>
  );
};
