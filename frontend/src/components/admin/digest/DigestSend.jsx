import { useState, useEffect, useRef } from "react";
import { Search, Send, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { api } from "../../../api/client";
import { useToast } from "../../../context/ToastContext";
import {
  AUDIENCE_LABELS, SCOPE_OPTIONS, StatusBadge, ResultLine, formatDateTime,
} from "./digestUtils";

const MAX_URGENT = 10;

const KIND_CARDS = [
  { key: "digest", title: "Weekly digest", text: "Everything published since the last weekly digest." },
  { key: "urgent", title: "Urgent push", text: "Pick the notices to email right now." },
];

export default function DigestSend({ overview, onSent }) {
  const { showError, showSuccess } = useToast();
  const [kind, setKind] = useState("digest");
  const [scope, setScope] = useState("all");
  const [subject, setSubject] = useState("");
  const [intro, setIntro] = useState("");
  const [recent, setRecent] = useState([]);
  const [recentLoaded, setRecentLoaded] = useState(false);
  const [recentSearch, setRecentSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [activeAudience, setActiveAudience] = useState("student");
  const [testing, setTesting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [sending, setSending] = useState(false);
  const [run, setRun] = useState(null);
  const requestId = useRef(0);

  const busy = !!overview?.active_run || (run && run.status === "running");

  function requestBody(extra = {}) {
    return {
      kind,
      notice_ids: kind === "urgent" ? selected : [],
      subject: subject.trim() || null,
      intro: intro.trim() || null,
      scope,
      ...extra,
    };
  }

  useEffect(() => {
    if (kind !== "urgent" || recentLoaded) return;
    api.get("/digest/notices?days=30")
      .then((data) => {
        setRecent(data);
        setRecentLoaded(true);
      })
      .catch((err) => showError(err.message));
  }, [kind, recentLoaded]);

  useEffect(() => {
    if (kind === "urgent" && selected.length === 0) {
      requestId.current += 1;
      setPreview(null);
      setPreviewLoading(false);
      return;
    }
    requestId.current += 1;
    const id = requestId.current;
    setPreviewLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await api.post("/digest/preview", requestBody());
        if (id === requestId.current) setPreview(data);
      } catch (err) {
        if (id === requestId.current) {
          setPreview(null);
          showError(err.message);
        }
      } finally {
        if (id === requestId.current) setPreviewLoading(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [kind, scope, subject, intro, selected, overview?.last_any?.id]);

  useEffect(() => {
    if (!run || run.status !== "running") return;
    const timer = setInterval(async () => {
      try {
        const latest = await api.get(`/digest/runs/${run.id}`);
        setRun(latest);
        if (latest.status !== "running") {
          onSent();
          if (latest.status === "completed") {
            showSuccess("Email sent");
          } else {
            showError("The email was not sent. See the details below.");
          }
        }
      } catch {
        return;
      }
    }, 1500);
    return () => clearInterval(timer);
  }, [run?.id, run?.status]);

  function toggleNotice(id) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_URGENT) return prev;
      return [...prev, id];
    });
  }

  async function handleTest() {
    if (!current) return;
    setTesting(true);
    try {
      const result = await api.post("/digest/test", requestBody({ audience: current.audience }));
      showSuccess(result.message);
    } catch (err) {
      showError(err.message);
    } finally {
      setTesting(false);
    }
  }

  async function handleConfirm() {
    setSending(true);
    try {
      const started = await api.post("/digest/send", requestBody());
      setRun(started);
      setConfirmOpen(false);
      setChecked(false);
      onSent();
    } catch (err) {
      showError(err.message);
    } finally {
      setSending(false);
    }
  }

  function dismissRun() {
    if (kind === "urgent" && run?.status === "completed") {
      setSelected([]);
      setSubject("");
      setIntro("");
    }
    setRun(null);
  }

  const variants = preview ? preview.variants : [];
  const current =
    variants.find((v) => v.audience === activeAudience && v.html) ||
    variants.find((v) => v.html) ||
    null;
  const sendable = variants.filter((v) => v.will_send);
  const problems = variants.filter((v) => !v.will_send && v.problem);
  const canSend =
    !busy && !previewLoading && !!preview && preview.lists_total > 0 &&
    (kind === "digest" || selected.length > 0);

  const needle = recentSearch.trim().toLowerCase();
  const visibleRecent = recent.filter((n) => n.title.toLowerCase().includes(needle));

  return (
    <div className="space-y-6">
      {run && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              {run.status === "running" && <Loader2 size={16} className="animate-spin text-blue-600" />}
              {run.status === "completed" && <CheckCircle2 size={16} className="text-jkuat-green" />}
              {(run.status === "failed" || run.status === "skipped") && (
                <XCircle size={16} className="text-jkuat-red" />
              )}
              <p className="text-sm font-bold text-gray-900">
                {run.status === "running" ? "Sending..." : "Send finished"}
              </p>
            </div>
            <StatusBadge status={run.status} />
          </div>
          {run.subject && <p className="text-xs text-gray-500 mb-2 truncate">{run.subject}</p>}
          <div className="space-y-1">
            <ResultLine label="Students list" result={run.student_result} pending={run.status === "running"} />
            <ResultLine label="Staff list" result={run.staff_result} pending={run.status === "running"} />
          </div>
          {run.note && <p className="text-xs text-amber-700 mt-2">{run.note}</p>}
          {run.status !== "running" && (
            <button
              onClick={dismissRun}
              className="mt-3 text-xs font-bold text-jkuat-green hover:underline"
            >
              Done
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {KIND_CARDS.map((card) => (
          <button
            key={card.key}
            onClick={() => setKind(card.key)}
            className={`text-left rounded-lg border p-4 transition-colors ${
              kind === card.key
                ? "border-jkuat-green bg-jkuat-green/5"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <p className={`text-sm font-bold ${kind === card.key ? "text-jkuat-green" : "text-gray-900"}`}>
              {card.title}
            </p>
            <p className="text-xs text-gray-500 mt-1">{card.text}</p>
          </button>
        ))}
      </div>

      {kind === "urgent" && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <p className="text-sm font-bold text-gray-900">
              Choose notices{" "}
              <span className="text-xs font-normal text-gray-400">
                ({selected.length} of {MAX_URGENT} selected)
              </span>
            </p>
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={recentSearch}
                onChange={(e) => setRecentSearch(e.target.value)}
                placeholder="Search recent notices..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg"
              />
            </div>
          </div>

          {!recentLoaded && <p className="text-xs text-gray-400">Loading...</p>}
          {recentLoaded && visibleRecent.length === 0 && (
            <p className="text-xs text-gray-400">No published notices from the last 30 days.</p>
          )}
          <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
            {visibleRecent.map((notice) => {
              const isSelected = selected.includes(notice.id);
              const locked = !isSelected && selected.length >= MAX_URGENT;
              return (
                <label
                  key={notice.id}
                  className={`flex items-start gap-3 py-2.5 ${locked ? "opacity-40" : "cursor-pointer"}`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={locked}
                    onChange={() => toggleNotice(notice.id)}
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{notice.title}</p>
                    <p className="text-[11px] text-gray-400 flex flex-wrap gap-x-2 items-center">
                      <span className="uppercase font-bold">{notice.audience}</span>
                      {notice.category && <span>{notice.category}</span>}
                      <span>{formatDateTime(notice.published_at)}</span>
                      {notice.already_sent && (
                        <span className="text-amber-700 font-semibold">Already emailed</span>
                      )}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">Send to</label>
          <div className="flex flex-wrap gap-2">
            {SCOPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setScope(option.value)}
                className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                  scope === option.value ? "bg-jkuat-green text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Subject (optional)</label>
          <input
            type="text"
            value={subject}
            maxLength={200}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Leave blank to use the default"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Opening message (optional)</label>
          <textarea
            rows={2}
            value={intro}
            maxLength={1000}
            onChange={(e) => setIntro(e.target.value)}
            placeholder="Leave blank to use the default"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <p className="text-sm font-bold text-gray-900">Preview</p>
          {previewLoading && <Loader2 size={15} className="animate-spin text-gray-400" />}
        </div>

        {kind === "urgent" && selected.length === 0 && (
          <p className="text-sm text-gray-400">Select at least one notice to see the email.</p>
        )}

        {preview && preview.notice_count === 0 && kind === "digest" && (
          <p className="text-sm text-gray-500">
            There are no new notices to send
            {preview.window_start ? ` since ${formatDateTime(preview.window_start)}` : ""}.
          </p>
        )}

        {preview && problems.length > 0 && (
          <div className="mb-3 space-y-1">
            {problems.map((v) => (
              <p key={v.audience} className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                {AUDIENCE_LABELS[v.audience]} list will not be sent: {v.problem}
              </p>
            ))}
          </div>
        )}

        {current && (
          <>
            <div className="flex flex-wrap gap-2 mb-3">
              {variants.filter((v) => v.html).map((v) => (
                <button
                  key={v.audience}
                  onClick={() => setActiveAudience(v.audience)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                    current.audience === v.audience ? "bg-jkuat-green text-white" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {AUDIENCE_LABELS[v.audience]} ({v.notice_count})
                </button>
              ))}
            </div>
            <div className="mb-3 text-xs text-gray-500 space-y-0.5">
              <p>
                <span className="font-semibold text-gray-600">To:</span>{" "}
                {current.list_email || <span className="italic">no address set</span>}
              </p>
              <p>
                <span className="font-semibold text-gray-600">Subject:</span> {current.subject}
              </p>
            </div>
            <iframe
              title="Email preview"
              sandbox=""
              srcDoc={current.html}
              className="w-full h-[560px] rounded-lg border border-gray-200 bg-white"
            />
            <p className="text-[11px] text-gray-400 mt-2">
              This is the exact email. Links are switched off in the preview.
            </p>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleTest}
          disabled={!current || testing || busy}
          className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold border border-gray-200 bg-white text-gray-700 rounded-lg disabled:opacity-40"
        >
          {testing ? "Sending test..." : `Send test of ${current ? AUDIENCE_LABELS[current.audience].toLowerCase() : "email"} version to me`}
        </button>
        <button
          onClick={() => setConfirmOpen(true)}
          disabled={!canSend}
          className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold text-white rounded-lg disabled:opacity-40 ${
            kind === "urgent" ? "bg-jkuat-red" : "bg-jkuat-green"
          }`}
        >
          <Send size={15} />
          {kind === "urgent" ? "Send urgent push" : "Send digest now"}
        </button>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold text-lg mb-1">
              {kind === "urgent" ? "Send urgent push?" : "Send weekly digest now?"}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              This emails the whole group list and cannot be recalled.
            </p>

            <div className="space-y-3 mb-4">
              {sendable.map((v) => (
                <div key={v.audience} className="border border-gray-200 rounded-lg p-3">
                  <p className="text-xs font-bold text-gray-700">{AUDIENCE_LABELS[v.audience]} list</p>
                  <p className="text-xs text-gray-500 break-all">{v.list_email}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {v.notice_count} {v.notice_count === 1 ? "notice" : "notices"} · {v.subject}
                  </p>
                </div>
              ))}
            </div>

            <label className="flex items-start gap-2 text-sm text-gray-700 mb-4">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="mt-1"
              />
              I have checked the preview and the notices are correct.
            </label>

            <div className="flex gap-2">
              <button
                onClick={handleConfirm}
                disabled={!checked || sending}
                className={`flex-1 text-white font-bold py-2 rounded-lg disabled:opacity-40 ${
                  kind === "urgent" ? "bg-jkuat-red" : "bg-jkuat-green"
                }`}
              >
                {sending ? "Starting..." : `Send to ${sendable.length} ${sendable.length === 1 ? "list" : "lists"}`}
              </button>
              <button
                onClick={() => {
                  setConfirmOpen(false);
                  setChecked(false);
                }}
                disabled={sending}
                className="flex-1 bg-gray-100 text-gray-700 font-bold py-2 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}