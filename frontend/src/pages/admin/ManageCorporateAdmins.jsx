import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { api } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import Pagination from "../../components/admin/Pagination";

const PAGE_SIZE = 20;

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

function initials(fullName) {
  return fullName.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
}

export default function ManageCorporateAdmins() {
  const [admins, setAdmins] = useState([]);
  const [orgUnits, setOrgUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const debounceRef = useRef(null);
  const [scopeUser, setScopeUser] = useState(null);
  const [userScope, setUserScope] = useState(null);
  const { showError, showSuccess } = useToast();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(0);
      setSearch(searchInput);
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput]);

  async function loadAdmins() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      });
      if (search) params.set("search", search);
      const data = await api.get(`/users/?${params.toString()}`);
      setAdmins(data);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAdmins(); }, [page, search]);

  async function openScope(admin) {
    setScopeUser(admin);
    try {
      const [tree, scope] = await Promise.all([
        api.get("/org-units/tree"),
        api.get(`/users/${admin.id}/scope`),
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
        await api.delete(`/users/${scopeUser.id}/scope/${scopeType}/${orgUnitId}`);
      } else {
        await api.post(`/users/${scopeUser.id}/scope/${scopeType}/${orgUnitId}`);
      }
      const scope = await api.get(`/users/${scopeUser.id}/scope`);
      setUserScope(scope);
    } catch (err) {
      showError(err.message);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Corporate Admins</h1>
      <p className="text-sm text-gray-400 mb-4">Assign post and approve scope to corporate admin accounts.</p>

      <div className="relative mb-6 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-jkuat-green/40"
        />
      </div>

      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : (
        <>
          {admins.length === 0 && (
            <p className="text-sm text-gray-400">No corporate admin accounts match.</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {admins.map((a) => (
              <div key={a.id} className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-jkuat-green text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {initials(a.full_name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{a.full_name}</p>
                    <p className="text-xs text-gray-400 truncate">{a.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => openScope(a)}
                  className="text-xs text-blue-600 font-semibold pt-2 border-t border-gray-100 text-left"
                >
                  Assign scope
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <Pagination page={page} onPageChange={setPage} hasMore={admins.length === PAGE_SIZE} pageSize={PAGE_SIZE} />

      {scopeUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold text-lg mb-4">Scope: {scopeUser.full_name}</h3>

            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Post scope</h4>
            <div className="space-y-1 mb-4 max-h-40 overflow-y-auto">
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

            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Approve scope</h4>
            <div className="space-y-1 mb-6 max-h-40 overflow-y-auto">
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

            <button onClick={() => setScopeUser(null)} className="w-full bg-gray-100 text-gray-700 font-bold py-2 rounded-lg">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}