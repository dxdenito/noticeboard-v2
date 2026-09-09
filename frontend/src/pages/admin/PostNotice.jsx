// src/pages/dashboard/PostNotice.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

export default function PostNotice() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const [files, setFiles] = useState([]);
  const [scope, setScope] = useState(null);

  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [courses, setCourses] = useState([]);

  const [form, setForm] = useState({
    title: "",
    body: "",
    category_id: "",
    audience: "public",
    department_id: "",
    club_id: "",
    course_id: "",
    expiry_date: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get("/categories/"),
      api.get("/departments/"),
      api.get("/clubs/"),
      api.get("/courses/"),
    ])
      .then(([cats, depts, clubList, courseList]) => {
        setCategories(cats);
        setDepartments(depts);
        setClubs(clubList);
        setCourses(courseList);
      })
      .catch((err) => showError(err.message));
  }, []);
  useEffect(() => {
  if (user?.role.name === "web_admin") {
    api.get(`/users/${user.id}/scope`).then(setScope).catch(() => {});
  }
}, [user]);

const allowedDepartments = scope ? departments.filter((d) => scope.department_ids.includes(d.id)) : departments;
const allowedClubs = scope ? clubs.filter((c) => scope.club_ids.includes(c.id)) : clubs;
const allowedCourses = scope ? courses.filter((c) => scope.department_ids.includes(c.department_id)) : courses;

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
        department_id: form.department_id ? Number(form.department_id) : null,
        club_id: form.club_id ? Number(form.club_id) : null,
        course_id: form.course_id ? Number(form.course_id) : null,
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

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Post a Notice</h1>
      {willRequireApproval && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-4">
          Your posts require super_admin approval before they go live.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Title"
          required
          value={form.title}
          onChange={(e) => updateField("title", e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />

        <textarea
          placeholder="Body"
          required
          rows={6}
          value={form.body}
          onChange={(e) => updateField("body", e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />

        <select
          required
          value={form.category_id}
          onChange={(e) => updateField("category_id", e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Select category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={form.audience}
          onChange={(e) => updateField("audience", e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="public">Public</option>
          <option value="student">Student only</option>
          <option value="staff">Staff only</option>
        </select>

        <select
          value={form.department_id}
          onChange={(e) => updateField("department_id", e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">No department tag</option>
          {allowedDepartments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        <select
          value={form.club_id}
          onChange={(e) => updateField("club_id", e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">No club tag</option>
          {allowedClubs.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={form.course_id}
          onChange={(e) => updateField("course_id", e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">No course tag</option>
          {allowedCourses.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <input
          type="datetime-local"
          value={form.expiry_date}
          onChange={(e) => updateField("expiry_date", e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
        <input
          type="file"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files))}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-jkuat-green hover:bg-jkuat-green/90 text-white font-bold py-3 rounded-lg disabled:opacity-50"
        >
          {submitting ? "Posting..." : "Post Notice"}
        </button>
      </form>
    </div>
  );
}