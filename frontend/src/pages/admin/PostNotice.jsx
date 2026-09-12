// src/pages/dashboard/PostNotice.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Paperclip, X } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import RichTextEditor from "../../components/RichTextEditor";

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

function Pill({ children, selectProps, options, renderOption }) {
  return (
    <div className="relative inline-flex items-center">
      <div className="flex items-center gap-1 pl-3 pr-2 py-1.5 rounded-full border border-gray-200 text-sm font-medium text-gray-700 hover:border-gray-300 transition-colors">
        <span className="text-gray-400">{children}</span>
        <select
          {...selectProps}
          className="appearance-none bg-transparent focus:outline-none cursor-pointer pr-1 max-w-[180px] truncate"
        >
          {options.map(renderOption)}
        </select>
        <ChevronDown size={13} className="text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}

export default function PostNotice() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const [files, setFiles] = useState([]);
  const [scope, setScope] = useState(null);
  const [showMore, setShowMore] = useState(false);

  const [categories, setCategories] = useState([]);
  const [orgUnits, setOrgUnits] = useState([]);

  const [form, setForm] = useState({
    title: "",
    body: "",
    category_id: "",
    audience: "public",
    org_unit_id: "",
    expiry_date: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get("/categories/"),
      api.get("/org-units/tree"),
    ])
      .then(([cats, tree]) => {
        setCategories(cats);
        setOrgUnits(flattenTree(tree));
      })
      .catch((err) => showError(err.message));
  }, []);

  useEffect(() => {
    if (user && (user.role.name === "web_admin" || user.role.name === "ict_sub_admin")) {
      api.get(`/users/${user.id}/scope`).then(setScope).catch(() => {});
    }
  }, [user]);

  const isScopeRestricted = scope && scope.post_org_unit_ids.length > 0;
  const allowedOrgUnits = isScopeRestricted
    ? orgUnits.filter((u) => scope.post_org_unit_ids.includes(u.id))
    : orgUnits;

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        body: form.body,
        category_id: Number(form.category_id),
        audience: form.audience,
        org_unit_id: Number(form.org_unit_id),
        expiry_date: form.expiry_date ? new Date(form.expiry_date).toISOString() : null,
      };
      const notice = await api.post("/notices/", payload);
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        await api.post(`/notices/${notice.id}/attachments/`, formData);
      }
      showSuccess(
        notice.status === "approved"
          ? "Notice published"
          : "Notice submitted for approval"
      );
      navigate(`/dashboard/my-notices`);
    } catch (err) {
      showError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const willRequireApproval =
    user?.role.name === "web_admin" && user?.requires_approval;

  const canSubmit = form.title && form.body && form.category_id && form.org_unit_id;

  return (
    <div className="max-w-6xl mx-auto pb-24">
      <form onSubmit={handleSubmit} className="space-y-6">
        <textarea
          rows={1}
          placeholder="Notice title"
          required
          value={form.title}
          onChange={(e) => {
            updateField("title", e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = e.target.scrollHeight + "px";
          }}
          className="w-full font-serif text-3xl md:text-4xl font-bold text-gray-900 placeholder-gray-300 border-none focus:outline-none resize-none overflow-hidden bg-transparent"
        />

        <div className="flex flex-wrap items-center gap-2">
          <Pill
            options={[
              { value: "", label: "Category" },
              ...categories.map((c) => ({ value: c.id, label: c.name })),
            ]}
            renderOption={(o) => <option key={o.value} value={o.value}>{o.label}</option>}
            selectProps={{
              required: true,
              value: form.category_id,
              onChange: (e) => updateField("category_id", e.target.value),
            }}
          >
            In
          </Pill>

          <Pill
            options={[
              { value: "public", label: "Public" },
              { value: "student", label: "Student only" },
              { value: "staff", label: "Staff only" },
            ]}
            renderOption={(o) => <option key={o.value} value={o.value}>{o.label}</option>}
            selectProps={{
              value: form.audience,
              onChange: (e) => updateField("audience", e.target.value),
            }}
          >
            To
          </Pill>

          <Pill
            options={[
              { value: "", label: "Select org unit" },
              ...allowedOrgUnits.map((u) => ({ value: u.id, label: u.label })),
            ]}
            renderOption={(o) => <option key={o.value} value={o.value}>{o.label}</option>}
            selectProps={{
              required: true,
              value: form.org_unit_id,
              onChange: (e) => updateField("org_unit_id", e.target.value),
            }}
          >
            For
          </Pill>
        </div>

        {isScopeRestricted && allowedOrgUnits.length === 0 && (
          <p className="text-xs text-red-600">
            You have no org units assigned to post for. Contact an admin to be granted posting scope.
          </p>
        )}

        <RichTextEditor
          content={form.body}
          onChange={(html) => updateField("body", html)}
          placeholder="Write your notice..."
        />

        <div>
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className="text-xs font-semibold text-gray-400 hover:text-gray-600"
          >
            {showMore ? "Hide options" : "More options"}
          </button>

          {showMore && (
            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-500 w-24 shrink-0">Expires</label>
                <input
                  type="datetime-local"
                  value={form.expiry_date}
                  onChange={(e) => updateField("expiry_date", e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                />
              </div>

              <div className="flex items-start gap-2">
                <label className="text-xs font-medium text-gray-500 w-24 shrink-0 pt-1.5">Attachments</label>
                <div className="flex-1">
                  <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-jkuat-green cursor-pointer">
                    <Paperclip size={13} />
                    Attach files
                    <input
                      type="file"
                      multiple
                      onChange={(e) => setFiles((prev) => [...prev, ...Array.from(e.target.files)])}
                      className="hidden"
                    />
                  </label>
                  {files.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {files.map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-gray-500">
                          {f.name}
                          <button
                            type="button"
                            onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                            className="text-gray-300 hover:text-red-500"
                          >
                            <X size={12} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </form>

      <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-white/95 backdrop-blur border-t border-gray-100 px-4 md:px-8 py-3 flex items-center justify-between z-10">
        <p className="text-xs text-gray-400">
          {willRequireApproval ? "Requires approval before it goes live" : "Publishes immediately"}
        </p>
        <button
          onClick={handleSubmit}
          disabled={submitting || !canSubmit}
          className="bg-jkuat-green hover:bg-jkuat-green/90 text-white text-sm font-bold px-6 py-2.5 rounded-full disabled:opacity-40 transition-opacity"
        >
          {submitting ? "Posting..." : "Publish"}
        </button>
      </div>
    </div>
  );
}