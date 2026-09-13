// src/pages/dashboard/ManageTags.jsx
import { useState, useEffect } from "react";
import { api } from "../../api/client";
import { useToast } from "../../context/ToastContext";

export default function ManageTags() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reassignTarget, setReassignTarget] = useState(null);
  const [reassignToId, setReassignToId] = useState("");
  const { showError, showSuccess } = useToast();

  async function load() {
    setLoading(true);
    try {
      const data = await api.get("/categories/");
      setCategories(data);
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
      await api.post("/categories/", { name });
      showSuccess("Category created");
      setName("");
      load();
    } catch (err) {
      showError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(item) {
    try {
      await api.delete(`/categories/${item.id}`);
      showSuccess("Deleted");
      load();
    } catch (err) {
      if (err.message.includes("existing notices")) {
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
      await api.patch(`/categories/${reassignTarget.id}/reassign-notices?to_id=${reassignToId}`);
      await api.delete(`/categories/${reassignTarget.id}`);
      showSuccess("Notices reassigned and category deleted");
      setReassignTarget(null);
      load();
    } catch (err) {
      showError(err.message);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-4">Manage Categories</h1>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-4 mb-6 flex gap-2">
        <input
          type="text"
          placeholder="Category name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 min-w-[150px] border border-gray-200 rounded-lg px-3 py-2 text-sm"
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
          {categories.map((item) => (
            <div key={item.id} className="px-4 py-3 text-sm text-gray-900 flex items-center justify-between">
              <span>{item.name}</span>
              <button onClick={() => handleDelete(item)} className="text-xs text-jkuat-red">
                Delete
              </button>
            </div>
          ))}
          {categories.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-6">No categories yet.</p>
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
              <option value="">Select category</option>
              {categories
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