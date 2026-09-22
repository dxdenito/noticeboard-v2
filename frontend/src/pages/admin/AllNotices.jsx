import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Search, Trash2 } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { canDeleteAnyNotice } from "../../lib/permissions";
import Pagination from "../../components/admin/Pagination";

const PAGE_SIZE = 20;

const STATUS_STYLES = {
  approved: "bg-jkuat-green/10 text-jkuat-green",
  pending: "bg-amber-50 text-amber-700",
  rejected: "bg-red-50 text-red-600",
};

const TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

function stripHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || "";
}

export default function AllNotices() {
  const { user: currentUser } = useAuth();
  const [notices, setNotices] = useState([]);
  const [counts, setCounts] = useState(null);
  const [tab, setTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const debounceRef = useRef(null);
  const { showError, showSuccess } = useToast();

  const canDelete = canDeleteAnyNotice(currentUser);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(0);
      setSearch(searchInput);
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput]);

  async function loadCounts() {
    try {
      const data = await api.get("/notices/all/counts");
      setCounts(data);
    } catch (err) {
      showError(err.message);
    }
  }

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      });
      if (search) params.set("search", search);
      if (tab !== "all") params.set("status", tab);
      const data = await api.get(`/notices/all?${params.toString()}`);
      setNotices(data);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [page, search, tab]);
  useEffect(() => { loadCounts(); }, []);

  function handleTabChange(key) {
    setTab(key);
    setPage(0);
  }

  async function handleDelete(e, id) {
    e.preventDefault();
    if (!confirm("Delete this notice? This cannot be undone.")) return;
    try {
      await api.delete(`/notices/${id}`);
      setNotices((prev) => prev.filter((n) => n.id !== id));
      showSuccess("Notice deleted");
      loadCounts();
    } catch (err) {
      showError(err.message);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-4">All Notices</h1>

      <div className="flex gap-2 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => handleTabChange(t.key)}
            className={`text-xs font-bold px-3 py-1.5 rounded-full ${
              tab === t.key ? "bg-jkuat-green text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {t.label} {counts ? `(${t.key === "all" ? counts.total : counts[t.key]})` : ""}
          </button>
        ))}
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by title..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-jkuat-green/40"
        />
      </div>

      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : (
        <>
          {notices.length === 0 && (
            <p className="text-sm text-gray-400">No notices match.</p>
          )}
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {notices.map((n) => (
              <div key={n.id} className="px-4 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${STATUS_STYLES[n.status]}`}>
                      {n.status}
                    </span>
                    <Link to={`/dashboard/notices/${n.id}`} className="font-semibold text-sm text-gray-900 hover:underline truncate">
                      {n.title}
                    </Link>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-1">{stripHtml(n.body || "")}</p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Posted by {n.author.full_name} on {new Date(n.created_at).toLocaleDateString()}
                    {n.reviewed_by && (
                      <>
                        {" "}· {n.status === "rejected" ? "Rejected" : "Approved"} by {n.reviewed_by.full_name} on {new Date(n.reviewed_at).toLocaleDateString()}
                      </>
                    )}
                  </p>
                  {n.status === "rejected" && n.rejection_notes && (
                    <p className="text-[11px] text-jkuat-red mt-1 italic line-clamp-1">
                      "{n.rejection_notes}"
                    </p>
                  )}
                </div>
                {canDelete && (
                  <button
                    onClick={(e) => handleDelete(e, n.id)}
                    title="Delete"
                    className="text-gray-400 hover:text-jkuat-red shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <Pagination page={page} onPageChange={setPage} hasMore={notices.length === PAGE_SIZE} pageSize={PAGE_SIZE} />
    </div>
  );
}