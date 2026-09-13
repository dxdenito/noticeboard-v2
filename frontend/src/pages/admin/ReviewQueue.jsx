import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import Pagination from "../../components/admin/Pagination";

const PAGE_SIZE = 20;

export default function ReviewQueue() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [actionLoading, setActionLoading] = useState(null);
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

  async function handleDecision(id, action) {
    setActionLoading(id);
    try {
      await api.patch(`/notices/${id}/${action}`);
      setNotices((prev) => prev.filter((n) => n.id !== id));
      showSuccess(action === "approve" ? "Notice approved" : "Notice rejected");
    } catch (err) {
      showError(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) return <div className="text-gray-400">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-4">Review Queue</h1>
      {notices.length === 0 && (
        <p className="text-sm text-gray-400">Nothing pending review.</p>
      )}
      <div className="space-y-3">
        {notices.map((n) => (
          <div key={n.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <Link to={`/notices/${n.id}`} className="font-semibold text-sm text-gray-900 hover:underline">
              {n.title}
            </Link>
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{n.body}</p>
            <p className="text-[10px] text-gray-400 mt-2 uppercase font-bold">{n.audience}</p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => handleDecision(n.id, "approve")}
                disabled={actionLoading === n.id}
                className="bg-jkuat-green text-white text-xs font-bold px-3 py-1.5 rounded disabled:opacity-50"
              >
                Approve
              </button>
              <button
                onClick={() => handleDecision(n.id, "reject")}
                disabled={actionLoading === n.id}
                className="bg-jkuat-red text-white text-xs font-bold px-3 py-1.5 rounded disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
      <Pagination page={page} onPageChange={setPage} hasMore={notices.length === PAGE_SIZE} pageSize={PAGE_SIZE} />
    </div>
  );
}