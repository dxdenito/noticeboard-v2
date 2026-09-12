import { useState } from "react";
import { ChevronRight, ChevronDown, Plus, Pencil, Trash2 } from "lucide-react";

export function OrgUnitForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || "");
  const [type, setType] = useState(initial?.type || "");
  const [headTitle, setHeadTitle] = useState(initial?.head_title || "");
  const [headName, setHeadName] = useState(initial?.head_name || "");

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      name,
      type,
      head_title: headTitle || null,
      head_name: headName || null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 bg-gray-50 border border-gray-200 rounded-lg p-3 mt-2">
      <div className="grid grid-cols-2 gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          required
          className="px-2 py-1.5 text-sm border border-gray-200 rounded"
        />
        <input
          value={type}
          onChange={(e) => setType(e.target.value)}
          placeholder="Type (e.g. College, Office)"
          required
          className="px-2 py-1.5 text-sm border border-gray-200 rounded"
        />
        <input
          value={headTitle}
          onChange={(e) => setHeadTitle(e.target.value)}
          placeholder="Head title (optional)"
          className="px-2 py-1.5 text-sm border border-gray-200 rounded"
        />
        <input
          value={headName}
          onChange={(e) => setHeadName(e.target.value)}
          placeholder="Head name (optional)"
          className="px-2 py-1.5 text-sm border border-gray-200 rounded"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-xs font-semibold text-gray-500">
          Cancel
        </button>
        <button type="submit" className="px-3 py-1.5 text-xs font-bold bg-jkuat-green text-white rounded">
          Save
        </button>
      </div>
    </form>
  );
}

export default function OrgUnitNode({ node, depth = 0, onCreateChild, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(depth === 0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);

  const hasChildren = node.children && node.children.length > 0;

  return (
    <div style={{ marginLeft: depth === 0 ? 0 : 20 }}>
      <div className="flex items-center gap-2 py-1.5 group">
        <button
          onClick={() => setExpanded((v) => !v)}
          className={hasChildren ? "text-gray-400" : "text-transparent"}
          disabled={!hasChildren}
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        <span className="text-sm font-semibold text-gray-800">{node.name}</span>
        <span className="text-[10px] font-bold uppercase tracking-wide text-jkuat-green bg-jkuat-green/10 px-1.5 py-0.5 rounded">
          {node.type}
        </span>
        {node.head_title && (
          <span className="text-xs text-gray-400">
            {node.head_title}{node.head_name ? `: ${node.head_name}` : ""}
          </span>
        )}

        <div className="ml-auto flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setShowAddForm((v) => !v)} title="Add child" className="p-1 text-gray-400 hover:text-jkuat-green">
            <Plus size={15} />
          </button>
          <button onClick={() => setShowEditForm((v) => !v)} title="Edit" className="p-1 text-gray-400 hover:text-blue-600">
            <Pencil size={15} />
          </button>
          <button
            onClick={() => onDelete(node.id)}
            title={hasChildren ? "Cannot delete — has children" : "Delete"}
            disabled={hasChildren}
            className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-30 disabled:hover:text-gray-400"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {showEditForm && (
        <OrgUnitForm
          initial={node}
          onSave={(data) => {
            onUpdate(node.id, data);
            setShowEditForm(false);
          }}
          onCancel={() => setShowEditForm(false)}
        />
      )}

      {showAddForm && (
        <div style={{ marginLeft: 20 }}>
          <OrgUnitForm
            onSave={(data) => {
              onCreateChild(node.id, data);
              setShowAddForm(false);
              setExpanded(true);
            }}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      {expanded && hasChildren && (
        <div className="border-l border-gray-100 ml-2">
          {node.children.map((child) => (
            <OrgUnitNode
              key={child.id}
              node={child}
              depth={depth + 1}
              onCreateChild={onCreateChild}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}