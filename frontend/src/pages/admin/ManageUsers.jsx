import { useState, useEffect } from "react";
import { Pencil, Power, PowerOff } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { canAssignPostScope, canAssignApproveScope } from "../../lib/permissions";

const AVATAR_COLORS = [
  "bg-red-500", "bg-orange-500", "bg-amber-500", "bg-lime-500",
  "bg-green-500", "bg-teal-500", "bg-cyan-500", "bg-blue-500",
  "bg-indigo-500", "bg-violet-500", "bg-purple-500", "bg-pink-500",
];

const SCOPED_ROLES = ["web_admin", "corporate_admin", "ict_sub_admin"];
const RIGHTS_ELIGIBLE_ROLES = ["ict_sub_admin", "corporate_admin"];

const EMPTY_CAPS = {
  can_approve: false, can_post: false, can_manage_users: false,
  can_manage_tags: false, can_manage_org_units: false, can_pin: false,
  can_assign_post_scope: false, can_assign_approve_scope: false,
};

function avatarColor(id) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

function initials(fullName) {
  return fullName.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
}

function roleLabel(name) {
  return name.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

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

function CapabilityCheckboxes({ role, values, onChange }) {
  if (!RIGHTS_ELIGIBLE_ROLES.includes(role)) return null;

  const fields = role === "ict_sub_admin"
    ? [
        ["can_post", "Can post"],
        ["can_approve", "Can approve"],
        ["can_manage_users", "Can manage users"],
        ["can_manage_tags", "Can manage tags"],
        ["can_manage_org_units", "Can manage org units"],
        ["can_pin", "Can pin notices"],
        ["can_assign_post_scope", "Can assign post scope"],
        ["can_assign_approve_scope", "Can assign approve scope"],
      ]
    : [
        ["can_manage_users", "Can manage users"],
        ["can_manage_tags", "Can manage tags"],
        ["can_manage_org_units", "Can manage org units"],
        ["can_pin", "Can pin notices"],
        ["can_assign_post_scope", "Can assign post scope"],
        ["can_assign_approve_scope", "Can assign approve scope"],
      ];

  return (
    <div className="sm:col-span-2 flex flex-wrap gap-x-4 gap-y-2 border border-gray-100 rounded-lg px-3 py-2.5">
      {fields.map(([key, label]) => (
        <label key={key} className="flex items-center gap-1.5 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={values[key]}
            onChange={(e) => onChange(key, e.target.checked)}
          />
          {label}
        </label>
      ))}
    </div>
  );
}

export default function ManageUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    email: "", password: "", full_name: "", role_id: "",
    requires_approval: "false", ...EMPTY_CAPS,
  });
  const [submitting, setSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const { showError, showSuccess } = useToast();

  const [workflowUser, setWorkflowUser] = useState(null);
  const [orgUnits, setOrgUnits] = useState([]);
  const [userScope, setUserScope] = useState(null);

  const canGrantPost = canAssignPostScope(currentUser);
  const canGrantApprove = canAssignApproveScope(currentUser);

  function roleNameOf(roleId) {
    const role = roles.find((r) => String(r.id) === String(roleId));
    return role?.name;
  }

  async function openWorkflow(u) {
    setWorkflowUser(u);
    try {
      const [tree, scope] = await Promise.all([
        api.get("/org-units/tree"),
        api.get(`/users/${u.id}/scope`),
      ]);
      setOrgUnits(flattenTree(tree));
      setUserScope(scope);
    } catch (err) {
      showError(err.message);
    }
  }

  async function toggleScope(scopeType, orgUnitId, currentlyGranted) {
    try {
      if (currentlyGranted) {
        await api.delete(`/users/${workflowUser.id}/scope/${scopeType}/${orgUnitId}`);
      } else {
        await api.post(`/users/${workflowUser.id}/scope/${scopeType}/${orgUnitId}`);
      }
      const scope = await api.get(`/users/${workflowUser.id}/scope`);
      setUserScope(scope);
    } catch (err) {
      showError(err.message);
    }
  }

  async function loadUsers() {
    try {
      const data = await api.get("/users/");
      setUsers(data);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadRoles() {
    try {
      const data = await api.get("/roles/");
      setRoles(data);
    } catch (err) {
      showError(err.message);
    }
  }

  useEffect(() => { loadUsers(); loadRoles(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const selectedRole = roleNameOf(form.role_id);
      const eligible = RIGHTS_ELIGIBLE_ROLES.includes(selectedRole);
      const payload = {
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        role_id: Number(form.role_id),
        requires_approval: selectedRole === "web_admin" ? form.requires_approval === "true" : null,
        can_approve: eligible ? form.can_approve : null,
        can_post: eligible ? form.can_post : null,
        can_manage_users: eligible ? form.can_manage_users : null,
        can_manage_tags: eligible ? form.can_manage_tags : null,
        can_manage_org_units: eligible ? form.can_manage_org_units : null,
        can_pin: eligible ? form.can_pin : null,
        can_assign_post_scope: eligible ? form.can_assign_post_scope : null,
        can_assign_approve_scope: eligible ? form.can_assign_approve_scope : null,
      };
      await api.post("/users/", payload);
      showSuccess("User created");
      setForm({ email: "", password: "", full_name: "", role_id: "", requires_approval: "false", ...EMPTY_CAPS });
      loadUsers();
    } catch (err) {
      showError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(u) {
    try {
      await api.patch(`/users/${u.id}`, { is_active: !u.is_active });
      showSuccess(u.is_active ? "User deactivated" : "User activated");
      loadUsers();
    } catch (err) {
      showError(err.message);
    }
  }

  async function saveEdit() {
    try {
      const selectedRole = roleNameOf(editingUser.role_id);
      const eligible = RIGHTS_ELIGIBLE_ROLES.includes(selectedRole);
      await api.patch(`/users/${editingUser.id}`, {
        role_id: Number(editingUser.role_id),
        requires_approval: selectedRole === "web_admin" ? editingUser.requires_approval === "true" : null,
        can_approve: eligible ? editingUser.can_approve : null,
        can_post: eligible ? editingUser.can_post : null,
        can_manage_users: eligible ? editingUser.can_manage_users : null,
        can_manage_tags: eligible ? editingUser.can_manage_tags : null,
        can_manage_org_units: eligible ? editingUser.can_manage_org_units : null,
        can_pin: eligible ? editingUser.can_pin : null,
        can_assign_post_scope: eligible ? editingUser.can_assign_post_scope : null,
        can_assign_approve_scope: eligible ? editingUser.can_assign_approve_scope : null,
      });
      showSuccess("User updated");
      setEditingUser(null);
      loadUsers();
    } catch (err) {
      showError(err.message);
    }
  }

  if (loading) return <div className="text-gray-400">Loading...</div>;

  const formSelectedRole = roleNameOf(form.role_id);
  const editSelectedRole = editingUser ? roleNameOf(editingUser.role_id) : null;

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-4">Manage Users</h1>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input type="text" placeholder="Full name" required value={form.full_name}
          onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <input type="email" placeholder="Email" required value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <input type="password" placeholder="Password" required value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <select required value={form.role_id}
          onChange={(e) => setForm((f) => ({ ...f, role_id: e.target.value }))}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="">Select role</option>
          {roles.map((r) => <option key={r.id} value={r.id}>{roleLabel(r.name)}</option>)}
        </select>

        {formSelectedRole === "web_admin" && (
          <select value={form.requires_approval}
            onChange={(e) => setForm((f) => ({ ...f, requires_approval: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm sm:col-span-2">
            <option value="false">Auto-publish (no approval needed)</option>
            <option value="true">Requires approval</option>
          </select>
        )}

        <CapabilityCheckboxes
          role={formSelectedRole}
          values={form}
          onChange={(key, val) => setForm((f) => ({ ...f, [key]: val }))}
        />

        <button type="submit" disabled={submitting}
          className="sm:col-span-2 bg-jkuat-green text-white font-bold py-2.5 rounded-lg disabled:opacity-50">
          {submitting ? "Creating..." : "Create User"}
        </button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((u) => (
          <div key={u.id} className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full ${avatarColor(u.id)} text-white flex items-center justify-center font-bold text-sm shrink-0`}>
                {initials(u.full_name)}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-gray-900 truncate">{u.full_name}</p>
                <p className="text-xs text-gray-400 truncate">{u.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                {roleLabel(u.role.name)}
              </span>
              {!u.is_active && (
                <span className="text-[10px] font-bold uppercase text-jkuat-red bg-red-50 px-2 py-0.5 rounded">
                  Deactivated
                </span>
              )}
            </div>

            <div className="flex gap-2 pt-2 border-t border-gray-100 flex-wrap">
              <button
                onClick={() => setEditingUser({
                  id: u.id,
                  role_id: String(u.role.id),
                  requires_approval: String(u.requires_approval ?? false),
                  can_approve: u.can_approve ?? false,
                  can_post: u.can_post ?? false,
                  can_manage_users: u.can_manage_users ?? false,
                  can_manage_tags: u.can_manage_tags ?? false,
                  can_manage_org_units: u.can_manage_org_units ?? false,
                  can_pin: u.can_pin ?? false,
                  can_assign_post_scope: u.can_assign_post_scope ?? false,
                  can_assign_approve_scope: u.can_assign_approve_scope ?? false,
                })}
                aria-label="Edit user"
                className="flex items-center gap-1 text-xs text-jkuat-green font-semibold"
              >
                <Pencil size={14} /> Edit
              </button>
              {SCOPED_ROLES.includes(u.role.name) && (canGrantPost || canGrantApprove) && (
                <button onClick={() => openWorkflow(u)} className="text-xs text-blue-600 font-semibold">
                  Scope
                </button>
              )}
              {u.id !== currentUser.id && (
                <button
                  onClick={() => toggleActive(u)}
                  aria-label={u.is_active ? "Deactivate user" : "Activate user"}
                  className={`flex items-center gap-1 text-xs font-semibold ${u.is_active ? "text-jkuat-red" : "text-jkuat-green"}`}
                >
                  {u.is_active ? <PowerOff size={14} /> : <Power size={14} />}
                  {u.is_active ? "Deactivate" : "Activate"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {editingUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-lg mb-4">Edit User Role</h3>
            <select
              value={editingUser.role_id}
              onChange={(e) => setEditingUser((prev) => ({ ...prev, role_id: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3"
            >
              {roles.map((r) => <option key={r.id} value={r.id}>{roleLabel(r.name)}</option>)}
            </select>

            {editSelectedRole === "web_admin" && (
              <select
                value={editingUser.requires_approval}
                onChange={(e) => setEditingUser((prev) => ({ ...prev, requires_approval: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4"
              >
                <option value="false">Auto-publish</option>
                <option value="true">Requires approval</option>
              </select>
            )}

            <div className="mb-4">
              <CapabilityCheckboxes
                role={editSelectedRole}
                values={editingUser}
                onChange={(key, val) => setEditingUser((prev) => ({ ...prev, [key]: val }))}
              />
            </div>

            <div className="flex gap-2">
              <button onClick={saveEdit} className="flex-1 bg-jkuat-green text-white font-bold py-2 rounded-lg">
                Save
              </button>
              <button onClick={() => setEditingUser(null)} className="flex-1 bg-gray-100 text-gray-700 font-bold py-2 rounded-lg">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {workflowUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold text-lg mb-1">Scope: {workflowUser.full_name}</h3>
            <p className="text-xs text-gray-400 mb-4">
              {workflowUser.role.name === "ict_sub_admin"
                ? "No scope selected means unrestricted (global) for that action."
                : "Assign which org units this admin can act on."}
            </p>

            {canGrantPost && (workflowUser.role.name === "web_admin" || workflowUser.role.name === "ict_sub_admin") && (
              <>
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Post scope</h4>
                <div className="space-y-1 mb-4 max-h-48 overflow-y-auto">
                  {orgUnits.map((u) => {
                    const granted = userScope?.post_org_unit_ids.includes(u.id);
                    return (
                      <label key={u.id} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={!!granted} onChange={() => toggleScope("post", u.id, granted)} />
                        {u.label}
                      </label>
                    );
                  })}
                </div>
              </>
            )}

            {canGrantApprove && (workflowUser.role.name === "corporate_admin" || workflowUser.role.name === "ict_sub_admin") && (
              <>
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Approve scope</h4>
                <div className="space-y-1 mb-4 max-h-48 overflow-y-auto">
                  {orgUnits.map((u) => {
                    const granted = userScope?.approve_org_unit_ids.includes(u.id);
                    return (
                      <label key={u.id} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={!!granted} onChange={() => toggleScope("approve", u.id, granted)} />
                        {u.label}
                      </label>
                    );
                  })}
                </div>
              </>
            )}

            <button onClick={() => setWorkflowUser(null)} className="w-full bg-gray-100 text-gray-700 font-bold py-2 rounded-lg">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}