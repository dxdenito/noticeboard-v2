import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Check, X } from "lucide-react";
import { api } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import Pagination from "../../components/admin/Pagination";
import RejectModal from "../../components/admin/RejectModal";
import { PENDING_COUNT_CHANGED_EVENT } from "../../layouts/AdminLayout";

const PAGE_SIZE = 20;

const TABS = [
  { key: "notices", label: "Notices" },
  { key: "events", label: "Events" },
];

function stripHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return div.textContent || "";
}

function formatEventDate(isoString) {
  return new Date(isoString).toLocaleDateString("default", { day: "numeric", month: "short", year: "numeric" });
}

export default function ReviewQueue() {
  const [tab, setTab] = useState("notices");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const { showError, showSuccess } = useToast();

  const endpoint = tab === "notices" ? "/notices" : "/events";

  async function load() {
    setLoading(true);
    try {
      const data = await api.get(`${endpoint}/pending?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`);
      setItems(data);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [tab, page]);

  function handleTabChange(key) {
    setTab(key);
    setPage(0);
  }

  async function handleApprove(id) {
    setActionLoading(id);
    try {
      await api.patch(`${endpoint}/${id}/approve`);
      setItems((prev) => prev.filter((i) => i.id !== id));
      if (tab === "notices") window.dispatchEvent(new Event(PENDING_COUNT_CHANGED_EVENT));
      showSuccess(tab === "notices" ? "Notice approved" : "Event approved");
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
      await api.patch(`${endpoint}/${id}/reject`, { rejection_notes: notes });
      setItems((prev) => prev.filter((i) => i.id !== id));
      if (tab === "notices") window.dispatchEvent(new Event(PENDING_COUNT_CHANGED_EVENT));
      showSuccess(tab === "notices" ? "Notice rejected" : "Event rejected");
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
      <h1 className="text-2xl font-extrabold text-gray-900 mb-4">Review Queue</h1>

      <div className="flex gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => handleTabChange(t.key)}
            className={`text-xs font-bold px-3 py-1.5 rounded-full ${
              tab === t.key ? "bg-jkuat-green text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-400">Nothing pending review.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item) => (
            <div
              key={item.id}
              className="group flex flex-col bg-white border border-gray-100 rounded-lg overflow-hidden hover:border-gray-200 transition-colors"
            >
              <div className="h-1 bg-amber-400" />

              <div className="flex-1 flex flex-col p-4">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">
                  <span>Pending review</span>
                  <span>·</span>
                  <span>{tab === "notices" ? item.audience : formatEventDate(item.start_date)}</span>
                </div>

                <Link
                  to={tab === "notices" ? `/dashboard/notices/${item.id}` : `/dashboard/events/${item.id}`}
                  className="font-serif text-lg font-bold text-gray-900 leading-snug line-clamp-2 hover:underline"
                >
                  {item.title}
                </Link>

                <p className="text-sm text-gray-500 line-clamp-2 mt-1.5 flex-1">
                  {stripHtml(tab === "notices" ? item.body : item.description)}
                </p>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-50">
                  <span className="text-[11px] text-gray-400">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApprove(item.id)}
                      disabled={actionLoading === item.id}
                      title="Approve"
                      className="flex items-center gap-1 bg-jkuat-green text-white text-xs font-bold px-2.5 py-1.5 rounded disabled:opacity-50"
                    >
                      <Check size={13} /> Approve
                    </button>
                    <button
                      onClick={() => setRejectTarget(item.id)}
                      disabled={actionLoading === item.id}
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

      <Pagination page={page} onPageChange={setPage} hasMore={items.length === PAGE_SIZE} pageSize={PAGE_SIZE} />

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