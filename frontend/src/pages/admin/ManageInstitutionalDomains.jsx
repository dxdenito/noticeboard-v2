import { useState, useEffect } from "react";
import { api } from "../../api/client";
import { useToast } from "../../context/ToastContext";

const AUDIENCE_STYLES = {
  student: "bg-jkuat-blue/10 text-jkuat-blue",
  staff: "bg-jkuat-green/10 text-jkuat-green",
};

export default function ManageInstitutionalDomains() {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [domain, setDomain] = useState("");
  const [audience, setAudience] = useState("student");
  const [label, setLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { showError, showSuccess } = useToast();

  async function load() {
    setLoading(true);
    try {
      const data = await api.get("/institutional-domains/");
      setDomains(data);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/institutional-domains/", { domain, audience, label: label || null });
      showSuccess("Domain added");
      setDomain("");
      setLabel("");
      load();
    } catch (err) {
      showError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(item) {
    if (!confirm(`Remove ${item.domain}? Visitors with this email domain will no longer unlock notices.`)) return;
    try {
      await api.delete(`/institutional-domains/${item.id}`);
      showSuccess("Deleted");
      load();
    } catch (err) {
      showError(err.message);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Institutional Email Domains</h1>
      <p className="text-sm text-gray-500 mb-4">
        Visitors verifying with an email matching one of these domains unlock student/staff notices accordingly.
      </p>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-4 mb-6 flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="e.g. students.jkuat.ac.ke"
          required
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className="flex-1 min-w-[200px] border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
        <select
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="student">Student</option>
          <option value="staff">Staff</option>
        </select>
        <input
          type="text"
          placeholder="Label (optional, e.g. Karen Campus Students)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="flex-1 min-w-[200px] border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
        <button type="submit" disabled={submitting}
          className="bg-jkuat-green text-white font-bold px-4 py-2 rounded-lg disabled:opacity-50">
          Add
        </button>
      </form>

      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {domains.map((item) => (
            <div key={item.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">@{item.domain}</span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${AUDIENCE_STYLES[item.audience]}`}>
                    {item.audience}
                  </span>
                </div>
                {item.label && (
                  <p className="text-xs text-gray-400 mt-0.5">{item.label}</p>
                )}
              </div>
              <button onClick={() => handleDelete(item)} className="text-xs text-jkuat-red shrink-0">
                Delete
              </button>
            </div>
          ))}
          {domains.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-6">No domains configured yet.</p>
          )}
        </div>
      )}
    </div>
  );
}