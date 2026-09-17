import { FileText, FileSpreadsheet, FileArchive, FileImage, File as FileIcon } from "lucide-react";

export function getFileKind(attachment) {
  const type = (attachment.content_type || "").toLowerCase();
  const name = (attachment.file_name || "").toLowerCase();

  if (type.startsWith("image/")) {
    return { kind: "image", icon: FileImage, label: "Image", color: "text-jkuat-blue", bg: "bg-jkuat-blue/10" };
  }
  if (type === "application/pdf" || name.endsWith(".pdf")) {
    return { kind: "pdf", icon: FileText, label: "PDF", color: "text-jkuat-red", bg: "bg-jkuat-red/10" };
  }
  if (type.includes("spreadsheet") || name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv")) {
    return { kind: "sheet", icon: FileSpreadsheet, label: "Spreadsheet", color: "text-jkuat-green", bg: "bg-jkuat-green/10" };
  }
  if (type.includes("zip") || type.includes("compressed") || name.endsWith(".zip") || name.endsWith(".rar")) {
    return { kind: "archive", icon: FileArchive, label: "Archive", color: "text-gray-500", bg: "bg-gray-100" };
  }
  if (type.includes("word") || name.endsWith(".doc") || name.endsWith(".docx")) {
    return { kind: "doc", icon: FileText, label: "Document", color: "text-jkuat-blue", bg: "bg-jkuat-blue/10" };
  }
  return { kind: "file", icon: FileIcon, label: "File", color: "text-gray-500", bg: "bg-gray-100" };
}

export function formatFileSize(bytes) {
  if (bytes === null || bytes === undefined) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}