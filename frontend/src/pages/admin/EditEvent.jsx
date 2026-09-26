import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronDown, ImagePlus, X } from "lucide-react";
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

function isDescriptionEmpty(html) {
  if (!html) return true;
  const div = document.createElement("div");
  div.innerHTML = html;
  return !div.textContent.trim();
}

function toDatetimeLocal(isoString) {
  if (!isoString) return "";
  return isoString.slice(0, 16);
}

function validateForm(form) {
  const errors = {};
  if (!form.title.trim()) errors.title = "Title is required";
  if (isDescriptionEmpty(form.description)) errors.description = "Event description can't be empty";
  if (!form.org_unit_id) errors.org_unit_id = "Select an org unit";
  if (!form.start_date) errors.start_date = "Start date is required";
  if (form.end_date && form.start_date && new Date(form.end_date) < new Date(form.start_date)) {
    errors.end_date = "End date can't be before the start date";
  }
  return errors;
}

function Pill({ children, selectProps, options, renderOption, invalid }) {
  return (
    <div className="relative inline-flex items-center">
      <div
        className={`flex items-center gap-1 pl-3 pr-2 py-1.5 rounded-full border text-sm font-medium transition-colors ${
          invalid
            ? "border-red-300 bg-red-50 text-red-600"
            : "border-gray-200 text-gray-700 hover:border-gray-300"
        }`}
      >
        <span className={invalid ? "text-red-400" : "text-gray-400"}>{children}</span>
        <select
          {...selectProps}
          className="appearance-none bg-transparent focus:outline-none cursor-pointer pr-1 max-w-[180px] truncate"
        >
          {options.map(renderOption)}
        </select>
        <ChevronDown size={13} className={`pointer-events-none ${invalid ? "text-red-400" : "text-gray-400"}`} />
      </div>
    </div>
  );
}

export default function EditEvent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const { user } = useAuth();

  const [orgUnits, setOrgUnits] = useState([]);
  const [form, setForm] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [scope, setScope] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/events/${id}`),
      api.get("/org-units/tree"),
    ])
      .then(([event, tree]) => {
        setForm({
          title: event.title,
          description: event.description || "",
          start_date: toDatetimeLocal(event.start_date),
          end_date: toDatetimeLocal(event.end_date),
          location: event.location || "",
          audience: event.audience,
          org_unit_id: event.org_unit_id,
        });
        setExistingImageUrl(event.image_url);
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

  function handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationErrors = validateForm(form);
    setErrors(validationErrors);
    setSubmitAttempted(true);
    if (Object.keys(validationErrors).length > 0) {
      showError("Please fix the highlighted fields before saving");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        start_date: new Date(form.start_date).toISOString(),
        end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
        location: form.location || null,
        audience: form.audience,
        org_unit_id: Number(form.org_unit_id),
      };
      const event = await api.patch(`/events/${id}`, payload);

      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);
        await api.post(`/events/${event.id}/image`, formData);
      }

      showSuccess(
        event.status === "approved" ? "Event updated" : "Event updated — sent back for approval"
      );
      navigate(`/dashboard/events/${event.id}`);
    } catch (err) {
      showError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!form) return <div className="p-8 text-center text-gray-400">Loading...</div>;

  const showTitleError = submitAttempted && errors.title;
  const showDescriptionError = submitAttempted && errors.description;
  const showStartError = submitAttempted && errors.start_date;
  const showEndError = submitAttempted && errors.end_date;

  return (
    <div className="max-w-6xl mx-auto pb-24">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <textarea
            rows={1}
            placeholder="Event title"
            autoFocus
            value={form.title}
            onChange={(e) => {
              updateField("title", e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = e.target.scrollHeight + "px";
            }}
            className={`w-full font-serif text-3xl md:text-4xl font-bold text-gray-900 placeholder-gray-300 bg-transparent resize-none overflow-hidden focus:outline-none transition-colors pb-1 border-0 border-b-2 ${
              showTitleError ? "border-red-400" : "border-transparent focus:border-jkuat-blue/40"
            }`}
          />
          {showTitleError && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Pill
            options={[
              { value: "public", label: "Public" },
              { value: "student", label: "Student" },
              { value: "staff", label: "Staff" },
            ]}
            renderOption={(o) => <option key={o.value} value={o.value}>{o.label}</option>}
            selectProps={{
              value: form.audience,
              onChange: (e) => updateField("audience", e.target.value),
            }}
          >
            For
          </Pill>

          <Pill
            invalid={submitAttempted && !!errors.org_unit_id}
            options={allowedOrgUnits.map((u) => ({ value: u.id, label: u.label }))}
            renderOption={(o) => <option key={o.value} value={o.value}>{o.label}</option>}
            selectProps={{
              value: form.org_unit_id,
              onChange: (e) => updateField("org_unit_id", e.target.value),
            }}
          >
            Hosted by
          </Pill>
        </div>

        {submitAttempted && errors.org_unit_id && (
          <p className="text-xs text-red-500 -mt-3">{errors.org_unit_id}</p>
        )}

        {isScopeRestricted && allowedOrgUnits.length === 0 && (
          <p className="text-xs text-red-600">
            You have no org units assigned to post for. Contact an admin to be granted posting scope.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Starts</label>
            <input
              type="datetime-local"
              value={form.start_date}
              onChange={(e) => updateField("start_date", e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-sm ${showStartError ? "border-red-400" : "border-gray-200"}`}
            />
            {showStartError && <p className="text-xs text-red-500 mt-1">{errors.start_date}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Ends (optional)</label>
            <input
              type="datetime-local"
              value={form.end_date}
              onChange={(e) => updateField("end_date", e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-sm ${showEndError ? "border-red-400" : "border-gray-200"}`}
            />
            {showEndError && <p className="text-xs text-red-500 mt-1">{errors.end_date}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Location (optional)</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => updateField("location", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <RichTextEditor
            content={form.description}
            onChange={(html) => updateField("description", html)}
            placeholder="Describe the event..."
          />
          {showDescriptionError && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
        </div>

        <div className="flex items-start gap-2">
          <label className="text-xs font-medium text-gray-500 w-24 shrink-0 pt-1.5">Image</label>
          <div className="flex-1">
            {imagePreview ? (
              <div className="relative w-48 h-32 rounded-lg overflow-hidden border border-gray-200">
                <img src={imagePreview} alt="New event preview" className="w-full h-full object-cover" />
              </div>
            ) : existingImageUrl ? (
              <div className="relative w-48 h-32 rounded-lg overflow-hidden border border-gray-200 mb-2">
                <img src={`${import.meta.env.VITE_API_URL}${existingImageUrl}`} alt="Current event image" className="w-full h-full object-cover" />
              </div>
            ) : null}
            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-jkuat-blue cursor-pointer mt-2">
              <ImagePlus size={13} />
              {existingImageUrl || imagePreview ? "Replace image" : "Add a cover image"}
              <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
            </label>
          </div>
        </div>
      </form>

      <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-white/95 backdrop-blur border-t border-gray-100 px-4 md:px-8 py-3 flex items-center justify-between z-10">
        <p className="text-xs text-gray-400">Editing will re-run approval status</p>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="bg-jkuat-blue hover:bg-jkuat-blue/90 text-white text-sm font-bold px-6 py-2.5 rounded-full disabled:opacity-40 transition-opacity"
        >
          {submitting ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}