import React, { useRef, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Lock, Building2 } from 'lucide-react';
import image from '../images/image-1.jpg';
import placeholderTwo from '../images/image-2.jpg';
import placeholderThree from '../images/image-3.jpg';
import { api } from '../api/client';
import AudienceVerify from '../components/AudienceVerify';
import { useNoticeSearch } from '../hooks/useNoticeSearch';
import { getFileKind } from '../lib/fileType';
import AttachmentThumb from '../components/AttachmentThumb';

const AUDIENCE_LABELS = {
  public: "Public",
  student: "Student",
  staff: "Staff",
};

const PILL_PALETTE = [
  { bg: "bg-jkuat-blue/10", text: "text-jkuat-blue" },
  { bg: "bg-jkuat-green/10", text: "text-jkuat-green" },
  { bg: "bg-jkuat-red/10", text: "text-jkuat-red" },
];

const PLACEHOLDER_IMAGES = [image, placeholderTwo, placeholderThree];

function pillStyle(id) {
  return PILL_PALETTE[id % PILL_PALETTE.length];
}

function placeholderFor(id) {
  return PLACEHOLDER_IMAGES[id % PLACEHOLDER_IMAGES.length];
}

function findPreviewAttachment(attachments) {
  if (!attachments || attachments.length === 0) return null;
  const img = attachments.find((a) => getFileKind(a).kind === "image");
  if (img) return img;
  const pdf = attachments.find((a) => getFileKind(a).kind === "pdf");
  if (pdf) return pdf;
  return attachments[0];
}

function stripHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return div.textContent || "";
}

function formatFullDateTime(isoString) {
  const d = new Date(isoString);
  const datePart = d.toLocaleDateString("default", { day: "numeric", month: "short", year: "numeric" });
  const timePart = d.toLocaleTimeString("default", { hour: "numeric", minute: "2-digit" });
  return `${datePart} · ${timePart}`;
}

function categoryName(notice) {
  return notice.category?.name || "General";
}

function audienceLabel(notice) {
  return AUDIENCE_LABELS[notice.audience] || "Notice";
}

const FOCUS_RING_GREEN = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jkuat-green focus-visible:ring-offset-2 rounded";
const FOCUS_RING_RED = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jkuat-red focus-visible:ring-offset-2 rounded";

function NoticeMedia({ notice, className }) {
  const previewAttachment = findPreviewAttachment(notice.attachments);
  if (previewAttachment) {
    return <AttachmentThumb attachment={previewAttachment} className={className} />;
  }
  return <img src={placeholderFor(notice.id)} alt="Notice" className={className} loading="lazy" decoding="async" />;
}

function LatestCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden bg-[#F2F7E6] animate-pulse">
      <div className="w-full h-44 bg-gray-200/70" />
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-5 w-16 bg-gray-200/70 rounded-full" />
          <div className="h-3 w-20 bg-gray-200/70 rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-full bg-gray-200/70 rounded" />
          <div className="h-4 w-2/3 bg-gray-200/70 rounded" />
        </div>
        <div className="h-9 w-full bg-gray-200/70 rounded-full" />
      </div>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-16">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <LatestCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export default function AsymmetricNoticeboard() {
  const urgentScrollRef = useRef(null);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [audience, setAudience] = useState(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("q") || "";

  const filteredNotices = useNoticeSearch(notices, searchQuery);

  async function loadFeed() {
    try {
      const data = await api.get("/notices/");
      setNotices(data);
    } catch {
      // errors here are quiet — public feed should degrade gracefully
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFeed();
  }, []);

  function handleVerified(newAudience) {
    setAudience(newAudience);
    loadFeed();
  }

  const pinned = filteredNotices.filter((n) => n.is_pinned_feed);
  const rest = filteredNotices.filter((n) => !n.is_pinned_feed);

  function formatDateParts(isoString) {
    const d = new Date(isoString);
    return {
      day: d.getDate(),
      month: d.toLocaleString("default", { month: "short" }).toUpperCase(),
      year: d.getFullYear(),
    };
  }

  function LockOverlay() {
    return (
      <button
        onClick={() => setShowVerifyModal(true)}
        className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/60 backdrop-blur-[1px] z-10"
      >
        <Lock size={20} className="text-gray-700" />
        <span className="text-xs font-bold text-gray-700 px-4 text-center">
          Enter your JKUAT email to unlock
        </span>
      </button>
    );
  }

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-white p-4 md:p-8">
        <FeedSkeleton />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-white text-gray-900 font-sans p-4 md:p-8 select-none">
      <div
        className="fixed inset-0 pointer-events-none z-0
                   bg-[url('./images/jkuatlogo.png')] bg-no-repeat bg-center
                   bg-[length:70vmin] opacity-[0.05]"
      />
      <div className="max-w-6xl mx-auto space-y-16">

        {pinned.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-6 bg-red-600 rounded-sm transform skew-x-12 inline-block"></span>
              <h2 className="text-base font-extrabold tracking-wider text-red-600 uppercase">
                Pinned Notices
              </h2>
            </div>

            <div
              ref={urgentScrollRef}
              className="flex gap-6 overflow-x-auto pb-4 scroll-smooth snap-x snap-mandatory scrollbar-none"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <style>{`div::-webkit-scrollbar { display: none; }`}</style>

              {pinned.map((notice) => {
                const { day, month, year } = formatDateParts(notice.created_at);
                return (
                  <div
                    key={notice.id}
                    className="group flex-none w-[350px] md:w-[430px] h-44 bg-[#F2F7E6] flex items-stretch snap-start relative overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-gray-200/70"
                  >
                    {notice.is_locked && <LockOverlay />}
                    <div className={notice.is_locked ? "flex w-full blur-sm pointer-events-none select-none" : "flex w-full"}>
                      <div
                        className="w-16 bg-red-600 text-white flex flex-col items-center justify-center font-sans font-black py-4 leading-none relative z-10 pl-2 pr-4 shrink-0"
                        style={{ clipPath: 'polygon(0 0, 100% 0, 75% 100%, 0 100%)' }}
                      >
                        <span className="text-xl tracking-tight">{day}</span>
                        <span className="text-[10px] tracking-widest uppercase my-1 font-bold">{month}</span>
                        <span className="text-[9px] opacity-80 tracking-wider mt-1">{year}</span>
                      </div>

                      <div className="flex-1 flex p-4 gap-4 items-center min-w-0 -ml-2">
                        <div className="w-24 h-full rounded-xl overflow-hidden shrink-0">
                          <NoticeMedia notice={notice} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        </div>
                        <div className="flex-1 flex flex-col justify-between h-full min-w-0">
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="inline-block text-red-600 text-[10px] font-bold uppercase tracking-wide bg-red-50 px-2.5 py-1 rounded-full">
                                {categoryName(notice)}
                              </span>
                              <span className="text-[10px] text-gray-400 shrink-0">
                                {formatFullDateTime(notice.created_at)}
                              </span>
                            </div>
                            <Link to={`/notices/${notice.id}`} className={FOCUS_RING_RED}>
                              <h3 className="font-bold text-sm text-gray-900 leading-snug line-clamp-2 hover:text-red-600 cursor-pointer transition-colors">
                                {notice.title}
                              </h3>
                            </Link>
                            {notice.org_unit?.name && (
                              <p className="flex items-center gap-1 text-[10px] text-gray-400 mt-1 truncate">
                                <Building2 size={10} className="shrink-0" />
                                {notice.org_unit.name}
                              </p>
                            )}
                          </div>
                          <div className="flex justify-end">
                            <Link
                              to={`/notices/${notice.id}`}
                              className={`bg-jkuat-red hover:bg-jkuat-blue text-white text-[11px] font-bold px-4 py-2 rounded-full uppercase tracking-wide transition-colors cursor-pointer ${FOCUS_RING_RED}`}
                            >
                              Read more
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="space-y-12">
          <div className="space-y-8">
            <div className="text-center relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
              <span className="relative bg-white px-6 text-xs font-black tracking-widest text-green-600 uppercase">
                {searchQuery ? `Results for "${searchQuery}"` : "Latest notices"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 items-stretch">
              {rest.map((notice) => {
                const pill = pillStyle(notice.id);
                const excerpt = stripHtml(notice.body);

                return (
                  <article
                    key={notice.id}
                    className="group relative bg-white rounded-xl shadow-lg overflow-hidden flex flex-col h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-gray-200/70"
                  >
                    {notice.is_locked && <LockOverlay />}
                    <div className={notice.is_locked ? "flex flex-col w-full h-full blur-sm pointer-events-none select-none" : "flex flex-col w-full h-full"}>
                      <div className="relative w-full h-64 shrink-0 overflow-hidden">
                        <NoticeMedia notice={notice} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      </div>

                      <div className="flex-1 flex flex-col gap-3 p-4">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full shrink-0 ${pill.bg} ${pill.text}`}>
                            {audienceLabel(notice)}
                          </span>
                          <span className="text-[10px] text-gray-400 text-right">
                            {formatFullDateTime(notice.created_at)}
                          </span>
                        </div>

                        <div className="flex-1">
                          <Link to={`/notices/${notice.id}`} className={FOCUS_RING_GREEN}>
                            <h3 className="font-bold text-[15px] text-gray-900 leading-snug line-clamp-2 group-hover:text-jkuat-green cursor-pointer transition-colors">
                              {notice.title}
                            </h3>
                          </Link>
                          {notice.org_unit?.name && (
                            <p className="flex items-center gap-1 text-[11px] text-gray-400 mt-1 truncate">
                              <Building2 size={11} className="shrink-0" />
                              {notice.org_unit.name}
                            </p>
                          )}
                          {notice.body && (
                            <p className="text-xs text-gray-500 line-clamp-2 mt-1.5">
                              {excerpt}
                            </p>
                          )}
                        </div>

                        <Link
                          to={`/notices/${notice.id}`}
                          className={`w-full block text-center bg-jkuat-green hover:bg-jkuat-blue text-white text-xs font-bold py-2.5 rounded-xl uppercase tracking-wide transition-colors cursor-pointer ${FOCUS_RING_GREEN}`}
                        >
                          Read more
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          {rest.length === 0 && pinned.length === 0 && (
            <p className="text-center text-xs font-medium text-gray-400 italic">
              {searchQuery ? "No notices match your search." : "No notices to show right now."}
            </p>
          )}
        </section>

      </div>

      {showVerifyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-lg mb-2">Verify your email</h3>
            <p className="text-sm text-gray-500 mb-4">
              Enter your JKUAT email to unlock student/staff notices.
            </p>
            <AudienceVerify
              onVerified={(newAudience) => {
                handleVerified(newAudience);
                setShowVerifyModal(false);
              }}
              currentAudience={audience}
            />
            <button
              onClick={() => setShowVerifyModal(false)}
              className="text-xs text-gray-400 mt-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}