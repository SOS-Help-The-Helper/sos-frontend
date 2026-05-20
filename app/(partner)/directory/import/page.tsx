"use client";
import Link from "next/link";
import { useState, useRef } from "react";
import { ChevronLeft, UploadCloud, FileSpreadsheet, Check, AlertCircle, HelpCircle, ChevronDown, X, Sparkles } from "lucide-react";
import { CrmShell } from "@/components/crm-shell";


const SOS_FIELDS = ["— Skip —", "Name", "Email", "Phone", "Org", "Role", "County", "Skills", "Credentials", "Housing Status"];

type Stage = "upload" | "mapping" | "importing" | "done";

const SAMPLE_HEADERS: { header: string; sample: string; suggested: string; conf: "high" | "med" | "low" }[] = [
  { header: "full_name", sample: "Maria Rodriguez", suggested: "Name", conf: "high" },
  { header: "email_addr", sample: "m.rodriguez@…", suggested: "Email", conf: "high" },
  { header: "mobile", sample: "(828) 555-1234", suggested: "Phone", conf: "high" },
  { header: "organization", sample: "Emergency RV", suggested: "Org", conf: "high" },
  { header: "title", sample: "Housing Coordinator", suggested: "Role", conf: "med" },
  { header: "loc_county", sample: "Buncombe", suggested: "County", conf: "high" },
  { header: "tags", sample: "first-aid, spanish", suggested: "Skills", conf: "med" },
  { header: "notes", sample: "Bilingual lead", suggested: "— Skip —", conf: "low" },
];

