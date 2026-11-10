import { useState, useEffect, useCallback } from "react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { canSendDigest, canManageDigestSettings } from "../../lib/permissions";
import DigestStatus from "../../components/admin/digest/DigestStatus";
import DigestSend from "../../components/admin/digest/DigestSend";
import DigestHistory from "../../components/admin/digest/DigestHistory";
import DigestSettings from "../../components/admin/digest/DigestSettings";

export default function EmailDigest() {
  const { user } = useAuth();
  const { showError } = useToast();
  const [tab, setTab] = useState("send");
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  const canSend = canSendDigest(user);
  const canSettings = canManageDigestSettings(user);

  const loadOverview = useCallback(async () => {
    try {
      const data = await api.get("/digest/overview");
      setOverview(data);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canSend) loadOverview();
  }, [canSend, loadOverview]);

  const activeRunId = overview?.active_run?.id;
  useEffect(() => {
    if (!activeRunId) return;
    const timer = setInterval(loadOverview, 3000);
    return () => clearInterval(timer);
  }, [activeRunId, loadOverview]);

  if (!canSend) return <div className="text-gray-400">You don't have access to this page.</div>;
  if (loading) return <div className="text-gray-400">Loading...</div>;
  if (!overview) return <div className="text-gray-400">Could not load the email digest.</div>;

  const tabs = [
    { key: "send", label: "Send" },
    { key: "history", label: "History" },
    ...(canSettings ? [{ key: "settings", label: "Settings" }] : []),
  ];

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Email Digest</h1>
      <p className="text-sm text-gray-500 mb-4">
        Email notices to the student and staff group lists, weekly or as an urgent push.
      </p>

      <DigestStatus overview={overview} />

      <div className="flex gap-2 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-xs font-bold px-4 py-2 rounded-full ${
              tab === t.key ? "bg-jkuat-green text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "send" && <DigestSend overview={overview} onSent={loadOverview} />}
      {tab === "history" && <DigestHistory refreshKey={overview.last_any?.id ?? 0} />}
      {tab === "settings" && canSettings && (
        <DigestSettings overview={overview} onSaved={loadOverview} />
      )}
    </div>
  );
}