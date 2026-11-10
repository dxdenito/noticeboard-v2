import { AlertTriangle, Loader2 } from "lucide-react";
import { AUDIENCE_LABELS, DAY_OPTIONS, formatDayTime, formatHour } from "./digestUtils";

function StatBox({ label, value, hint }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-extrabold text-gray-900 mt-1">{value}</p>
      {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

export default function DigestStatus({ overview }) {
  if (!overview) return null;

  const {
    settings, lists, last_digest, next_run, pending_notice_count,
    scheduler_running, active_run,
  } = overview;

  const pausedActive =
    settings.paused_until && new Date(`${settings.paused_until}T23:59:59`) >= new Date();
  const dayLabel = DAY_OPTIONS.find((d) => d.value === settings.send_day)?.label;

  const warnings = [];
  lists.forEach((item) => {
    if (item.problem) warnings.push(`${AUDIENCE_LABELS[item.audience]} list: ${item.problem}`);
  });
  if (settings.auto_enabled && !scheduler_running) {
    warnings.push(
      "Automatic sending is on, but the scheduler is switched off on the server (DIGEST_SCHEDULER_ENABLED), so nothing will go out by itself."
    );
  }
  if (pausedActive) {
    const until = new Date(`${settings.paused_until}T00:00:00`).toLocaleDateString("default", {
      day: "numeric", month: "short", year: "numeric",
    });
    warnings.push(`Automatic sending is paused until ${until}.`);
  }

  const lastHint = last_digest
    ? `${last_digest.sent_count} ${last_digest.sent_count === 1 ? "list" : "lists"} emailed`
    : "No weekly digest has been sent yet";

  return (
    <div className="space-y-3 mb-6">
      {active_run && (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-lg px-4 py-3">
          <Loader2 size={16} className="animate-spin shrink-0" />
          A digest is being sent right now.
        </div>
      )}

      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 space-y-1">
          {warnings.map((text, index) => (
            <p key={index} className="flex items-start gap-2 text-sm text-amber-900">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              {text}
            </p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatBox
          label="Last weekly digest"
          value={last_digest ? formatDayTime(last_digest.started_at) : "Never"}
          hint={lastHint}
        />
        <StatBox
          label="Next automatic send"
          value={settings.auto_enabled ? (next_run ? formatDayTime(next_run) : "–") : "Off"}
          hint={
            settings.auto_enabled
              ? `Every ${dayLabel} at ${formatHour(settings.send_hour)}`
              : "Manual pushes only"
          }
        />
        <StatBox
          label="New notices waiting"
          value={pending_notice_count}
          hint="Published since the last weekly digest"
        />
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
          <p className="text-xs text-gray-500">Group addresses</p>
          {lists.map((item) => (
            <div key={item.audience}>
              <p className="text-[11px] font-semibold text-gray-500">{AUDIENCE_LABELS[item.audience]}</p>
              <p className={`text-xs break-all ${item.email ? "text-gray-800" : "text-gray-400 italic"}`}>
                {item.email || "Not set"}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}