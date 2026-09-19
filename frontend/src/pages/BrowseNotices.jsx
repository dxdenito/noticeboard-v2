import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";

import AudienceVerify from "../components/AudienceVerify";
import NoticeGrid from "../components/Noticegrid";

const AUDIENCE_KINDS = {
  staff: { label: "Staff Notices", audience: "staff" },
  students: { label: "Student Notices", audience: "student" },
};

function groupByType(orgUnits) {
  const groups = {};
  for (const unit of orgUnits) {
    if (!groups[unit.type]) groups[unit.type] = [];
    groups[unit.type].push(unit);
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}

export default function BrowseNotices() {
  const { kind } = useParams();
  const isSections = kind === "sections";
  const isCategories = kind === "categories";
  const audienceConfig = AUDIENCE_KINDS[kind];

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
      if (isCategories) requests.push(api.get("/categories/"));
      if (isSections) requests.push(api.get("/org-units/"));
      const results = await Promise.all(requests);
      setAllNotices(results[0]);
      setOptions(results[1] || []);
    } catch {
      // quiet — public page, degrade gracefully
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setSelectedId("");
    setOptions([]);
    load();
  }, [kind]);

  function handleVerified(newAudience) {
    setAudience(newAudience);
    load();
  }

  const label = audienceConfig?.label || (isCategories ? "Categories" : isSections ? "Sections" : "Not found");

  let filtered;
  if (audienceConfig) {
    filtered = allNotices.filter((n) => n.audience === audienceConfig.audience);
  } else if (isCategories) {
    filtered = allNotices.filter((n) => {
      const value = n.category?.id;
      if (!value) return false;
      return selectedId ? value === Number(selectedId) : true;
    });
  } else if (isSections) {
    filtered = allNotices.filter((n) => {
      if (!n.org_unit_id) return false;
      return selectedId ? n.org_unit_id === Number(selectedId) : true;
    });
  } else {
    filtered = [];
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-4">{label}</h1>

      {isSections && options.length > 0 && (
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm mb-6"
        >
          <option value="">All Sections</option>
          {groupByType(options).map(([type, units]) => (
            <optgroup key={type} label={type}>
              {units.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
      )}

      {isCategories && options.length > 0 && (
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm mb-6"
        >
          <option value="">All Categories</option>
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