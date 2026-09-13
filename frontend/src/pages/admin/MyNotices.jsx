// src/pages/dashboard/MyNotices.jsx
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";
import { api } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import Pagination from "../../components/admin/Pagination";

const PAGE_SIZE = 15;

const STATUS_RAIL = {
  approved: "bg-jkuat-green",
  pending: "bg-amber-400",
  rejected: "bg-jkuat-red",
};

const STATUS_LABEL = {
  approved: "Published",
  pending: "Pending review",
  rejected: "Rejected",
};

function stripHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || "";
}

export default function MyNotices() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const { showError } = useToast();
  const navigate = useNavigate();

  async function load() {
    setLoading(true);
    try {
      const data = await api.get(`/notices/mine?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`);
      setNotices(data);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [page]);

  async function handleDelete(e, id) {
    e.preventDefault();
    if (!confirm("Delete this notice? This cannot be undone.")) return;
    try {
      await api.delete(`/notices/${id}`);
      setNotices((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      showError(err.message);
    }
  }

  if (loading) return <div className="text-gray-400">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">My Notices</h1>

      {notices.length === 0 ? (
        <p className="text-sm text-gray-400">You haven't posted any notices yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {notices.map((n) => (
            <Link
              key={n.id}
              to={`/notices/${n.id}`}
              className="group flex flex-col bg-white border border-gray-100 rounded-lg overflow-hidden hover:border-gray-200 transition-colors"
            >
              <div className={`h-1 ${STATUS_RAIL[n.status]}`} />

              <div className="flex-1 flex flex-col p-4">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">
                  <span>{STATUS_LABEL[n.status]}</span>
                  <span>·</span>
                  <span>{n.audience}</span>
                </div>

                <h3 className="font-serif text-lg font-bold text-gray-900 leading-snug line-clamp-2">
                  {n.title}
                </h3>

                <p className="text-sm text-gray-500 line-clamp-2 mt-1.5 flex-1">
                  {stripHtml(n.body)}
                </p>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-50">
                  <span className="text-[11px] text-gray-400">
                    {new Date(n.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.preventDefault(); navigate(`/dashboard/edit-notice/${n.id}`); }}
                      title="Edit"
                      className="text-gray-400 hover:text-jkuat-green"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, n.id)}
                      title="Delete"
                      className="text-gray-400 hover:text-jkuat-red"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Pagination page={page} onPageChange={setPage} hasMore={notices.length === PAGE_SIZE} pageSize={PAGE_SIZE} />
    </div>
  );
}