import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Lock, ArrowLeft } from "lucide-react";
import { api } from "../api/client";
import AudienceVerify from "../components/AudienceVerify";

export default function NoticeDetail() {
  const { id } = useParams();
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

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>;
  if (!notice) return <div className="p-8 text-center text-gray-400">Notice not found.</div>;

  return (
    <div className="max-w-6xl mx-auto p-4">
      <Link to="/" className="text-sm text-green-600 mb-4 inline-flex items-center gap-1">
        <ArrowLeft size={14} /> Back to feed
      </Link>

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
          <p className="whitespace-pre-wrap text-gray-800">{notice.body}</p>
          {notice.attachments?.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Attachments</h3>
                <ul className="space-y-1">
                  {notice.attachments.map((att) => (
                    <li key={att.id}>
                      
                       <a href={`${import.meta.env.VITE_API_URL}/attachments/${att.id}/download`}
                        className="text-sm text-green-600 underline"
                      >
                        {att.file_name}
                      </a>
                    </li>
                  ))}
                </ul>
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