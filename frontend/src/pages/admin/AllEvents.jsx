import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Search, Trash2, MapPin } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { htmlToText } from "../../lib/sanitize";
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

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString("default", { day: "numeric", month: "short", year: "numeric" });
}

export default function AllEvents() {
  const { user: currentUser } = useAuth();
  const [events, setEvents] = useState([]);
  const [counts, setCounts] = useState(null);
  const [tab, setTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const debounceRef = useRef(null);
  const { showError, showSuccess } = useToast();

  const canDelete = currentUser?.role?.name === "super_admin";

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
      const data = await api.get("/events/all/counts");
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
      const data = await api.get(`/events/all?${params.toString()}`);
      setEvents(data);
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
    if (!confirm("Delete this event? This cannot be undone.")) return;
    try {
      await api.delete(`/events/${id}`);
      setEvents((prev) => prev.filter((ev) => ev.id !== id));
      showSuccess("Event deleted");
      loadCounts();
    } catch (err) {
      showError(err.message);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-4">All Events</h1>

      <div className="flex gap-2 mb-4 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => handleTabChange(t.key)}
            className={`text-xs font-bold px-3 py-1.5 rounded-full ${
              tab === t.key ? "bg-jkuat-blue text-white" : "bg-gray-100 text-gray-600"
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
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-jkuat-blue/40"
        />
      </div>

      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : (
        <>
          {events.length === 0 && <p className="text-sm text-gray-400">No events match.</p>}
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {events.map((ev) => (
              <div key={ev.id} className="px-4 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${STATUS_STYLES[ev.status]}`}>
                      {ev.status}
                    </span>
                    <Link to={`/dashboard/events/${ev.id}`} className="font-semibold text-sm text-gray-900 hover:underline truncate">
                      {ev.title}
                    </Link>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-1">{htmlToText(ev.description)}</p>
                  <p className="flex items-center flex-wrap gap-x-3 text-[11px] text-gray-400 mt-1">
                    <span>
                      {formatDate(ev.start_date)}
                      {ev.end_date && ` – ${formatDate(ev.end_date)}`}
                    </span>
                    {ev.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={10} /> {ev.location}
                      </span>
                    )}
                    <span>Posted by {ev.author.full_name}</span>
                    {ev.reviewed_by && (
                      <span>
                        {ev.status === "rejected" ? "Rejected" : "Approved"} by {ev.reviewed_by.full_name}
                      </span>
                    )}
                  </p>
                  {ev.status === "rejected" && ev.rejection_notes && (
                    <p className="text-[11px] text-jkuat-red mt-1 italic line-clamp-1">"{ev.rejection_notes}"</p>
                  )}
                </div>
                {canDelete && (
                  <button
                    onClick={(e) => handleDelete(e, ev.id)}
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

      <Pagination page={page} onPageChange={setPage} hasMore={events.length === PAGE_SIZE} pageSize={PAGE_SIZE} />
    </div>
  );
}