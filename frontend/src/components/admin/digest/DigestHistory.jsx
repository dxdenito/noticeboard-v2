import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { api } from "../../../api/client";
import { useToast } from "../../../context/ToastContext";
import Pagination from "../Pagination";
import { KIND_LABELS, StatusBadge, ResultLine, formatDateTime } from "./digestUtils";

const PAGE_SIZE = 15;

export default function DigestHistory({ refreshKey }) {
  const { showError } = useToast();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get(`/digest/runs?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`)
      .then((data) => {
        if (!cancelled) setRuns(data);
      })
      .catch((err) => showError(err.message))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, refreshKey]);

  if (loading) return <div className="text-gray-400">Loading...</div>;

  return (
    <div>
      {runs.length === 0 ? (
        <p className="text-sm text-gray-400">Nothing has been sent yet.</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {runs.map((run) => {
            const open = openId === run.id;
            return (
              <div key={run.id} className="px-4 py-3">
                <button
                  onClick={() => setOpenId(open ? null : run.id)}
                  className="w-full flex items-start justify-between gap-3 text-left"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <StatusBadge status={run.status} />
                      <span className="text-[11px] font-bold uppercase text-gray-500">
                        {KIND_LABELS[run.kind] || run.kind}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {run.subject || "(no subject)"}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {formatDateTime(run.started_at)} · {run.triggered_by || "Automatic"}
                    </p>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`text-gray-400 shrink-0 mt-1 transition-transform ${open ? "rotate-180" : ""}`}
                  />
                </button>

                {open && (
                  <div className="mt-3 pl-1 space-y-3">
                    <div className="space-y-1">
                      <ResultLine label="Students list" result={run.student_result} />
                      <ResultLine label="Staff list" result={run.staff_result} />
                    </div>
                    {run.note && <p className="text-xs text-amber-700">{run.note}</p>}
                    {run.window_start && (
                      <p className="text-xs text-gray-500">
                        Covered notices published after {formatDateTime(run.window_start)}.
                      </p>
                    )}
                    <div>
                      <p className="text-[11px] font-bold uppercase text-gray-400 mb-1">
                        Notices included ({run.notices.length})
                      </p>
                      <ul className="space-y-0.5">
                        {run.notices.map((notice) => (
                          <li key={notice.id} className="text-xs">
                            <Link
                              to={`/dashboard/notices/${notice.id}`}
                              className="text-jkuat-green hover:underline"
                            >
                              {notice.title}
                            </Link>
                          </li>
                        ))}
                        {run.notices.length === 0 && (
                          <li className="text-xs text-gray-400">None</li>
                        )}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Pagination page={page} onPageChange={setPage} hasMore={runs.length === PAGE_SIZE} pageSize={PAGE_SIZE} />
    </div>
  );
}