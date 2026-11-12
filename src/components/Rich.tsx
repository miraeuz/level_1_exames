import { Fragment } from "react";

/** Renders **bold** segments (used for Excel formulas in question text). */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^]*?\*\*)(?=\s|$|[.,?])/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") && p.length > 4 ? (
          <code key={i} className="rounded-md bg-primary/10 px-1.5 py-0.5 font-mono font-semibold text-primary">
            {p.slice(2, -2)}
          </code>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

/** Spreadsheet-like table: first row = column letters, first column = row numbers. */
export function SheetTable({ rows }: { rows: string[][] }) {
  const [head, ...body] = rows;
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="border-collapse font-mono text-[0.95rem]">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i} className="min-w-[2.75rem] border border-border bg-surface2 px-3 py-1.5 text-center text-xs font-semibold text-muted">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className={`min-w-[3.5rem] border border-border px-3 py-1.5 ${j === 0 ? "bg-surface2 text-center text-xs font-semibold text-muted" : "bg-surface text-right"}`}>
                  {c || "\u00a0"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CodeBlock({ lines }: { lines: string[] }) {
  return <pre className="mt-4 overflow-x-auto rounded-xl border border-border bg-surface2 p-4 font-mono text-[0.9rem] leading-relaxed">{lines.join("\n")}</pre>;
}