export default function ImportPage() {
  const [stage, setStage] = useState<Stage>("upload");
  const [file, setFile] = useState<{ name: string; rows: number; size: string } | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>(
    Object.fromEntries(SAMPLE_HEADERS.map((h) => [h.header, h.suggested]))
  );
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [errorsOpen, setErrorsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File) {
    setFile({ name: f.name, rows: 52, size: `${(f.size / 1024).toFixed(1)} KB` });
    setStage("mapping");
  }

  function startImport() {
    setStage("importing");
    setProgress(0);
    const t = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(t); setStage("done"); return 100; }
        return p + 8;
      });
    }, 180);
  }

  return (
    <CrmShell module="Directory">
      <div className="min-h-screen text-white">
        <header className="sticky top-0 z-30 glass border-b border-[var(--hairline)]">
          <div className="max-w-[800px] mx-auto px-5 md:px-10 h-12 flex items-center">
            <Link to="/directory" className="inline-flex items-center gap-1 text-[15px] text-[#89CFF0] -ml-1.5">
              <ChevronLeft size={20} />
              <span>Directory</span>
            </Link>
          </div>
        </header>

        <main className="max-w-[800px] mx-auto px-5 md:px-10 py-6 md:py-10">
          <div className="mb-6">
            <h1 className="text-[26px] md:text-[32px] font-semibold tracking-tight">Import contacts</h1>
            <p className="text-[14px] text-white/55 mt-1">Upload a CSV. We'll map columns for you.</p>
          </div>

          {stage === "upload" && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault(); setDragging(false);
                const f = e.dataTransfer.files?.[0]; if (f) handleFile(f);
              }}
              onClick={() => inputRef.current?.click()}
              className={`rounded-2xl border border-dashed p-10 md:p-14 text-center cursor-pointer transition ${
                dragging ? "border-[#89CFF0] bg-[#89CFF0]/5" : "border-white/15 bg-[var(--surface-1)] hover:border-white/30"
              }`}
            >
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#89CFF0]/12 flex items-center justify-center mb-4">
                <UploadCloud size={26} className="text-[#89CFF0]" strokeWidth={1.75} />
              </div>
              <h3 className="text-[17px] font-semibold">Drop CSV here</h3>
              <p className="text-[13px] text-white/55 mt-1">or click to browse · max 10 MB</p>
              <button
                onClick={(e) => { e.stopPropagation(); handleFile(new File(["x"], "contacts_helene.csv", { type: "text/csv" })); }}
                className="mt-6 px-5 h-10 rounded-full bg-[#EF4E4B] hover:bg-[#d94340] text-[14px] font-medium transition"
              >
                Try sample file
              </button>
              <input ref={inputRef} type="file" accept=".csv" hidden onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>
          )}

          {stage !== "upload" && file && (
            <>
              <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#89CFF0]/12 flex items-center justify-center text-[#89CFF0]">
                  <FileSpreadsheet size={18} strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[14px] truncate">{file.name}</p>
                  <p className="text-[12px] text-white/45">{file.rows} rows · {file.size}</p>
                </div>
                {stage === "mapping" && (
                  <button onClick={() => { setStage("upload"); setFile(null); }} className="w-8 h-8 rounded-full hover:bg-white/8 flex items-center justify-center text-white/45">
                    <X size={15} />
                  </button>
                )}
              </div>

              {stage === "mapping" && (
                <>
                  <div className="mt-5 flex items-center gap-2 text-[13px] text-[#89CFF0]">
                    <Sparkles size={14} />
                    <span>AI mapped your columns — review and confirm</span>
                  </div>

                  <div className="mt-3 rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] overflow-hidden divide-y divide-[var(--hairline)]">
                    {SAMPLE_HEADERS.map((h) => (
                      <div key={h.header} className="px-4 py-3.5 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[14px] truncate">{h.header}</p>
                          <p className="text-[12px] text-white/45 truncate">{h.sample}</p>
                        </div>
                        <span className="text-white/25">→</span>
                        <div className="relative w-[150px] sm:w-[180px]">
                          <select
                            value={mapping[h.header]}
                            onChange={(e) => setMapping({ ...mapping, [h.header]: e.target.value })}
                            className="w-full appearance-none bg-white/6 hover:bg-white/10 rounded-lg pl-3 pr-8 h-9 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#89CFF0]/40 transition"
                          >
                            {SOS_FIELDS.map((f) => <option key={f} value={f} className="bg-[#1A3850]">{f}</option>)}
                          </select>
                          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                        </div>
                        <ConfIcon conf={h.conf} />
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex items-center justify-between gap-3">
                    <Link to="/directory" className="text-[14px] text-white/55 hover:text-white">Cancel</Link>
                    <button
                      onClick={startImport}
                      className="flex-1 sm:flex-none px-6 h-11 rounded-full bg-[#EF4E4B] text-white font-medium hover:bg-[#d94340] transition text-[14px]"
                    >
                      Import {file.rows} contacts
                    </button>
                  </div>
                </>
              )}

              {stage === "importing" && (
                <div className="mt-6 rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-8 text-center">
                  <p className="text-[14px] text-white/70 mb-4">Importing {file.rows} contacts…</p>
                  <div className="h-1.5 rounded-full bg-white/6 overflow-hidden max-w-sm mx-auto">
                    <div className="h-full rounded-full bg-[#EF4E4B] transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-[12px] text-white/40 mt-3 tabular-nums">{progress}%</p>
                </div>
              )}

              {stage === "done" && (
                <div className="mt-6 rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-[#34D399]/15 flex items-center justify-center text-[#34D399]">
                      <Check size={20} strokeWidth={2.25} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[16px]">Import complete</h3>
                      <p className="text-[13px] text-white/55">47 imported · 3 skipped · 2 errors</p>
                    </div>
                  </div>
                  <div className="mt-4 border-t border-[var(--hairline)] pt-4">
                    <button onClick={() => setErrorsOpen(!errorsOpen)} className="text-[13px] flex items-center gap-2 text-[#EF4E4B] font-medium">
                      <AlertCircle size={14} /> View 2 errors
                      <ChevronDown size={14} className={`transition ${errorsOpen ? "rotate-180" : ""}`} />
                    </button>
                    {errorsOpen && (
                      <ul className="mt-3 space-y-2 text-[12px] text-white/60">
                        <li className="px-3 py-2 rounded-lg bg-[#EF4E4B]/10">Row 14 — invalid email "tjones@@gmail"</li>
                        <li className="px-3 py-2 rounded-lg bg-[#EF4E4B]/10">Row 38 — missing required field "Name"</li>
                      </ul>
                    )}
                  </div>
                  <div className="mt-6 flex flex-col sm:flex-row gap-2">
                    <Link to="/directory" className="px-5 h-11 rounded-full bg-[#89CFF0] text-[#0F1E2B] font-medium hover:bg-[#9bd5f2] inline-flex items-center justify-center text-[14px]">
                      View directory
                    </Link>
                    <button onClick={() => { setStage("upload"); setFile(null); setProgress(0); }} className="px-5 h-11 rounded-full bg-white/8 text-white hover:bg-white/12 text-[14px] font-medium">
                      Import another
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="mt-10 text-center">
            <button className="text-[13px] text-[#89CFF0] hover:underline">Export current directory →</button>
          </div>
        </main>
      </div>
    </CrmShell>
  );
}

function ConfIcon({ conf }: { conf: "high" | "med" | "low" }) {
  if (conf === "high") return <Check size={16} className="text-[#34D399]" />;
  if (conf === "med") return <HelpCircle size={16} className="text-[#F5EBD6]" />;
  return <X size={16} className="text-[#EF4E4B]" />;
}
