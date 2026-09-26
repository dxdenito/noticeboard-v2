import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Pencil, Trash2, Info, MapPin } from "lucide-react";
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

const TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

function stripHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return div.textContent || "";
}

function formatEventDate(isoString) {
  return new Date(isoString).toLocaleDateString("default", { day: "numeric", month: "short", year: "numeric" });
}

export default function MyEvents() {
  const [events, setEvents] = useState([]);
  const [counts, setCounts] = useState(null);
  const [tab, setTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [openInfoId, setOpenInfoId] = useState(null);
  const { showError } = useToast();
  const navigate = useNavigate();

  async function loadCounts() {
    try {
      const data = await api.get("/events/mine/counts");
      setCounts(data);
    } catch (err) {
      showError(err.message);
    }
  }

  async function load() {
    setLoading(true);
    try {
      const statusParam = tab === "all" ? "" : `&status=${tab}`;
      const data = await api.get(`/events/mine?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}${statusParam}`);
      setEvents(data);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [page, tab]);
  useEffect(() => { loadCounts(); }, []);

  function handleTabChange(key) {
    setTab(key);
    setPage(0);
    setOpenInfoId(null);
  }

  async function handleDelete(e, id) {
    e.preventDefault();
    if (!confirm("Delete this event? This cannot be undone.")) return;
    try {
      await api.delete(`/events/${id}`);
      setEvents((prev) => prev.filter((ev) => ev.id !== id));
      loadCounts();
    } catch (err) {
      showError(err.message);
    }
  }

  function toggleInfo(e, id) {
    e.preventDefault();
    setOpenInfoId((prev) => (prev === id ? null : id));
  }

  if (loading) return <div className="text-gray-400">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-4">My Events</h1>

      <div className="flex gap-2 mb-6">
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

      {events.length === 0 ? (
        <p className="text-sm text-gray-400">Nothing here yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.map((ev) => (
            <Link
              key={ev.id}
              to={`/dashboard/events/${ev.id}`}
              className="group relative flex flex-col bg-white border border-gray-100 rounded-lg overflow-hidden hover:border-gray-200 transition-colors"
            >
              <div className={`h-1 ${STATUS_RAIL[ev.status]}`} />

              <div className="flex-1 flex flex-col p-4">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">
                  <span>{STATUS_LABEL[ev.status]}</span>
                  <span>·</span>
                  <span>{formatEventDate(ev.start_date)}</span>
                  {ev.status === "rejected" && ev.rejection_notes && (
                    <button
                      onClick={(e) => toggleInfo(e, ev.id)}
                      title="View rejection notes"
                      className="ml-auto text-gray-400 hover:text-jkuat-red"
                    >
                      <Info size={14} />
                    </button>
                  )}
                </div>

                <h3 className="font-serif text-lg font-bold text-gray-900 leading-snug line-clamp-2">
                  {ev.title}
                </h3>

                {ev.location && (
                  <p className="flex items-center gap-1 text-[11px] text-gray-400 mt-1 truncate">
                    <MapPin size={11} className="shrink-0" />
                    {ev.location}
                  </p>
                )}

                <p className="text-sm text-gray-500 line-clamp-2 mt-1.5 flex-1">
                  {stripHtml(ev.description)}
                </p>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-50">
                  <span className="text-[11px] text-gray-400">
                    {new Date(ev.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.preventDefault(); navigate(`/dashboard/edit-event/${ev.id}`); }}
                      title="Edit"
                      className="text-gray-400 hover:text-jkuat-blue"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, ev.id)}
                      title="Delete"
                      className="text-gray-400 hover:text-jkuat-red"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>

              {openInfoId === ev.id && (
                <div
                  onClick={(e) => e.preventDefault()}
                  className="absolute top-9 right-3 z-10 w-56 bg-white border border-gray-200 rounded-md shadow-lg p-3"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wide text-jkuat-red mb-1">
                    Rejection notes
                  </p>
                  <p className="text-xs text-gray-600 whitespace-pre-wrap">{ev.rejection_notes}</p>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      <Pagination page={page} onPageChange={setPage} hasMore={events.length === PAGE_SIZE} pageSize={PAGE_SIZE} />
    </div>
  );
}