// src/pages/dashboard/ManageTags.jsx
import { useState, useEffect } from "react";
import { api } from "../../api/client";
import { useToast } from "../../context/ToastContext";

const TABS = [
  { key: "departments", label: "Departments", fields: ["name", "code"] },
  { key: "clubs", label: "Clubs", fields: ["name", "description"] },
  { key: "courses", label: "Courses", fields: ["name", "code", "department_id"] },
  { key: "categories", label: "Categories", fields: ["name"] },
];

export default function ManageTags() {
  const [activeTab, setActiveTab] = useState("departments");
  const [items, setItems] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [reassignTarget, setReassignTarget] = useState(null); // item pending reassignment
  const [reassignToId, setReassignToId] = useState("");
  const { showError, showSuccess } = useToast();

  const tabConfig = TABS.find((t) => t.key === activeTab);

  useEffect(() => {
    api.get("/departments/").then(setDepartments).catch(() => {});
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await api.get(`/${activeTab}/`);
      setItems(data);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setForm({});
    load();
  }, [activeTab]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(`/${activeTab}/`, form);
      showSuccess("Created");
      setForm({});
      load();
    } catch (err) {
      showError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(item) {
    try {
      await api.delete(`/${activeTab}/${item.id}`);
      showSuccess("Deleted");
      load();
    } catch (err) {
      if (err.message.includes("still reference")) {
        setReassignTarget(item);
        setReassignToId("");
      } else {
        showError(err.message);
      }
    }
  }

  async function confirmReassignAndDelete() {
    if (!reassignToId) return;
    try {
      await api.patch(`/${activeTab}/${reassignTarget.id}/reassign-notices?to_id=${reassignToId}`);
      await api.delete(`/${activeTab}/${reassignTarget.id}`);
      showSuccess("Notices reassigned and item deleted");
      setReassignTarget(null);
      load();
    } catch (err) {
      showError(err.message);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-4">Manage Tags</h1>

      <div className="flex gap-2 mb-4 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`text-xs font-bold px-3 py-1.5 rounded-full ${
              activeTab === t.key ? "bg-jkuat-green text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-4 mb-6 flex flex-wrap gap-2">
        {tabConfig.fields.map((field) =>
          field === "department_id" ? (
            <select
              key={field}
              required
              value={form.department_id || ""}
              onChange={(e) => setForm((f) => ({ ...f, department_id: Number(e.target.value) }))}
              className="flex-1 min-w-[150px] border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          ) : (
            <input
              key={field}
              type="text"
              placeholder={field}
              required={field !== "description"}
              value={form[field] || ""}
              onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
              className="flex-1 min-w-[150px] border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          )
        )}
        <button type="submit" disabled={submitting}
          className="bg-jkuat-green text-white font-bold px-4 py-2 rounded-lg disabled:opacity-50">
          Add
        </button>
      </form>

      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {items.map((item) => (
            <div key={item.id} className="px-4 py-3 text-sm text-gray-900 flex items-center justify-between">
              <span>{item.name} {item.code && <span className="text-gray-400">({item.code})</span>}</span>
              <button onClick={() => handleDelete(item)} className="text-xs text-jkuat-red">
                Delete
              </button>
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-6">Nothing here yet.</p>
          )}
        </div>
      )}

      {reassignTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-lg mb-2">Reassign before deleting</h3>
            <p className="text-sm text-gray-500 mb-4">
              "{reassignTarget.name}" still has notices referencing it. Choose where to move them before deleting.
            </p>
            <select
              value={reassignToId}
              onChange={(e) => setReassignToId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4"
            >
              <option value="">Select {tabConfig.label.slice(0, -1).toLowerCase()}</option>
              {items
                .filter((i) => i.id !== reassignTarget.id)
                .map((i) => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={confirmReassignAndDelete}
                disabled={!reassignToId}
                className="flex-1 bg-jkuat-green text-white font-bold py-2 rounded-lg disabled:opacity-50"
              >
                Reassign & Delete
              </button>
              <button
                onClick={() => setReassignTarget(null)}
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