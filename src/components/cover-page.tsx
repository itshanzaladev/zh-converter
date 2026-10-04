export type CoverDetails = {
  university: string;
  campus: string;
  assignment: string;
  subject: string;
  name: string;
  regNo: string;
  section: string;
  instructor: string;
  date: string;
};

export const SAMPLE_COVER: CoverDetails = {
  university: "Your University",
  campus: "Main Campus",
  assignment: "Assignment #03",
  subject: "PF / ITCP",
  name: "Ayesha Khan",
  regNo: "FA24-BCS-012",
  section: "2A-BCS",
  instructor: "Dr. Mudassar Raza",
  date: "03-10-2026",
};

export type CoverStyle = "classic" | "framed" | "modern";

/** The uploaded university logo, or a seal placeholder until there is one. */
function Seal({ logo, size = "h-14 w-14" }: { logo?: string | null; size?: string }) {
  if (logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logo} alt="" className={`mx-auto ${size} object-contain`} />;
  }
  return (
    <div
      className={`mx-auto grid ${size} place-items-center rounded-full border-2 border-[#d9c7bd] text-[7px] font-semibold uppercase tracking-wider text-[#b39d92]`}
    >
      Logo
    </div>
  );
}

/** A miniature of the cover page, in the order students already hand in. */
export function CoverPage({
  style,
  details = SAMPLE_COVER,
  logo,
}: {
  style: CoverStyle;
  details?: CoverDetails;
  logo?: string | null;
}) {
  const rows: [string, string][] = [
    ["Name", details.name],
    ["Registration No", details.regNo],
    ["Section", details.section],
    ["Submitted To", details.instructor],
    ["Date", details.date],
  ];

  if (style === "modern") {
    return (
      <div className="flex aspect-[1/1.414] flex-col bg-white p-5 text-[#241a1e]">
        <div className="flex items-center gap-2">
          <div className="w-8">
            <Seal logo={logo} size="h-8 w-8" />
          </div>
          <div className="text-[8px] font-semibold uppercase tracking-wider">{details.university}</div>
        </div>
        <div className="mt-auto">
          <div className="h-1 w-8 bg-[#f5a07f]" />
          <div className="mt-2 font-display text-[17px] font-semibold leading-tight">{details.assignment}</div>
          <div className="text-[10px] text-[#74656a]">{details.subject}</div>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-[#f0ddd3] pt-3 text-[7px]">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt className="uppercase tracking-wider text-[#9a8a8e]">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }

  // Same layout as the Word and PDF cover: all centred, logo on top. An
  // assignment without a logo (logo === null) shows the university name instead.
  return (
    <div className="aspect-[1/1.414] bg-white p-3 font-[Arial,Helvetica,sans-serif] text-black">
      <div
        className={`flex h-full flex-col items-center px-3 pt-4 text-center ${
          style === "framed" ? "border-[3px] border-double border-[#241a1e]" : ""
        }`}
      >
        {logo === null ? (
          <div className="flex h-14 flex-col justify-center">
            <div className="text-[8px] font-bold uppercase">{details.university}</div>
            <div className="text-[6.5px] font-bold">{details.campus}</div>
          </div>
        ) : (
          <Seal logo={logo} size="h-14 w-14" />
        )}
        <div className="mt-3 text-[11px] font-bold leading-tight">{details.assignment}</div>
        <div className="text-[6.5px] font-bold">{details.subject}</div>
        <dl className="mt-[22%] space-y-[3px] text-[8.5px] leading-tight">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt className="inline font-bold">{label}: </dt>
              <dd className="inline">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-auto pb-0.5 text-[5px] text-[#9a8a8e]">1</div>
      </div>
    </div>
  );
}
