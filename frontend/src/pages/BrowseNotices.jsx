import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";

import AudienceVerify from "../components/AudienceVerify";
import NoticeGrid from "../components/Noticegrid";

// Config per "kind" — tag-based kinds have a real API endpoint listing
// options for the filter dropdown; audience-based kinds don't need one,
// since student/staff are just fixed values, not a fetchable list.
const CONFIG = {
  departments: { label: "Departments", getValue: (n) => n.department_id, fetchUrl: "/departments/" },
  clubs: { label: "Clubs", getValue: (n) => n.club_id, fetchUrl: "/clubs/" },
  courses: { label: "Courses", getValue: (n) => n.course_id, fetchUrl: "/courses/" },
  categories: { label: "Categories", getValue: (n) => n.category?.id, fetchUrl: "/categories/" },
  staff: { label: "Staff Notices", audience: "staff" },
  students: { label: "Student Notices", audience: "student" },
};
export default function BrowseNotices() {
  const { kind } = useParams();
  const config = CONFIG[kind];

  const [allNotices, setAllNotices] = useState([]);
  const [options, setOptions] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [audience, setAudience] = useState(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const requests = [api.get("/notices/")];
      if (config.fetchUrl) requests.push(api.get(config.fetchUrl));
      const [notices, tagOptions] = await Promise.all(requests);
      setAllNotices(notices);
      if (tagOptions) setOptions(tagOptions);
    } catch {
      // quiet — public page, degrade gracefully
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setSelectedId("");
    load();
  }, [kind]);

  function handleVerified(newAudience) {
    setAudience(newAudience);
    load(); // refetch — locked notices unlock once verified
  }

  if (!config) {
    return <div className="p-8 text-center text-gray-400">Not found.</div>;
  }

  // Tag-based: filter by the entity type this page is scoped to (all of
  // them, or narrowed to one specific department/club/course/category).
  // Audience-based: filter to exactly that fixed audience value.
  const filtered = config.audience
  ? allNotices.filter((n) => n.audience === config.audience)
  : allNotices.filter((n) => {
      const value = config.getValue(n);
      if (!value) return false;
      return selectedId ? value === Number(selectedId) : true;
    });

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-4">{config.label}</h1>

      {config.fetchUrl && (
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm mb-6"
        >
          <option value="">All {config.label}</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
      )}

      <NoticeGrid notices={filtered} onLockedClick={() => setShowVerifyModal(true)} />

      {showVerifyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-lg mb-2">Verify your email</h3>
            <p className="text-sm text-gray-500 mb-4">Enter your JKUAT email to unlock this content.</p>
            <AudienceVerify
              onVerified={(a) => { handleVerified(a); setShowVerifyModal(false); }}
              currentAudience={audience}
            />
            <button onClick={() => setShowVerifyModal(false)} className="text-xs text-gray-400 mt-2">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}