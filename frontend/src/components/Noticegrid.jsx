import { Link } from "react-router-dom";
import { Building2 } from "lucide-react";
import image from "../images/image-1.jpg";
import placeholderTwo from '../images/image-2.jpg';
import placeholderThree from '../images/image-3.jpg';
import { getFileKind } from '../lib/fileType';
import AttachmentThumb from '../components/AttachmentThumb';

const AUDIENCE_LABELS = {
  public: "Public",
  student: "Student",
  staff: "Staff",
};

const PILL_PALETTE = [
  { bg: "bg-jkuat-blue/10", text: "text-jkuat-blue" },
  { bg: "bg-jkuat-green/10", text: "text-jkuat-green" },
  { bg: "bg-jkuat-red/10", text: "text-jkuat-red" },
];

const PLACEHOLDER_IMAGES = [image, placeholderTwo, placeholderThree];

const FOCUS_RING_GREEN = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jkuat-green focus-visible:ring-offset-2 rounded";

function pillStyle(id) {
  return PILL_PALETTE[id % PILL_PALETTE.length];
}

function placeholderFor(id) {
  return PLACEHOLDER_IMAGES[id % PLACEHOLDER_IMAGES.length];
}

function findPreviewAttachment(attachments) {
  if (!attachments || attachments.length === 0) return null;
  const img = attachments.find((a) => getFileKind(a).kind === "image");
  if (img) return img;
  const pdf = attachments.find((a) => getFileKind(a).kind === "pdf");
  if (pdf) return pdf;
  return attachments[0];
}

function stripHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return div.textContent || "";
}

function formatFullDateTime(isoString) {
  const d = new Date(isoString);
  const datePart = d.toLocaleDateString("default", { day: "numeric", month: "short", year: "numeric" });
  const timePart = d.toLocaleTimeString("default", { hour: "numeric", minute: "2-digit" });
  return `${datePart} · ${timePart}`;
}

function audienceLabel(notice) {
  return AUDIENCE_LABELS[notice.audience] || "Notice";
}

function NoticeMedia({ notice, className }) {
  const previewAttachment = findPreviewAttachment(notice.attachments);
  if (previewAttachment) {
    return <AttachmentThumb attachment={previewAttachment} className={className} />;
  }
  return <img src={placeholderFor(notice.id)} alt="Notice" className={className} loading="lazy" decoding="async" />;
}

export default function NoticeGrid({ notices, onLockedClick }) {
  if (notices.length === 0) {
    return <p className="text-center text-xs font-medium text-gray-400 italic py-12">No notices found.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
      {notices.map((notice) => {
        const pill = pillStyle(notice.id);
        const excerpt = stripHtml(notice.body);

        return (
          <article
            key={notice.id}
            className="group relative bg-white rounded-xl shadow-lg overflow-hidden flex flex-col h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-gray-200/70"
          >
            {notice.is_locked && (
              <button
                onClick={onLockedClick}
                className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/60 backdrop-blur-[1px] z-10"
              >
                <span className="text-xs font-bold text-gray-700 px-4 text-center">
                  Enter your JKUAT email to unlock
                </span>
              </button>
            )}

            <div className={notice.is_locked ? "flex flex-col w-full h-full blur-sm pointer-events-none select-none" : "flex flex-col w-full h-full"}>
              <div className="relative w-full h-64 shrink-0 overflow-hidden">
                <NoticeMedia notice={notice} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              </div>

              <div className="flex-1 flex flex-col gap-3 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full shrink-0 ${pill.bg} ${pill.text}`}>
                    {audienceLabel(notice)}
                  </span>
                  <span className="text-[10px] text-gray-400 text-right">
                    {formatFullDateTime(notice.created_at)}
                  </span>
                </div>

                <div className="flex-1">
                  <Link to={`/notices/${notice.id}`} className={FOCUS_RING_GREEN}>
                    <h3 className="font-bold text-[15px] text-gray-900 leading-snug line-clamp-2 group-hover:text-jkuat-green cursor-pointer transition-colors">
                      {notice.title}
                    </h3>
                  </Link>
                  {notice.org_unit?.name && (
                    <p className="flex items-center gap-1 text-[11px] text-gray-400 mt-1 truncate">
                      <Building2 size={11} className="shrink-0" />
                      {notice.org_unit.name}
                    </p>
                  )}
                  {notice.body && (
                    <p className="text-xs text-gray-500 line-clamp-2 mt-1.5">
                      {excerpt}
                    </p>
                  )}
                </div>

                <Link
                  to={`/notices/${notice.id}`}
                  className={`w-full block text-center bg-jkuat-green hover:bg-jkuat-blue text-white text-xs font-bold py-2.5 rounded-xl uppercase tracking-wide transition-colors cursor-pointer ${FOCUS_RING_GREEN}`}
                >
                  Read more
                </Link>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}