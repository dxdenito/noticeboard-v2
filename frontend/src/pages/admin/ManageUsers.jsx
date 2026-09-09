import { useState, useEffect } from "react";
import { Pencil, Power, PowerOff } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

const AVATAR_COLORS = [
  "bg-red-500", "bg-orange-500", "bg-amber-500", "bg-lime-500",
  "bg-green-500", "bg-teal-500", "bg-cyan-500", "bg-blue-500",
  "bg-indigo-500", "bg-violet-500", "bg-purple-500", "bg-pink-500",
];

function avatarColor(id) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

function initials(fullName) {
  return fullName.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
}

export default function ManageUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role_id: "", requires_approval: "false" });
  const [submitting, setSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const { showError, showSuccess } = useToast();

  const [workflowUser, setWorkflowUser] = useState(null);
const [allDepartments, setAllDepartments] = useState([]);
const [allClubs, setAllClubs] = useState([]);
const [userScope, setUserScope] = useState(null);
const [logs, setLogs] = useState([]);

async function openWorkflow(u) {
  setWorkflowUser(u);
  try {
    const [depts, clubList, scope, logData] = await Promise.all([
      api.get("/departments/"),
      api.get("/clubs/"),
      api.get(`/users/${u.id}/scope`),
      api.get(`/users/${u.id}/scope/logs`),
    ]);
    setAllDepartments(depts);
    setAllClubs(clubList);
    setUserScope(scope);
    setLogs(logData);
  } catch (err) {
    showError(err.message);
  }
}

async function toggleDepartmentScope(departmentId, currentlyGranted) {
  try {
    if (currentlyGranted) {
      await api.delete(`/users/${workflowUser.id}/scope/departments/${departmentId}`);
    } else {
      await api.post(`/users/${workflowUser.id}/scope/departments/${departmentId}`);
    }
    openWorkflow(workflowUser); // reload scope + logs
  } catch (err) {
    showError(err.message);
  }
}

async function toggleClubScope(clubId, currentlyGranted) {
  try {
    if (currentlyGranted) {
      await api.delete(`/users/${workflowUser.id}/scope/clubs/${clubId}`);
    } else {
      await api.post(`/users/${workflowUser.id}/scope/clubs/${clubId}`);
    }
    openWorkflow(workflowUser);
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

  useEffect(() => { loadUsers(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        role_id: Number(form.role_id),
        requires_approval: form.requires_approval === "" ? null : form.requires_approval === "true",
      };
      await api.post("/users/", payload);
      showSuccess("User created");
      setForm({ email: "", password: "", full_name: "", role_id: "", requires_approval: "false" });
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
      await api.patch(`/users/${editingUser.id}`, {
        role_id: Number(editingUser.role_id),
        requires_approval: editingUser.role_id === "2" ? editingUser.requires_approval === "true" : null,
      });
      showSuccess("User updated");
      setEditingUser(null);
      loadUsers();
    } catch (err) {
      showError(err.message);
    }
  }

  if (loading) return <div className="text-gray-400">Loading...</div>;

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
          <option value="1">super_admin</option>
          <option value="2">web_admin</option>
        </select>
        {form.role_id === "2" && (
          <select value={form.requires_approval}
            onChange={(e) => setForm((f) => ({ ...f, requires_approval: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm sm:col-span-2">
            <option value="false">Auto-publish (no approval needed)</option>
            <option value="true">Requires approval</option>
          </select>
        )}
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
                {u.role.name}
              </span>
              {!u.is_active && (
                <span className="text-[10px] font-bold uppercase text-jkuat-red bg-red-50 px-2 py-0.5 rounded">
                  Deactivated
                </span>
              )}
            </div>

            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => setEditingUser({ id: u.id, role_id: String(u.role.id), requires_approval: String(u.requires_approval ?? false) })}
                aria-label="Edit user"
                className="flex items-center gap-1 text-xs text-jkuat-green font-semibold"
              >
                <Pencil size={14} /> Edit
              </button>
              {u.role.name === "web_admin" && (
                <button onClick={() => openWorkflow(u)} className="text-xs text-blue-600 font-semibold">
                  Workflow
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
              <option value="1">super_admin</option>
              <option value="2">web_admin</option>
            </select>
            {editingUser.role_id === "2" && (
              <select
                value={editingUser.requires_approval}
                onChange={(e) => setEditingUser((prev) => ({ ...prev, requires_approval: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4"
              >
                <option value="false">Auto-publish</option>
                <option value="true">Requires approval</option>
              </select>
            )}
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
      <h3 className="font-bold text-lg mb-1">Workflow: {workflowUser.full_name}</h3>
      <p className="text-xs text-gray-400 mb-4">Assign which departments and clubs this admin can post for.</p>

      <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Departments</h4>
      <div className="space-y-1 mb-4">
        {allDepartments.map((d) => {
          const granted = userScope?.department_ids.includes(d.id);
          return (
            <label key={d.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={granted}
                onChange={() => toggleDepartmentScope(d.id, granted)}
              />
              {d.name}
            </label>
          );
        })}
      </div>

      <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Clubs</h4>
      <div className="space-y-1 mb-6">
        {allClubs.map((c) => {
          const granted = userScope?.club_ids.includes(c.id);
          return (
            <label key={c.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={granted}
                onChange={() => toggleClubScope(c.id, granted)}
              />
              {c.name}
            </label>
          );
        })}
      </div>

      <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Activity Log</h4>
      <div className="border border-gray-100 rounded-lg divide-y divide-gray-100 mb-4 text-xs">
        {logs.map((log) => (
          <div key={log.id} className="px-3 py-2 flex justify-between">
            <span>
              <span className={log.action === "granted" ? "text-jkuat-green font-bold" : "text-jkuat-red font-bold"}>
                {log.action}
              </span>{" "}
              {log.scope_type} — {log.scope_name}
            </span>
            <span className="text-gray-400">{new Date(log.created_at).toLocaleDateString()}</span>
          </div>
        ))}
        {logs.length === 0 && <p className="px-3 py-4 text-gray-400 text-center">No activity yet.</p>}
      </div>

      <button onClick={() => setWorkflowUser(null)} className="w-full bg-gray-100 text-gray-700 font-bold py-2 rounded-lg">
        Close
      </button>
    </div>
  </div>
)}
    </div>
  );
}