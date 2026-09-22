import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Pin, PinOff } from "lucide-react";
import { api } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import PinFeedModal from "../../components/admin/PinFeedModal";

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString("default", { day: "numeric", month: "short", year: "numeric" });
}

export default function PinnedNotices() {
  const [tab, setTab] = useState("feed"); // "feed" | "site"
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [pinTarget, setPinTarget] = useState(null);
  const { showError, showSuccess } = useToast();

  async function load() {
    try {
      const data = await api.get("/notices/manage");
      setNotices(data);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function unpin(id, kind) {
    setActionLoading(id);
    try {
      await api.patch(`/notices/${id}/unpin-${kind}`);
      showSuccess("Unpinned");
      load();
    } catch (err) {
      showError(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function pinSite(id) {
    setActionLoading(id);
    try {
      await api.patch(`/notices/${id}/pin-site`);
      showSuccess("Pinned");
      load();
    } catch (err) {
      showError(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function confirmPinFeed(expiryDate) {
    const id = pinTarget.id;
    setActionLoading(id);
    try {
      await api.patch(`/notices/${id}/pin-feed`, { expiry_date: expiryDate });
      showSuccess("Pinned");
      setPinTarget(null);
      load();
    } catch (err) {
      showError(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) return <div className="text-gray-400">Loading...</div>;

  const pinnedList = notices.filter((n) => (tab === "feed" ? n.is_pinned_feed : n.is_pinned_site));
  // Site pins can only ever be public notices, so hide non-public ones
  // from that tab's browse list entirely rather than showing a disabled button.
  const browseList = tab === "site" ? notices.filter((n) => n.audience === "public") : notices;

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Pinned Notices</h1>
      <p className="text-sm text-gray-500 mb-4">
        Feed pins are highlighted at the top of the in-app feed, optionally until an expiry date. Site pins appear on the public university website widget.
      </p>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("feed")}
          className={`text-xs font-bold px-3 py-1.5 rounded-full ${
            tab === "feed" ? "bg-jkuat-green text-white" : "bg-gray-100 text-gray-600"
          }`}
        >
          Feed Pins ({notices.filter((n) => n.is_pinned_feed).length})
        </button>
        <button
          onClick={() => setTab("site")}
          className={`text-xs font-bold px-3 py-1.5 rounded-full ${
            tab === "site" ? "bg-jkuat-green text-white" : "bg-gray-100 text-gray-600"
          }`}
        >
          Site Pins ({notices.filter((n) => n.is_pinned_site).length})
        </button>
      </div>

      <section className="mb-8">
        <h2 className="text-xs font-bold text-gray-500 uppercase mb-2">
          Currently Pinned {tab === "site" ? "to Site" : "to Feed"}
        </h2>
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
          {pinnedList.map((n) => (
            <div key={n.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <Link to={`/dashboard/notices/${n.id}`} className="text-sm font-semibold text-gray-900 hover:underline">
                  {n.title}
                </Link>
                {tab === "feed" && (
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {n.expiry_date ? `Pinned until ${formatDate(n.expiry_date)}` : "Pinned indefinitely"}
                  </p>
                )}
              </div>
              <button
                onClick={() => unpin(n.id, tab)}
                disabled={actionLoading === n.id}
                className="text-xs text-jkuat-red flex items-center gap-1 shrink-0"
              >
                <PinOff size={12} /> Unpin
              </button>
            </div>
          ))}
          {pinnedList.length === 0 && (
            <p className="text-sm text-gray-400 px-4 py-6">Nothing pinned {tab === "site" ? "to the site" : "to the feed"} yet.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-xs font-bold text-gray-500 uppercase mb-2">
          {tab === "site" ? "Public Notices" : "All Notices"}
        </h2>
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
          {browseList.map((n) => {
            const isPinned = tab === "site" ? n.is_pinned_site : n.is_pinned_feed;
            return (
              <div key={n.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <Link to={`/dashboard/notices/${n.id}`} className="text-sm font-semibold text-gray-900 hover:underline">
                    {n.title}
                  </Link>
                  <span className="ml-2 text-[10px] font-bold uppercase text-gray-400">{n.audience}</span>
                </div>
                <button
                  onClick={() => {
                    if (isPinned) return unpin(n.id, tab);
                    if (tab === "site") return pinSite(n.id);
                    setPinTarget(n);
                  }}
                  disabled={actionLoading === n.id}
                  className={`text-xs flex items-center gap-1 ${isPinned ? "text-jkuat-red" : "text-jkuat-green"}`}
                >
                  <Pin size={12} /> {isPinned ? "Unpin" : "Pin"}
                </button>
              </div>
            );
          })}
          {browseList.length === 0 && (
            <p className="text-sm text-gray-400 px-4 py-6">No notices available.</p>
          )}
        </div>
      </section>

      {pinTarget && (
        <PinFeedModal
          notice={pinTarget}
          loading={actionLoading === pinTarget.id}
          onCancel={() => setPinTarget(null)}
          onConfirm={confirmPinFeed}
        />
      )}
    </div>
  );
}