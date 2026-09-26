import { useState, useEffect } from "react";
import { Download, FileWarning } from "lucide-react";
import mammoth from "mammoth";
import { getFileKind, formatFileSize } from "../lib/fileType";

function isDocx(attachment) {
  const type = (attachment.content_type || "").toLowerCase();
  const name = (attachment.file_name || "").toLowerCase();
  return type.includes("wordprocessingml") || name.endsWith(".docx");
}

export default function AttachmentViewer({ attachment }) {
  const { kind } = getFileKind(attachment);
  const downloadUrl = `${import.meta.env.VITE_API_URL}/attachments/${attachment.id}/download`;
  const showDocx = kind === "doc" && isDocx(attachment);

  const [docxHtml, setDocxHtml] = useState(null);
  const [docxError, setDocxError] = useState(false);
  const [docxLoading, setDocxLoading] = useState(false);

  useEffect(() => {
    if (!showDocx) return;
    setDocxHtml(null);
    setDocxError(false);
    setDocxLoading(true);
    fetch(downloadUrl, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch document");
        return res.arrayBuffer();
      })
      .then((buffer) => mammoth.convertToHtml({ arrayBuffer: buffer }))
      .then((result) => setDocxHtml(result.value))
      .catch(() => setDocxError(true))
      .finally(() => setDocxLoading(false));
  }, [attachment.id]);

  if (kind === "image") {
    return (
      <img
        src={downloadUrl}
        alt={attachment.file_name}
        className="w-full max-h-[520px] object-contain bg-gray-50 rounded-xl"
      />
    );
  }

  if (kind === "pdf") {
    return (
      <div>
        <iframe
          src={downloadUrl}
          title={attachment.file_name}
          className="w-full h-[520px] rounded-xl border border-gray-100"
        />
        <p className="text-[11px] text-gray-400 mt-2 sm:hidden">
          If the PDF doesn't display,{" "}
          <a href={downloadUrl} className="text-jkuat-green font-semibold underline">
            open it directly
          </a>.
        </p>
      </div>
    );
  }

  if (showDocx) {
    if (docxLoading) {
      return <div className="w-full h-[300px] rounded-xl bg-gray-50 animate-pulse" />;
    }
    if (docxError || !docxHtml) {
      return (
        <div className="w-full rounded-xl border border-gray-100 p-6 flex flex-col items-center gap-2 text-center">
          <FileWarning size={24} className="text-gray-400" />
          <p className="text-sm text-gray-500">Couldn't preview this document.</p>
          <a href={downloadUrl} className="text-xs font-bold text-jkuat-green flex items-center gap-1">
            <Download size={12} /> Download instead
          </a>
        </div>
      );
    }
    return (
      <div
        className="w-full max-h-[520px] overflow-y-auto rounded-xl border border-gray-100 p-6 prose prose-sm prose-neutral max-w-none bg-white"
        dangerouslySetInnerHTML={{ __html: docxHtml }}
      />
    );
  }

  return (
    
    <a  href={downloadUrl}
      className="w-full rounded-xl border border-gray-100 p-6 flex flex-col items-center gap-2 text-center hover:border-jkuat-green/40 transition-colors"
    >
      <Download size={24} className="text-gray-400" />
      <p className="text-sm font-semibold text-gray-700">{attachment.file_name}</p>
      <p className="text-xs text-gray-400">{formatFileSize(attachment.file_size)} · Click to download</p>
    </a>
  );
}