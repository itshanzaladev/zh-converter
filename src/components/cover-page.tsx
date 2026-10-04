import { coverRows } from "@/lib/assignment";
import { coverSpec, coverTitle } from "@/lib/cover-styles";
import type { CoverDetails } from "@/lib/types";

/** Fills empty fields with placeholders so a half-filled cover still previews its layout. */
export function withPlaceholders(cover: CoverDetails): CoverDetails {
  return {
    ...cover,
    university: cover.university || "University",
    campus: cover.campus || "Campus",
    assignment: cover.assignment || "Assignment #",
    subject: cover.subject || "Subject",
    name: cover.name || "—",
    regNo: cover.regNo || "—",
    section: cover.section || "—",
    instructor: cover.instructor || "—",
    date: cover.date || "—",
  };
}

const BORDER = {
  none: "",
  single: "border border-black",
  double: "border-[3px] border-double border-black",
  thick: "border-[3px] border-black",
};

/**
 * A miniature of the cover page, laid out like the Word and PDF cover: all
 * centred, logo on top, in the cover's style. Drawn for a 260px-wide box;
 * scale it with CSS for anything smaller.
 */
export function CoverPage({ cover }: { cover: CoverDetails }) {
  const spec = coverSpec(cover);
  const title = coverTitle(cover);
  const rows = coverRows(cover);

  return (
    <div className="aspect-[1/1.414] w-[260px] bg-white p-3 font-[Arial,Helvetica,sans-serif] text-black">
      <div className={`flex h-full flex-col items-center px-3 pt-4 text-center ${BORDER[spec.border]}`}>
        {cover.logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover.logo} alt="" className="mx-auto h-14 w-14 object-contain" />
        )}
        {(!cover.logo || spec.universityLine) && (
          <div className={`flex flex-col justify-center ${cover.logo ? "mt-1.5" : "h-14"}`}>
            <div className="text-[8px] font-bold uppercase">{cover.university}</div>
            <div className="text-[6.5px] font-bold">{cover.campus}</div>
          </div>
        )}
        <div className="mt-3 text-[11px] font-bold leading-tight">{title.big}</div>
        <div className="text-[6.5px] font-bold">{title.small}</div>
        {spec.divider && <div className="mt-3 h-px w-16 bg-black" />}

        {spec.details === "table" ? (
          <table className="mt-[14%] w-[88%] border-y border-[#bfbfbf] text-left text-[7px]">
            <tbody>
              {rows.map(([label, value]) => (
                <tr key={label} className="border-b border-[#bfbfbf] last:border-b-0">
                  <th className="py-[3px] pl-1 font-bold">{label}</th>
                  <td className="py-[3px] pr-1">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <dl className={`${spec.divider ? "mt-[14%]" : "mt-[22%]"} space-y-[3px] text-[8.5px] leading-tight`}>
            {rows.map(([label, value]) => (
              <div key={label}>
                <dt className="inline font-bold">{label}: </dt>
                <dd className="inline">{value}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="mt-auto pb-0.5 text-[5px] text-[#9a8a8e]">1</div>
      </div>
    </div>
  );
}
