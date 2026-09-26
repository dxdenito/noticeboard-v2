import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Lock, ArrowLeft, Building2 } from "lucide-react";
import { api } from "../api/client";
import AudienceVerify from "../components/AudienceVerify";
import AttachmentThumb from "../components/AttachmentThumb";
import AttachmentViewer from "../components/AttachmentViewer";
import { getFileKind } from "../lib/fileType";
import { AUDIENCE_LABELS, audienceStyle } from "../lib/audience";

function formatFullDateTime(isoString) {
  const d = new Date(isoString);
  const datePart = d.toLocaleDateString("default", { day: "numeric", month: "short", year: "numeric" });
  const timePart = d.toLocaleTimeString("default", { hour: "numeric", minute: "2-digit" });
  return `${datePart} · ${timePart}`;
}

function isDocx(attachment) {
  const type = (attachment.content_type || "").toLowerCase();
  const name = (attachment.file_name || "").toLowerCase();
  return type.includes("wordprocessingml") || name.endsWith(".docx");
}

function pickPrimaryAttachment(attachments) {
  if (!attachments || attachments.length === 0) return null;
  const img = attachments.find((a) => getFileKind(a).kind === "image");
  if (img) return img;
  const pdf = attachments.find((a) => getFileKind(a).kind === "pdf");
  if (pdf) return pdf;
  const docx = attachments.find(isDocx);
  if (docx) return docx;
  return attachments[0];
}

function NoticeDetailSkeleton() {
  return (
    <div className="max-w-6xl mx-auto p-4 animate-pulse">
      <div className="h-5 w-16 bg-gray-200 rounded mb-4" />
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex gap-2 mb-4">
          <div className="h-5 w-16 bg-gray-200 rounded-full" />
          <div className="h-5 w-20 bg-gray-200 rounded-full" />
        </div>
        <div className="h-7 w-3/4 bg-gray-200 rounded mb-4" />
        <div className="h-64 w-full bg-gray-100 rounded-xl mb-6" />
        <div className="space-y-2.5">
          <div className="h-3.5 w-full bg-gray-100 rounded" />
          <div className="h-3.5 w-full bg-gray-100 rounded" />
          <div className="h-3.5 w-5/6 bg-gray-100 rounded" />
        </div>
      </div>
    </div>
  );
}

export default function NoticeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [audience, setAudience] = useState(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState(null);

  async function loadNotice() {
    try {
      const data = await api.get(`/notices/${id}`);
      setNotice(data);
      setSelectedAttachment(pickPrimaryAttachment(data.attachments));
    } catch {
      setNotice(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    loadNotice();
  }, [id]);

  function handleVerified(newAudience) {
    setAudience(newAudience);
    loadNotice();
  }

  function goBack() {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate("/");
    }
  }

  if (loading) return <NoticeDetailSkeleton />;
  if (!notice) return <div className="p-8 text-center text-gray-400">Notice not found.</div>;

  const pill = audienceStyle(notice.audience);
  const hasAttachments = notice.attachments && notice.attachments.length > 0;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <button onClick={goBack} className="text-sm text-green-600 mb-4 inline-flex items-center gap-1">
        <ArrowLeft size={14} /> Back
      </button>

      <div className="relative bg-white rounded-2xl p-6">
        {notice.is_locked && (
          <button
            onClick={() => setShowVerifyModal(true)}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/70 backdrop-blur-[1px] z-10 rounded-2xl"
          >
            <Lock size={24} className="text-gray-700" />
            <span className="text-sm font-bold text-gray-700">
              Enter your JKUAT email to unlock this notice
            </span>
          </button>
        )}

        <div className={notice.is_locked ? "blur-sm pointer-events-none select-none" : ""}>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className={`inline-block ${pill.bg} ${pill.text} text-[10px] font-black tracking-wider px-2.5 py-0.5 rounded-full uppercase`}>
              {AUDIENCE_LABELS[notice.audience] || notice.audience}
            </span>
            {notice.category?.name && (
              <span className="inline-block bg-gray-100 text-gray-600 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                {notice.category.name}
              </span>
            )}
            {notice.org_unit?.name && (
              <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                <Building2 size={10} />
                {notice.org_unit.name}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-5">{notice.title}</h1>

          {hasAttachments && selectedAttachment && (
            <div className="mb-6">
              <AttachmentViewer attachment={selectedAttachment} />

              {notice.attachments.length > 1 && (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                  {notice.attachments.map((att) => (
                    <button
                      key={att.id}
                      onClick={() => setSelectedAttachment(att)}
                      className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                        selectedAttachment.id === att.id ? "border-jkuat-green" : "border-transparent hover:border-gray-200"
                      }`}
                    >
                      <AttachmentThumb attachment={att} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-gray-400 mb-4">
            {formatFullDateTime(notice.created_at)}
          </p>
          <div
            className="prose prose-neutral max-w-none text-gray-800"
            dangerouslySetInnerHTML={{ __html: notice.body }}
          />
        </div>
      </div>

      {showVerifyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-lg mb-2">Verify your email</h3>
            <p className="text-sm text-gray-500 mb-4">
              Enter your JKUAT email to unlock this notice.
            </p>
            <AudienceVerify
              onVerified={(newAudience) => {
                handleVerified(newAudience);
                setShowVerifyModal(false);
              }}
              currentAudience={audience}
            />
            <button onClick={() => setShowVerifyModal(false)} className="text-xs text-gray-400 mt-2">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}