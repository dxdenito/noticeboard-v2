import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Calendar, MapPin } from "lucide-react";
import { api } from "../api/client";
import { AUDIENCE_LABELS, audienceStyle } from "../lib/audience";
import Pagination from "../components/admin/Pagination";

const PAGE_SIZE = 12;

function formatEventDateShort(isoString) {
  const d = new Date(isoString);
  return { day: d.getDate(), month: d.toLocaleString("default", { month: "short" }).toUpperCase() };
}

export default function AllEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  async function load() {
    setLoading(true);
    try {
      const data = await api.get(`/events/upcoming?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`);
      setEvents(data);
    } catch {
      // quiet — public page, degrade gracefully
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [page]);

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Upcoming Events</h1>

      {events.length === 0 ? (
        <p className="text-sm text-gray-400">No upcoming events right now.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => {
            const { day, month } = formatEventDateShort(event.start_date);
            const pill = audienceStyle(event.audience);
            return (
              <Link
                key={event.id}
                to={`/events/${event.id}`}
                className="group flex flex-col bg-jkuat-blue/5 overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-jkuat-blue/10"
              >
                <div className="relative w-full h-40 overflow-hidden bg-jkuat-blue/10">
                  {event.image_url ? (
                    <img
                      src={`${import.meta.env.VITE_API_URL}${event.image_url}`}
                      alt={event.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-jkuat-blue/40">
                      <Calendar size={32} />
                    </div>
                  )}
                  <div className="absolute top-2 left-2 bg-white rounded-lg px-2 py-1 text-center shadow-sm">
                    <div className="text-sm font-black text-jkuat-blue leading-none">{day}</div>
                    <div className="text-[9px] font-bold text-jkuat-blue/70 uppercase tracking-wide">{month}</div>
                  </div>
                </div>

                <div className="flex-1 flex flex-col p-4 gap-1.5">
                  <span className={`self-start text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${pill.bg} ${pill.text}`}>
                    {AUDIENCE_LABELS[event.audience] || event.audience}
                  </span>
                  <h3 className="font-bold text-sm text-gray-900 leading-snug line-clamp-2 group-hover:text-jkuat-blue transition-colors">
                    {event.title}
                  </h3>
                  {event.location && (
                    <p className="flex items-center gap-1 text-[11px] text-gray-500 mt-auto pt-1">
                      <MapPin size={11} className="shrink-0" />
                      <span className="truncate">{event.location}</span>
                    </p>
                  )}
                  <span className="mt-2 self-start text-xs font-bold text-jkuat-blue">
                    View Event →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Pagination page={page} onPageChange={setPage} hasMore={events.length === PAGE_SIZE} pageSize={PAGE_SIZE} />
    </div>
  );
}