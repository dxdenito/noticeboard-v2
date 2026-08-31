import { useState, useEffect } from "react";
import { api } from "../../api/client";
import { useToast } from "../../context/ToastContext";

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role_id: "", requires_approval: "false" });
  const [submitting, setSubmitting] = useState(false);
  const { showError, showSuccess } = useToast();

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

      <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
        {users.map((u) => (
          <div key={u.id} className="px-4 py-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm text-gray-900">{u.full_name}</p>
              <p className="text-xs text-gray-400">{u.email}</p>
            </div>
            <span className="text-[10px] font-bold uppercase text-gray-500">{u.role.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}