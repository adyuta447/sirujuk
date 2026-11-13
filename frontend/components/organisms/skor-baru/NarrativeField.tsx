export function NarrativeField() {
  return (
    <div>
      <label htmlFor="clinical_narrative" className="block text-sm font-bold text-[#0E1B2A] mb-1.5">
        Narasi klinis <span className="font-normal text-[#56657A]">(boleh dikosongkan)</span>
      </label>
      <textarea
        id="clinical_narrative"
        name="clinical_narrative"
        maxLength={4000}
        autoComplete="off"
        className="w-full h-36 px-4 py-3 text-base bg-white border border-[#DCE3EC] rounded-4xl resize-none focus:outline-none focus:border-[#1E3A5F]"
      />
    </div>
  );
}
