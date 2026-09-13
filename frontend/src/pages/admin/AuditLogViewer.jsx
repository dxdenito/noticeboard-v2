import { useState, useEffect } from "react";
import { api } from "../../api/client";
import { useToast } from "../../context/ToastContext";

const PAGE_SIZE = 25;

const ACTION_COLORS = {
  create: "text-jkuat-green",
  approve: "text-jkuat-green",
  grant: "text-jkuat-green",
  update: "text-blue-600",
  reject: "text-jkuat-red",
  revoke: "text-jkuat-red",
  delete: "text-jkuat-red",
};

function actionColor(action) {
  const suffix = action.split(".").pop();
  return ACTION_COLORS[suffix] || "text-gray-600";
}

export default function AuditLogViewer() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [targetType, setTargetType] = useState("");
  const [action, setAction] = useState("");
  const { showError } = useToast();

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      });
      if (targetType) params.set("target_type", targetType);
      if (action) params.set("action", action);
      const data = await api.get(`/audit-logs/?${params.toString()}`);
      setLogs(data);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [page, targetType, action]);
  useEffect(() => { setPage(0); }, [targetType, action]);

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-4">Audit Log</h1>

      <div className="flex gap-2 mb-4 flex-wrap">
        <select
          value={targetType}
          onChange={(e) => setTargetType(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs"
        >
          <option value="">All target types</option>
          <option value="notice">Notice</option>
          <option value="org_unit">Org unit</option>
        </select>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs"
        >
          <option value="">All actions</option>
          <option value="notice.create">notice.create</option>
          <option value="notice.approve">notice.approve</option>
          <option value="notice.reject">notice.reject</option>
          <option value="notice.delete">notice.delete</option>
          <option value="scope.grant.post">scope.grant.post</option>
          <option value="scope.grant.approve">scope.grant.approve</option>
          <option value="scope.revoke.post">scope.revoke.post</option>
          <option value="scope.revoke.approve">scope.revoke.approve</option>
          <option value="org_unit.create">org_unit.create</option>
          <option value="org_unit.update">org_unit.update</option>
          <option value="org_unit.delete">org_unit.delete</option>
        </select>
      </div>

      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {logs.map((log) => (
            <div key={log.id} className="px-4 py-3 text-sm flex items-center justify-between gap-4">
              <div className="min-w-0">
                <span className="text-gray-500">{log.actor?.full_name || "System"}</span>{" "}
                <span className={`font-bold ${actionColor(log.action)}`}>{log.action}</span>{" "}
                <span className="text-gray-700">{log.target_label || `${log.target_type} #${log.target_id}`}</span>
                {log.details && <span className="text-gray-400"> — {log.details}</span>}
              </div>
              <span className="text-xs text-gray-400 shrink-0">
                {new Date(log.created_at).toLocaleString()}
              </span>
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