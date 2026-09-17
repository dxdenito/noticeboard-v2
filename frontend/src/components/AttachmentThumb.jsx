import { useState } from "react";
import { getFileKind } from "../lib/fileType";

export default function AttachmentThumb({ attachment, className, iconSize = 28 }) {
  const { kind, icon: Icon, color, bg } = getFileKind(attachment);
  const [thumbFailed, setThumbFailed] = useState(false);

  const downloadUrl = `${import.meta.env.VITE_API_URL}/attachments/${attachment.id}/download`;
  const thumbUrl = `${import.meta.env.VITE_API_URL}/attachments/${attachment.id}/thumbnail`;

  if (kind === "image") {
    return <img src={downloadUrl} alt={attachment.file_name} className={className} />;
  }

  if (kind === "pdf" && !thumbFailed) {
    return (
      <img
        src={thumbUrl}
        alt={attachment.file_name}
        className={className}
        onError={() => setThumbFailed(true)}
      />
    );
  }

  return (
    <div className={`${className} flex flex-col items-center justify-center gap-1.5 ${bg}`}>
      <Icon size={iconSize} className={color} />
    </div>
  );
}