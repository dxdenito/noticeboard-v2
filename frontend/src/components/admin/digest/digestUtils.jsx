export const DAY_OPTIONS = [
  { value: 0, label: "Monday" },
  { value: 1, label: "Tuesday" },
  { value: 2, label: "Wednesday" },
  { value: 3, label: "Thursday" },
  { value: 4, label: "Friday" },
  { value: 5, label: "Saturday" },
  { value: 6, label: "Sunday" },
];

export const AUDIENCE_LABELS = { student: "Students", staff: "Staff" };

export const SCOPE_OPTIONS = [
  { value: "all", label: "Both lists" },
  { value: "student", label: "Students only" },
  { value: "staff", label: "Staff only" },
];

export const KIND_LABELS = {
  auto: "Weekly (automatic)",
  digest: "Weekly (manual)",
  urgent: "Urgent push",
};

const STATUS_STYLES = {
  completed: "bg-jkuat-green/10 text-jkuat-green",
  running: "bg-blue-50 text-blue-700",
  failed: "bg-red-50 text-red-600",
  skipped: "bg-gray-100 text-gray-600",
};

const STATUS_LABELS = {
  completed: "Sent",
  running: "Sending",
  failed: "Failed",
  skipped: "Skipped",
};

export function formatDateTime(iso) {
  if (!iso) return "–";
  return new Date(iso).toLocaleString("default", {
    day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export function formatDayTime(iso) {
  if (!iso) return "–";
  return new Date(iso).toLocaleString("default", {
    weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
  });
}

export function formatHour(hour) {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function StatusBadge({ status }) {
  return (
    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_STYLES[status] || "bg-gray-100 text-gray-600"}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export function describeResult(result, pending) {
  if (!result) {
    return pending
      ? { text: "Waiting...", tone: "text-gray-400" }
      : { text: "Not included", tone: "text-gray-400" };
  }
  if (result === "sent") return { text: "Sent", tone: "text-jkuat-green" };
  if (result.startsWith("failed")) {
    return { text: result.replace(/^failed:\s*/, "Failed: "), tone: "text-jkuat-red" };
  }
  return { text: result.replace(/^skipped:\s*/, "Skipped: "), tone: "text-gray-500" };
}

export function ResultLine({ label, result, pending = false }) {
  const { text, tone } = describeResult(result, pending);
  return (
    <p className="text-xs">
      <span className="font-semibold text-gray-600">{label}:</span>{" "}
      <span className={`${tone} break-words`}>{text}</span>
    </p>
  );
}