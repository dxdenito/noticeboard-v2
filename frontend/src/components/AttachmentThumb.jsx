import { useState } from "react";
import { getFileKind } from "../lib/fileType";

export default function AttachmentThumb({ attachment, className, iconSize = 28 }) {
  const { kind, icon: Icon, color, bg } = getFileKind(attachment);
  const [thumbFailed, setThumbFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const downloadUrl = `${import.meta.env.VITE_API_URL}/attachments/${attachment.id}/download`;
  const thumbUrl = `${import.meta.env.VITE_API_URL}/attachments/${attachment.id}/thumbnail`;

  if (kind === "image" || (kind === "pdf" && !thumbFailed)) {
    const src = kind === "image" ? downloadUrl : thumbUrl;
    return (
      <div className="relative w-full h-full bg-gray-100">
        {!loaded && <div className="absolute inset-0 animate-pulse bg-gray-200" />}
        <img
          src={src}
          alt={attachment.file_name}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={kind === "pdf" ? () => setThumbFailed(true) : undefined}
          className={`${className} transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      </div>
    );
  }

  return (
    <div className={`${className} flex flex-col items-center justify-center gap-1.5 ${bg}`}>
      <Icon size={iconSize} className={color} />
    </div>
  );
}