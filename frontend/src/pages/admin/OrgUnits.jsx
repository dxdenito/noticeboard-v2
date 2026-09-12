import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { api } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import OrgUnitNode, { OrgUnitForm } from "../../components/admin/OrgUnitNode";

export default function OrgUnits() {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRootForm, setShowRootForm] = useState(false);
  const { showError, showSuccess } = useToast();

  async function loadTree() {
    try {
      const data = await api.get("/org-units/tree");
      setTree(data);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTree();
  }, []);

  async function handleCreateChild(parentId, data) {
    try {
      await api.post("/org-units/", { ...data, parent_id: parentId });
      showSuccess("Org unit created");
      await loadTree();
    } catch (err) {
      showError(err.message);
    }
  }

  async function handleCreateRoot(data) {
    try {
      await api.post("/org-units/", { ...data, parent_id: null });
      showSuccess("Division created");
      setShowRootForm(false);
      await loadTree();
    } catch (err) {
      showError(err.message);
    }
  }

  async function handleUpdate(id, data) {
    try {
      await api.patch(`/org-units/${id}`, data);
      showSuccess("Org unit updated");
      await loadTree();
    } catch (err) {
      showError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this org unit?")) return;
    try {
      await api.delete(`/org-units/${id}`);
      showSuccess("Org unit deleted");
      await loadTree();
    } catch (err) {
      showError(err.message);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Loading org units...</div>;
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-black text-gray-900">Org Units</h1>
        <button
          onClick={() => setShowRootForm((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-jkuat-green text-white rounded-lg"
        >
          <Plus size={15} /> Add Division
        </button>
      </div>

      {showRootForm && (
        <div className="mb-6">
          <OrgUnitForm onSave={handleCreateRoot} onCancel={() => setShowRootForm(false)} />
        </div>
      )}

      {tree.length === 0 && !showRootForm && (
        <p className="text-sm text-gray-400 italic">No org units yet — add your first division above.</p>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        {tree.map((root) => (
          <OrgUnitNode
            key={root.id}
            node={root}
            onCreateChild={handleCreateChild}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}