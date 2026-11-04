import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { api } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import OrgUnitNode, { OrgUnitForm } from "../../components/admin/OrgUnitNode";

function flattenTree(nodes, path = []) {
  let result = [];
  for (const node of nodes) {
    const label = [...path, node.name].join(" › ");
    result.push({ id: node.id, label });
    if (node.children && node.children.length > 0) {
      result = result.concat(flattenTree(node.children, [...path, node.name]));
    }
  }
  return result;
}

function describeUsage(usage) {
  const parts = [
    [usage.users, "user"],
    [usage.notices, "notice"],
    [usage.events, "event"],
    [usage.scopes, "scope grant"],
  ];
  return parts
    .filter(([count]) => count > 0)
    .map(([count, label]) => `${count} ${label}${count === 1 ? "" : "s"}`)
    .join(", ");
}

export default function OrgUnits() {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRootForm, setShowRootForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [reassignTo, setReassignTo] = useState("");
  const [deleting, setDeleting] = useState(false);
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
    try {
      const usage = await api.get(`/org-units/${id}/usage`);
      const unit = flattenTree(tree).find((u) => u.id === id);
      const label = unit ? unit.label : "this org unit";
      const needsReassign = usage.users + usage.notices + usage.events + usage.scopes > 0;

      if (!needsReassign) {
        if (!confirm(`Delete ${label}?`)) return;
        await api.delete(`/org-units/${id}`);
        showSuccess("Org unit deleted");
        await loadTree();
        return;
      }

      setReassignTo("");
      setDeleteTarget({ id, label, usage });
    } catch (err) {
      showError(err.message);
    }
  }

  async function confirmReassignDelete() {
    if (!reassignTo) return;
    setDeleting(true);
    try {
      await api.delete(`/org-units/${deleteTarget.id}?reassign_to=${reassignTo}`);
      showSuccess("Org unit deleted and its records were moved");
      setDeleteTarget(null);
      await loadTree();
    } catch (err) {
      showError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Loading org units...</div>;
  }

  const replacementOptions = deleteTarget
    ? flattenTree(tree).filter((u) => u.id !== deleteTarget.id)
    : [];

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

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="font-bold text-lg mb-2">Move records before deleting</h3>
            <p className="text-sm text-gray-600 mb-1">
              <span className="font-semibold">{deleteTarget.label}</span> still has{" "}
              {describeUsage(deleteTarget.usage)}.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Choose the org unit they should move to. Then the unit will be deleted.
            </p>

            <label className="block text-xs font-medium text-gray-500 mb-1">Move everything to</label>
            <select
              value={reassignTo}
              onChange={(e) => setReassignTo(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4"
            >
              <option value="">Select org unit</option>
              {replacementOptions.map((u) => (
                <option key={u.id} value={u.id}>{u.label}</option>
              ))}
            </select>

            <div className="flex gap-2">
              <button
                onClick={confirmReassignDelete}
                disabled={!reassignTo || deleting}
                className="flex-1 bg-jkuat-red text-white font-bold py-2 rounded-lg disabled:opacity-40"
              >
                {deleting ? "Moving..." : "Move and delete"}
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
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