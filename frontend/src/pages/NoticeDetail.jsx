import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Lock, ArrowLeft, Download } from "lucide-react";
import { api } from "../api/client";
import AudienceVerify from "../components/AudienceVerify";
import { formatFileSize } from "../lib/fileType";
import AttachmentThumb from "../components/AttachmentThumb";

function AttachmentCard({ attachment }) {
  const downloadUrl = `${import.meta.env.VITE_API_URL}/attachments/${attachment.id}/download`;

  return (
    
     <a href={downloadUrl}
      className="group relative w-36 shrink-0 rounded-xl border border-gray-200 overflow-hidden hover:border-jkuat-green/40 hover:shadow-md transition-all bg-white"
    >
      <div className="relative w-full h-24 overflow-hidden">
        <AttachmentThumb attachment={attachment} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
          <Download size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      <div className="px-2.5 py-2">
        <p className="text-[11px] font-semibold text-gray-700 truncate" title={attachment.file_name}>
          {attachment.file_name}
        </p>
        <p className="text-[10px] text-gray-400">{formatFileSize(attachment.file_size)}</p>
      </div>
    </a>
  );
}

export default function NoticeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [audience, setAudience] = useState(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  async function loadNotice() {
    try {
      const data = await api.get(`/notices/${id}`);
      setNotice(data);
    } catch {
      setNotice(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
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

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>;
  if (!notice) return <div className="p-8 text-center text-gray-400">Notice not found.</div>;

  return (
    <div className="max-w-6xl mx-auto p-4">
      <button onClick={goBack} className="text-sm text-green-600 mb-4 inline-flex items-center gap-1">
        <ArrowLeft size={14} /> Back
      </button>

      <div className="relative bg-white   p-6 ">
        {notice.is_locked && (
          <button
            onClick={() => setShowVerifyModal(true)}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/70 backdrop-blur-[1px] z-10 rounded-lg"
          >
            <Lock size={24} className="text-gray-700" />
            <span className="text-sm font-bold text-gray-700">
              Enter your JKUAT email to unlock this notice
            </span>
          </button>
        )}

        <div className={notice.is_locked ? "blur-sm pointer-events-none select-none" : ""}>
          <span className="inline-block bg-green-50 text-green-700 border border-green-200 text-[10px] font-black tracking-wider px-2.5 py-0.5 rounded uppercase mb-3">
            {notice.audience}
          </span>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">{notice.title}</h1>
          <p className="text-xs text-gray-400 mb-6">
            {new Date(notice.created_at).toLocaleDateString()}
          </p>
          <div
            className="prose prose-neutral max-w-none text-gray-800"
            dangerouslySetInnerHTML={{ __html: notice.body }}
          />
          {notice.attachments?.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">
                {notice.attachments.length} {notice.attachments.length === 1 ? "Attachment" : "Attachments"}
              </h3>
              <div className="flex flex-wrap gap-3">
                {notice.attachments.map((att) => (
                  <AttachmentCard key={att.id} attachment={att} />
                ))}
              </div>
            </div>
          )}
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