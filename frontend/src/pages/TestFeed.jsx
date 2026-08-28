import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import image from '../images/image-1.jpg';
import { api } from '../api/client';
import AudienceVerify from '../components/AudienceVerify';

export default function AsymmetricNoticeboard() {
  const urgentScrollRef = useRef(null);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [audience, setAudience] = useState(null);

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
    loadFeed(); // refetch — the cookie's now set, so the next call returns more
  }

  const pinned = notices.filter((n) => n.is_pinned_feed);
  const rest = notices.filter((n) => !n.is_pinned_feed);

  function formatDateParts(isoString) {
    const d = new Date(isoString);
    return {
      day: d.getDate(),
      month: d.toLocaleString("default", { month: "short" }).toUpperCase(),
      year: d.getFullYear(),
    };
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Loading notices...</div>;
  }

  return (
    <div className="w-full min-h-screen bg-white text-gray-900 font-sans p-4 md:p-8 select-none">
      <div
        className="fixed inset-0 pointer-events-none z-0
                   bg-[url('./images/jkuatlogo.png')] bg-no-repeat bg-center
                   bg-[length:70vmin] opacity-[0.05]"
      />
      <div className="max-w-6xl mx-auto space-y-16">

        <AudienceVerify onVerified={handleVerified} currentAudience={audience} />

        {pinned.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-6 bg-red-600 rounded-sm transform skew-x-12 inline-block"></span>
              <h2 className="text-base font-extrabold tracking-wider text-red-600 uppercase">
                Urgent / Pinned Notices
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
                    className="flex-none w-[350px] md:w-[430px] h-44 bg-white border border-gray-200 flex items-stretch snap-start shadow-md hover:shadow-lg transition-shadow relative overflow-hidden rounded-r-lg"
                  >
                    <div
                      className="w-16 bg-red-600 text-white flex flex-col items-center justify-center font-sans font-black py-4 leading-none relative z-10 pl-2 pr-4 shrink-0"
                      style={{ clipPath: 'polygon(0 0, 100% 0, 75% 100%, 0 100%)' }}
                    >
                      <span className="text-xl tracking-tight">{day}</span>
                      <span className="text-[10px] tracking-widest uppercase my-1 font-bold">{month}</span>
                      <span className="text-[9px] opacity-80 tracking-wider mt-1">{year}</span>
                    </div>

                    <div className="flex-1 flex p-4 gap-4 items-center min-w-0 -ml-2">
                      <img
                        src={image}
                        alt="Notice thumbnail"
                        className="w-24 h-full object-cover rounded bg-gray-50 border border-gray-100 shrink-0"
                      />
                      <div className="flex-1 flex flex-col justify-between h-full min-w-0">
                        <div>
                          <span className="inline-block text-red-600 text-[10px] font-extrabold tracking-wider uppercase bg-red-50 px-2 py-0.5 rounded mb-1.5">
                            {notice.category_id ? `Category ${notice.category_id}` : "General"}
                          </span>
                          <h3 className="font-extrabold text-sm text-gray-900 leading-snug line-clamp-2 hover:text-red-600 cursor-pointer transition-colors">
                            {notice.title}
                          </h3>
                        </div>
                        <div className="flex justify-end">
                          <Link
                            to={`/notices/${notice.id}`}
                            className="bg-red-600 hover:bg-red-700 text-white text-[11px] font-extrabold px-4 py-2 transition-colors shadow-sm cursor-pointer"
                          >
                            Read More
                          </Link>
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
                // Latest
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {rest.map((notice) => {
                const { day, month, year } = formatDateParts(notice.created_at);
                return (
                  <article
                    key={notice.id}
                    className="bg-white border border-gray-200 flex flex-col shadow-sm hover:shadow-xl transition-all rounded overflow-hidden group"
                  >
                    <div className="w-full h-48 bg-gray-100 relative overflow-hidden shrink-0">
                      <img
                        src={image}
                        alt="Notice graphics content"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div
                        className="absolute bottom-0 left-0 w-2/3 h-6 bg-green-600 pointer-events-none"
                        style={{ clipPath: 'polygon(0 80%, 100% 100%, 0 100%)' }}
                      />
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-gray-400">
                          <span>{day} {month} {year}</span>
                        </div>
                        <span className="inline-block bg-green-50 text-green-700 border border-green-200 text-[10px] font-black tracking-wider px-2.5 py-0.5 rounded uppercase">
                          {notice.audience}
                        </span>
                        <h3 className="font-extrabold text-base text-gray-900 leading-tight tracking-tight group-hover:text-green-600 transition-colors cursor-pointer pt-1 line-clamp-2">
                          {notice.title}
                        </h3>
                      </div>

                      <div className="pt-2">
                        <Link
                          to={`/notices/${notice.id}`}
                          className="w-full block text-center bg-green-600 hover:bg-green-700 text-white text-xs font-extrabold py-2.5 shadow-sm transition-colors cursor-pointer"
                        >
                          READ MORE
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          {rest.length === 0 && pinned.length === 0 && (
            <p className="text-center text-xs font-medium text-gray-400 italic">No notices to show right now.</p>
          )}
        </section>

      </div>
    </div>
  );
}