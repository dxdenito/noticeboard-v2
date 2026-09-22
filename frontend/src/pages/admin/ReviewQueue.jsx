import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Check, X } from "lucide-react";
import { api } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import Pagination from "../../components/admin/Pagination";
import RejectModal from "../../components/admin/RejectModal";
import { PENDING_COUNT_CHANGED_EVENT } from "../../layouts/AdminLayout";

const PAGE_SIZE = 20;

function stripHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || "";
}

export default function ReviewQueue() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const { showError, showSuccess } = useToast();

  async function load() {
    setLoading(true);
    try {
      const data = await api.get(`/notices/pending?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`);
      setNotices(data);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [page]);

  async function handleApprove(id) {
    setActionLoading(id);
    try {
      await api.patch(`/notices/${id}/approve`);
      setNotices((prev) => prev.filter((n) => n.id !== id));
      window.dispatchEvent(new Event(PENDING_COUNT_CHANGED_EVENT));
      showSuccess("Notice approved");
    } catch (err) {
      showError(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(notes) {
    const id = rejectTarget;
    setActionLoading(id);
    try {
      await api.patch(`/notices/${id}/reject`, { rejection_notes: notes });
      setNotices((prev) => prev.filter((n) => n.id !== id));
      window.dispatchEvent(new Event(PENDING_COUNT_CHANGED_EVENT));
      showSuccess("Notice rejected");
      setRejectTarget(null);
    } catch (err) {
      showError(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) return <div className="text-gray-400">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Review Queue</h1>

      {notices.length === 0 ? (
        <p className="text-sm text-gray-400">Nothing pending review.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {notices.map((n) => (
            <div
              key={n.id}
              className="group flex flex-col bg-white border border-gray-100 rounded-lg overflow-hidden hover:border-gray-200 transition-colors"
            >
              <div className="h-1 bg-amber-400" />

              <div className="flex-1 flex flex-col p-4">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">
                  <span>Pending review</span>
                  <span>·</span>
                  <span>{n.audience}</span>
                </div>

                <Link to={`/notices/${n.id}`} className="font-serif text-lg font-bold text-gray-900 leading-snug line-clamp-2 hover:underline">
                  {n.title}
                </Link>

                <p className="text-sm text-gray-500 line-clamp-2 mt-1.5 flex-1">
                  {stripHtml(n.body)}
                </p>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-50">
                  <span className="text-[11px] text-gray-400">
                    {new Date(n.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApprove(n.id)}
                      disabled={actionLoading === n.id}
                      title="Approve"
                      className="flex items-center gap-1 bg-jkuat-green text-white text-xs font-bold px-2.5 py-1.5 rounded disabled:opacity-50"
                    >
                      <Check size={13} /> Approve
                    </button>
                    <button
                      onClick={() => setRejectTarget(n.id)}
                      disabled={actionLoading === n.id}
                      title="Reject"
                      className="flex items-center gap-1 bg-jkuat-red text-white text-xs font-bold px-2.5 py-1.5 rounded disabled:opacity-50"
                    >
                      <X size={13} /> Reject
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} onPageChange={setPage} hasMore={notices.length === PAGE_SIZE} pageSize={PAGE_SIZE} />

      {rejectTarget !== null && (
        <RejectModal
          loading={actionLoading === rejectTarget}
          onCancel={() => setRejectTarget(null)}
          onConfirm={handleReject}
        />
      )}
    </div>
  );
}