// src/pages/dashboard/MyNotices.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { useToast } from "../../context/ToastContext";

import { useNavigate } from "react-router-dom";

const STATUS_STYLES = {
  approved: "bg-jkuat-green/10 text-jkuat-green",
  pending: "bg-amber-50 text-amber-700",
  rejected: "bg-red-50 text-red-600",
};

export default function MyNotices() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showError } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/notices/mine")
      .then(setNotices)
      .catch((err) => showError(err.message))
      .finally(() => setLoading(false));
  }, []);




  async function handleDelete(e, id) {
    e.preventDefault(); // stop the card's own Link navigation from firing
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
      <h1 className="text-2xl font-extrabold text-gray-900 mb-4">My Notices</h1>

      {notices.length === 0 ? (
        <p className="text-sm text-gray-400">You haven't posted any notices yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {notices.map((n) => (
            <Link
              key={n.id}
              to={`/notices/${n.id}`}
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${STATUS_STYLES[n.status]}`}>
                  {n.status}
                </span>
                <span className="text-[10px] font-bold uppercase text-gray-400">
                  {n.audience}
                </span>
              </div>

              <h3 className="font-bold text-sm text-gray-900 leading-snug line-clamp-2">
                {n.title}
              </h3>

              <p className="text-xs text-gray-500 line-clamp-2 flex-1"
              dangerouslySetInnerHTML={{ __html: n.body }}
              >
                
              </p>

              <p className="text-[11px] text-gray-400 pt-2 border-t border-gray-100">
                {new Date(n.created_at).toLocaleDateString()}
              </p>
              <div className="flex gap-3 pt-2 border-t border-gray-100 mt-2">
                <button
                  onClick={(e) => { e.preventDefault(); navigate(`/dashboard/edit-notice/${n.id}`); }}
                  className="text-xs text-jkuat-green font-semibold"
                >
                  Edit
                </button>
                <button
                  onClick={(e) => handleDelete(e, n.id)}
                  className="text-xs text-jkuat-red font-semibold"
                >
                  Delete
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}