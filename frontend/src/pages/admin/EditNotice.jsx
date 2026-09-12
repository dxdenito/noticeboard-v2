import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronDown, Paperclip, X } from "lucide-react";
import { api } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
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

export default function EditNotice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const { user } = useAuth();

  const [categories, setCategories] = useState([]);
  const [orgUnits, setOrgUnits] = useState([]);
  const [form, setForm] = useState(null);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [scope, setScope] = useState(null);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/notices/${id}`),
      api.get("/categories/"),
      api.get("/org-units/tree"),
    ])
      .then(([notice, cats, tree]) => {
        setForm({
          title: notice.title,
          body: notice.body || "",
          category_id: notice.category.id,
          audience: notice.audience,
          org_unit_id: notice.org_unit_id,
          expiry_date: notice.expiry_date ? notice.expiry_date.slice(0, 16) : "",
        });
        setExistingAttachments(notice.attachments || []);
        setCategories(cats);
        setOrgUnits(flattenTree(tree));
      })
      .catch((err) => showError(err.message));
  }, [id]);

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
      const notice = await api.patch(`/notices/${id}`, payload);
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        await api.post(`/notices/${notice.id}/attachments/`, formData);
      }
      showSuccess(
        notice.status === "approved" ? "Notice updated" : "Notice updated — sent back for approval"
      );
      navigate(`/notices/${notice.id}`);
    } catch (err) {
      showError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!form) return <div className="p-8 text-center text-gray-400">Loading...</div>;

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
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
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
            options={allowedOrgUnits.map((u) => ({ value: u.id, label: u.label }))}
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
                  {existingAttachments.length > 0 && (
                    <ul className="space-y-1 mb-2">
                      {existingAttachments.map((att) => (
                        <li key={att.id} className="text-xs text-gray-500">
                          {att.file_name} <span className="text-gray-300">(already attached)</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-jkuat-green cursor-pointer">
                    <Paperclip size={13} />
                    Attach more files
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
        <p className="text-xs text-gray-400">Editing will re-run approval status</p>
        <button
          onClick={handleSubmit}
          disabled={submitting || !canSubmit}
          className="bg-jkuat-green hover:bg-jkuat-green/90 text-white text-sm font-bold px-6 py-2.5 rounded-full disabled:opacity-40 transition-opacity"
        >
          {submitting ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}