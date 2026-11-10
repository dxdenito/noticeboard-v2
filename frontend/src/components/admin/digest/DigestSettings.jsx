import { useState, useEffect } from "react";
import { api } from "../../../api/client";
import { useToast } from "../../../context/ToastContext";
import { AUDIENCE_LABELS, DAY_OPTIONS, formatHour } from "./digestUtils";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

function toForm(settings) {
  return {
    auto_enabled: settings.auto_enabled,
    send_day: String(settings.send_day),
    send_hour: String(settings.send_hour),
    max_notices: String(settings.max_notices),
    excerpt_length: String(settings.excerpt_length),
    include_events: settings.include_events,
    paused_until: settings.paused_until || "",
    student_list_email: settings.student_list_email || "",
    staff_list_email: settings.staff_list_email || "",
  };
}

function toPayload(form) {
  return {
    auto_enabled: form.auto_enabled,
    send_day: Number(form.send_day),
    send_hour: Number(form.send_hour),
    max_notices: Number(form.max_notices),
    excerpt_length: Number(form.excerpt_length),
    include_events: form.include_events,
    paused_until: form.paused_until || null,
    student_list_email: form.student_list_email.trim() || null,
    staff_list_email: form.staff_list_email.trim() || null,
  };
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm";

export default function DigestSettings({ overview, onSaved }) {
  const { showError, showSuccess } = useToast();
  const settings = overview.settings;
  const lists = overview.lists;
  const [form, setForm] = useState(() => toForm(settings));
  const [saving, setSaving] = useState(false);

  const settingsKey = JSON.stringify(settings);
  useEffect(() => {
    setForm(toForm(settings));
  }, [settingsKey]);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const dirty = JSON.stringify(toPayload(form)) !== JSON.stringify(toPayload(toForm(settings)));

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = toPayload(form);
    if (payload.max_notices < 1 || payload.max_notices > 10) {
      showError("Notices per digest must be between 1 and 10");
      return;
    }
    if (payload.excerpt_length < 60 || payload.excerpt_length > 400) {
      showError("Excerpt length must be between 60 and 400 characters");
      return;
    }
    setSaving(true);
    try {
      await api.patch("/digest/settings", payload);
      showSuccess("Settings saved");
      onSaved();
    } catch (err) {
      showError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function problemFor(audience) {
    const item = lists.find((l) => l.audience === audience);
    return item && item.email ? item.problem : null;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      <section className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-gray-900">Group addresses</h2>
          <p className="text-xs text-gray-500 mt-1">
            Each push sends one email to each address, and your mail server delivers it to everyone on the list.
            The domain must be registered under Institutional Domains for the same audience.
          </p>
        </div>
        {["student", "staff"].map((audience) => {
          const key = `${audience}_list_email`;
          const problem = problemFor(audience);
          return (
            <Field key={audience} label={`${AUDIENCE_LABELS[audience]} list address`}>
              <input
                type="email"
                value={form[key]}
                onChange={(e) => update(key, e.target.value)}
                placeholder={audience === "student" ? "students@students.example.ac.ke" : "everyone@example.ac.ke"}
                className={inputClass}
              />
              {problem && <p className="text-[11px] text-jkuat-red mt-1">{problem}</p>}
            </Field>
          );
        })}
      </section>

      <section className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-gray-900">Automatic weekly send</h2>
          <p className="text-xs text-gray-500 mt-1">
            When this is off, nothing is sent unless you push manually. Times are East Africa Time.
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-800">
          <input
            type="checkbox"
            checked={form.auto_enabled}
            onChange={(e) => update("auto_enabled", e.target.checked)}
          />
          Send the weekly digest automatically
        </label>

        {form.auto_enabled && !overview.scheduler_running && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            The scheduler is switched off on the server (DIGEST_SCHEDULER_ENABLED), so saving this will not send anything by itself.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Day">
            <select
              value={form.send_day}
              onChange={(e) => update("send_day", e.target.value)}
              className={inputClass}
            >
              {DAY_OPTIONS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Time" hint="It sends once, at the first check after this hour.">
            <select
              value={form.send_hour}
              onChange={(e) => update("send_hour", e.target.value)}
              className={inputClass}
            >
              {HOURS.map((hour) => (
                <option key={hour} value={hour}>{formatHour(hour)}</option>
              ))}
            </select>
          </Field>
          <Field label="Pause until (optional)" hint="Skips automatic sends up to and including this date.">
            <div className="flex gap-2">
              <input
                type="date"
                value={form.paused_until}
                onChange={(e) => update("paused_until", e.target.value)}
                className={inputClass}
              />
              {form.paused_until && (
                <button
                  type="button"
                  onClick={() => update("paused_until", "")}
                  className="text-xs font-semibold text-gray-500 shrink-0"
                >
                  Clear
                </button>
              )}
            </div>
          </Field>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
        <h2 className="text-sm font-bold text-gray-900">Email content</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Notices shown per digest" hint="Between 1 and 10. The rest appear as 'and N more'.">
            <input
              type="number"
              min={1}
              max={10}
              value={form.max_notices}
              onChange={(e) => update("max_notices", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Excerpt length (characters)" hint="Between 60 and 400.">
            <input
              type="number"
              min={60}
              max={400}
              value={form.excerpt_length}
              onChange={(e) => update("excerpt_length", e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-800">
          <input
            type="checkbox"
            checked={form.include_events}
            onChange={(e) => update("include_events", e.target.checked)}
          />
          Add a "Coming up this week" list of events to the weekly digest
        </label>
      </section>

      <button
        type="submit"
        disabled={!dirty || saving}
        className="bg-jkuat-green text-white font-bold px-6 py-2.5 rounded-lg disabled:opacity-40"
      >
        {saving ? "Saving..." : "Save settings"}
      </button>
    </form>
  );
}