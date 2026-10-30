import { DEMO } from "../../../data/demo-roles";

interface DemoAccessProps {
  disabled: boolean;
  onPilih: (peran: string) => void;
}

export function DemoAccess({ disabled, onPilih }: DemoAccessProps) {
  return (
    <section aria-labelledby="judul-demo" className="mt-8">
      <h2 id="judul-demo" className="text-xl font-extrabold tracking-tight">Coba tanpa akun</h2>
      <p className="text-sm text-[#56657A] mt-1">
        Pilih peran, langsung masuk. Datanya contoh dan tidak memuat pasien sungguhan.
      </p>
      <div className="grid sm:grid-cols-2 gap-3 mt-4">
        {DEMO.map((d) => (
          <button
            key={d.peran}
            type="button"
            disabled={disabled}
            onClick={() => onPilih(d.peran)}
            className="text-left rounded-4xl border border-[#DCE3EC] bg-white p-4 min-h-20 hover:border-[#1E3A5F] transition-colors disabled:cursor-not-allowed"
          >
            <span className="block font-extrabold tracking-tight text-[#0E1B2A]">{d.judul}</span>
            <span className="block text-xs text-[#56657A] mt-0.5">{d.isi}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
