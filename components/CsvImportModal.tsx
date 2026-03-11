"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, CheckCircle, AlertCircle, Download } from "lucide-react";

interface Props {
  type: "companies" | "contacts";
  onClose: () => void;
}

const TEMPLATES = {
  companies: {
    filename: "companies-template.csv",
    headers: "Name,Address,City,State,Zip,Phone,Website,Industry,Employee Count,Notes",
    example:  "Acme HVAC,123 Main St,Gainesville,GA,30501,(770) 555-0100,https://acmehvac.com,HVAC,5,",
    columns: ["Name *", "Address", "City", "State", "Zip", "Phone", "Website", "Industry", "Employee Count", "Notes"],
    note: "Duplicates (same name) are skipped.",
  },
  contacts: {
    filename: "contacts-template.csv",
    headers: "First Name,Last Name,Title,Email,Phone,LinkedIn,Company Name,Notes",
    example:  "John,Smith,Owner,john@acmehvac.com,(770) 555-0101,https://linkedin.com/in/johnsmith,Acme HVAC,",
    columns: ["First Name", "Last Name", "Title", "Email", "Phone", "LinkedIn", "Company Name *", "Notes"],
    note: 'Company Name is used to link the contact. If the company doesn\'t exist it will be created automatically. Duplicates (same email + company) are skipped.',
  },
};

interface Result { created: number; skipped: number; errors: string[] }

export default function CsvImportModal({ type, onClose }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  const tmpl = TEMPLATES[type];

  function downloadTemplate() {
    const csv = `${tmpl.headers}\n${tmpl.example}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = tmpl.filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`/api/${type}/import`, { method: "POST", body: formData });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Import failed");
      setImporting(false);
      return;
    }

    setResult(data);
    setImporting(false);
    router.refresh();
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] border border-zinc-700 rounded-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="font-semibold text-white">
            Import {type === "companies" ? "Companies" : "Contacts"} from CSV
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {result ? (
            /* Results view */
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-900/20 border border-green-800/40 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-400">{result.created}</div>
                  <div className="text-xs text-zinc-400 mt-1">Created</div>
                </div>
                <div className="bg-zinc-800 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-zinc-300">{result.skipped}</div>
                  <div className="text-xs text-zinc-400 mt-1">Skipped (duplicates)</div>
                </div>
              </div>
              {result.errors.length > 0 && (
                <div className="bg-red-900/20 border border-red-800/40 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-red-400 text-sm font-medium mb-2">
                    <AlertCircle className="w-4 h-4" />
                    {result.errors.length} error{result.errors.length !== 1 ? "s" : ""}
                  </div>
                  <ul className="text-xs text-red-300/80 space-y-1">
                    {result.errors.slice(0, 5).map((e, i) => <li key={i}>• {e}</li>)}
                    {result.errors.length > 5 && <li className="text-zinc-500">…and {result.errors.length - 5} more</li>}
                  </ul>
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setResult(null); setFile(null); }}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  Import Another
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Template download */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white mb-1">Expected columns</p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {tmpl.columns.map((col) => (
                        <span key={col} className={`text-xs px-1.5 py-0.5 rounded ${col.endsWith("*") ? "bg-blue-600/20 text-blue-400" : "bg-zinc-800 text-zinc-400"}`}>
                          {col}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-zinc-500">{tmpl.note}</p>
                  </div>
                  <button
                    onClick={downloadTemplate}
                    className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors flex-shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Template
                  </button>
                </div>
              </div>

              {/* File picker */}
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError(""); }}
                />
                {file ? (
                  <div className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-700 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-sm text-white flex-1 truncate">{file.name}</span>
                    <button onClick={() => setFile(null)} className="text-zinc-500 hover:text-white transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-full border-2 border-dashed border-zinc-700 hover:border-zinc-500 rounded-lg p-8 text-center transition-colors group"
                  >
                    <Upload className="w-6 h-6 text-zinc-600 group-hover:text-zinc-400 mx-auto mb-2 transition-colors" />
                    <p className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">Click to select a CSV file</p>
                    <p className="text-xs text-zinc-600 mt-1">or drag and drop</p>
                  </button>
                )}
              </div>

              {error && (
                <p className="text-sm text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={!file || importing}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {importing ? "Importing..." : "Import"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
