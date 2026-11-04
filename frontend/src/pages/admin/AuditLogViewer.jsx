import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { api } from "../../api/client";
import { useToast } from "../../context/ToastContext";

const PAGE_SIZE = 25;

const RED_ACTIONS = ["reject", "revoke", "delete", "deactivate", "login_failed"];
const GREEN_ACTIONS = ["create", "approve", "grant", "activate", "reactivate", "login", "upload"];
const BLUE_ACTIONS = [
  "update", "image_update", "reassign", "password_reset", "password_change",
  "password_reset_request", "pin_site", "pin_feed", "resend_activation",
];

const EMPTY_FILTERS = {
  actorId: "", targetType: "", action: "", dateFrom: "", dateTo: "", search: "",
};

function actionColor(action) {
  const parts = action.split(".").slice(1);
  if (parts.some((p) => RED_ACTIONS.includes(p))) return "text-jkuat-red";
  if (parts.some((p) => GREEN_ACTIONS.includes(p))) return "text-jkuat-green";
  if (parts.some((p) => BLUE_ACTIONS.includes(p))) return "text-blue-600";
  return "text-gray-600";
}

function toInputDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDayIso(dateString) {
  return new Date(`${dateString}T00:00:00`).toISOString();
}

function startOfNextDayIso(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return date.toISOString();
}

function typeLabel(value) {
  return value.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

export default function AuditLogViewer() {
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState({ actions: [], target_types: [], actors: [] });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const { showError } = useToast();

  const hasFilters = Object.values(filters).some((v) => v !== "");

  useEffect(() => {
    api.get("/audit-logs/meta").then(setMeta).catch((err) => showError(err.message));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => (prev.search === searchInput ? prev : { ...prev, search: searchInput }));
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      });
      if (filters.actorId) params.set("actor_id", filters.actorId);
      if (filters.targetType) params.set("target_type", filters.targetType);
      if (filters.action) params.set("action", filters.action);
      if (filters.search) params.set("search", filters.search);
      if (filters.dateFrom) params.set("date_from", startOfDayIso(filters.dateFrom));
      if (filters.dateTo) params.set("date_to", startOfNextDayIso(filters.dateTo));
      const data = await api.get(`/audit-logs/?${params.toString()}`);
      setLogs(data);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [page, filters]);

  function setFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(0);
  }

  function applyRange(days) {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - (days - 1));
    setFilters((prev) => ({ ...prev, dateFrom: toInputDate(from), dateTo: toInputDate(to) }));
    setPage(0);
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setSearchInput("");
    setPage(0);
  }

  const inputClass = "border border-gray-200 rounded-lg px-3 py-1.5 text-xs bg-white";

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-4">Audit Log</h1>

      <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4 space-y-3">
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search person, item, action or details..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-jkuat-green/40"
          />
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">User</label>
            <select value={filters.actorId} onChange={(e) => setFilter("actorId", e.target.value)} className={inputClass}>
              <option value="">Everyone</option>
              {meta.actors.map((a) => (
                <option key={a.id} value={a.id}>{a.full_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Item type</label>
            <select value={filters.targetType} onChange={(e) => setFilter("targetType", e.target.value)} className={inputClass}>
              <option value="">All types</option>
              {meta.target_types.map((t) => (
                <option key={t} value={t}>{typeLabel(t)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Action</label>
            <select value={filters.action} onChange={(e) => setFilter("action", e.target.value)} className={inputClass}>
              <option value="">All actions</option>
              {meta.actions.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">From</label>
            <input type="date" value={filters.dateFrom} max={filters.dateTo || undefined}
              onChange={(e) => setFilter("dateFrom", e.target.value)} className={inputClass} />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">To</label>
            <input type="date" value={filters.dateTo} min={filters.dateFrom || undefined}
              onChange={(e) => setFilter("dateTo", e.target.value)} className={inputClass} />
          </div>

          <div className="flex items-center gap-1.5">
            <button onClick={() => applyRange(1)} className="text-[11px] font-semibold px-2.5 py-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200">Today</button>
            <button onClick={() => applyRange(7)} className="text-[11px] font-semibold px-2.5 py-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200">7 days</button>
            <button onClick={() => applyRange(30)} className="text-[11px] font-semibold px-2.5 py-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200">30 days</button>
            {hasFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-full text-jkuat-red hover:bg-red-50">
                <X size={12} /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {logs.map((log) => (
            <div key={log.id} className="px-4 py-3 text-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <span className="text-gray-500">{log.actor?.full_name || "System / not signed in"}</span>{" "}
                  <span className={`font-bold ${actionColor(log.action)}`}>{log.action}</span>{" "}
                  <span className="text-gray-700">{log.target_label || `${log.target_type} #${log.target_id}`}</span>
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
              {log.details && (
                <ul className="mt-1 space-y-0.5">
                  {log.details.split("; ").map((line, i) => (
                    <li key={i} className="text-xs text-gray-500 break-words">{line}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          {logs.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-6">No matching activity.</p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-4">
        <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          className="text-xs font-semibold text-gray-500 disabled:opacity-30"
        >
          Previous
        </button>
        <span className="text-xs text-gray-400">Page {page + 1}</span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={logs.length < PAGE_SIZE}
          className="text-xs font-semibold text-gray-500 disabled:opacity-30"
        >
          Next
        </button>
      </div>
    </div>
  );
}