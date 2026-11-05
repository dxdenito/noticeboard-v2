import { useState, useRef } from "react";
import { Download, Upload, FileText, X } from "lucide-react";
import { api } from "../../api/client";
import { useToast } from "../../context/ToastContext";

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function IssueList({ title, tone, issues }) {
  const shown = issues.slice(0, 50);
  return (
    <div>
      <p className={`text-xs font-bold mb-1 ${tone}`}>{title}</p>
      <ul className="space-y-0.5">
        {shown.map((issue, index) => (
          <li key={index} className="text-xs text-gray-600">
            <span className="text-gray-400">Row {issue.line}:</span> {issue.message}
          </li>
        ))}
      </ul>
      {issues.length > shown.length && (
        <p className="text-xs text-gray-400 mt-1">and {issues.length - shown.length} more</p>
      )}
    </div>
  );
}

export default function CsvTools({
  exportPath, importPath, exportFilename, templateCsv, templateFilename, noun, onImported,
}) {
  const { showError, showSuccess } = useToast();
  const fileInputRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState(null);
  const [report, setReport] = useState(null);

  async function handleExport() {
    setExporting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}${exportPath}`, {
        credentials: "include",
      });
      if (!response.ok) {
        let message = "Export failed";
        try {
          const body = await response.json();
          if (typeof body.detail === "string") message = body.detail;
        } catch {
          message = "Export failed";
        }
        throw new Error(message);
      }
      downloadBlob(await response.blob(), exportFilename);
    } catch (err) {
      showError(err.message);
    } finally {
      setExporting(false);
    }
  }

  function handleTemplate() {
    downloadBlob(new Blob(["\ufeff" + templateCsv], { type: "text/csv" }), templateFilename);
  }

  async function sendFile(selected, dryRun) {
    const formData = new FormData();
    formData.append("file", selected);
    return api.post(`${importPath}?dry_run=${dryRun}`, formData);
  }

  async function handleFileChosen(e) {
    const selected = e.target.files[0];
    e.target.value = "";
    if (!selected) return;
    setBusy(true);
    try {
      const result = await sendFile(selected, true);
      setFile(selected);
      setReport(result);
    } catch (err) {
      showError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm() {
    setBusy(true);
    try {
      const result = await sendFile(file, false);
      showSuccess(`${result.created} ${noun}${result.created === 1 ? "" : "s"} imported`);
      closeReport();
      onImported();
    } catch (err) {
      showError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function closeReport() {
    setReport(null);
    setFile(null);
  }

  const buttonClass =
    "flex items-center gap-1.5 px-3 py-2 text-xs font-bold border border-gray-200 bg-white text-gray-700 rounded-lg hover:border-gray-300 disabled:opacity-50";

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={handleExport} disabled={exporting} className={buttonClass}>
          <Download size={14} /> {exporting ? "Exporting..." : "Export CSV"}
        </button>
        <button onClick={() => fileInputRef.current?.click()} disabled={busy} className={buttonClass}>
          <Upload size={14} /> {busy && !report ? "Checking..." : "Import CSV"}
        </button>
        <button onClick={handleTemplate} className={buttonClass}>
          <FileText size={14} /> Template
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChosen}
          className="hidden"
        />
      </div>

      {report && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between mb-1">
              <h3 className="font-bold text-lg">Review import</h3>
              <button onClick={closeReport} aria-label="Close" className="text-gray-400 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-4 truncate">{file?.name}</p>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="border border-gray-200 rounded-lg p-3 text-center">
                <p className="text-xl font-extrabold text-jkuat-green">{report.created}</p>
                <p className="text-[11px] text-gray-500">To add</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-3 text-center">
                <p className="text-xl font-extrabold text-gray-700">{report.skipped}</p>
                <p className="text-[11px] text-gray-500">Already exist</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-3 text-center">
                <p className={`text-xl font-extrabold ${report.errors.length > 0 ? "text-jkuat-red" : "text-gray-700"}`}>
                  {report.errors.length}
                </p>
                <p className="text-[11px] text-gray-500">Problems</p>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
              {report.errors.length > 0 && (
                <IssueList
                  title="Fix these rows, then upload the file again. Nothing was imported."
                  tone="text-jkuat-red"
                  issues={report.errors}
                />
              )}
              {report.skipped_rows.length > 0 && (
                <IssueList
                  title="Skipped (existing entries are never changed)"
                  tone="text-gray-500"
                  issues={report.skipped_rows}
                />
              )}
              {report.errors.length === 0 && report.created === 0 && (
                <p className="text-sm text-gray-500">There is nothing new to import in this file.</p>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={handleConfirm}
                disabled={busy || report.errors.length > 0 || report.created === 0}
                className="flex-1 bg-jkuat-green text-white font-bold py-2 rounded-lg disabled:opacity-40"
              >
                {busy ? "Importing..." : `Import ${report.created}`}
              </button>
              <button
                onClick={closeReport}
                disabled={busy}
                className="flex-1 bg-gray-100 text-gray-700 font-bold py-2 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}