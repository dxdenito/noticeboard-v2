import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";


export default function EditNotice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();

  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const [scope, setScope] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get(`/notices/${id}`),
      api.get("/categories/"),
      api.get("/departments/"),
      api.get("/clubs/"),
      api.get("/courses/"),
    ])
      .then(([notice, cats, depts, clubList, courseList]) => {
        setForm({
          title: notice.title,
          body: notice.body || "",
          category_id: notice.category_id,
          audience: notice.audience,
          department_id: notice.department_id || "",
          club_id: notice.club_id || "",
          course_id: notice.course_id || "",
          expiry_date: notice.expiry_date ? notice.expiry_date.slice(0, 16) : "",
        });
        setCategories(cats);
        setDepartments(depts);
        setClubs(clubList);
        setCourses(courseList);
      })
      .catch((err) => showError(err.message));
  }, [id]);
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
      const notice = await api.patch(`/notices/${id}`, payload);
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

  if (!form) return <div className="text-gray-400">Loading...</div>;

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-4">Edit Notice</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="text" required value={form.title}
          onChange={(e) => updateField("title", e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />

        <textarea required rows={6} value={form.body}
          onChange={(e) => updateField("body", e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />

        <select required value={form.category_id}
          onChange={(e) => updateField("category_id", e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select value={form.audience}
          onChange={(e) => updateField("audience", e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="public">Public</option>
          <option value="student">Student only</option>
          <option value="staff">Staff only</option>
        </select>

        <select value={form.department_id}
          onChange={(e) => updateField("department_id", e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="">No department tag</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        <select value={form.club_id}
          onChange={(e) => updateField("club_id", e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="">No club tag</option>
          {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select value={form.course_id}
          onChange={(e) => updateField("course_id", e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="">No course tag</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <input type="datetime-local" value={form.expiry_date}
          onChange={(e) => updateField("expiry_date", e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />

        <button type="submit" disabled={submitting}
          className="w-full bg-jkuat-green hover:bg-jkuat-green/90 text-white font-bold py-3 rounded-lg disabled:opacity-50">
          {submitting ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}