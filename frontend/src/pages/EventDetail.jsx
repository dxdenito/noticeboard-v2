import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Calendar, Building2 } from "lucide-react";
import { api } from "../api/client";
import { AUDIENCE_LABELS, audienceStyle } from "../lib/audience";

function formatFullDateTime(isoString) {
  const d = new Date(isoString);
  const datePart = d.toLocaleDateString("default", { day: "numeric", month: "short", year: "numeric" });
  const timePart = d.toLocaleTimeString("default", { hour: "numeric", minute: "2-digit" });
  return `${datePart} · ${timePart}`;
}

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/events/${id}`)
      .then(setEvent)
      .catch(() => setEvent(null))
      .finally(() => setLoading(false));
  }, [id]);

  function goBack() {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate("/");
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>;
  if (!event) return <div className="p-8 text-center text-gray-400">Event not found.</div>;

  const pill = audienceStyle(event.audience);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <button onClick={goBack} className="text-sm text-jkuat-blue mb-4 inline-flex items-center gap-1">
        <ArrowLeft size={14} /> Back
      </button>

      <div className="bg-white rounded-2xl p-6">
        {event.image_url && (
          <div className="w-full h-72 rounded-xl overflow-hidden mb-5">
            <img
              src={`${import.meta.env.VITE_API_URL}${event.image_url}`}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className={`inline-block ${pill.bg} ${pill.text} text-[10px] font-black tracking-wider px-2.5 py-0.5 rounded-full uppercase`}>
            {AUDIENCE_LABELS[event.audience] || event.audience}
          </span>
          {event.org_unit?.name && (
            <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
              <Building2 size={10} />
              {event.org_unit.name}
            </span>
          )}
        </div>

        <h1 className="text-2xl font-extrabold text-gray-900 mb-3">{event.title}</h1>

        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-6">
          <span className="flex items-center gap-1.5">
            <Calendar size={15} />
            {formatFullDateTime(event.start_date)}
            {event.end_date && ` – ${formatFullDateTime(event.end_date)}`}
          </span>
          {event.location && (
            <span className="flex items-center gap-1.5">
              <MapPin size={15} />
              {event.location}
            </span>
          )}
        </div>

        <div
          className="prose prose-neutral max-w-none text-gray-800"
          dangerouslySetInnerHTML={{ __html: event.description }}
        />
      </div>
    </div>
  );
}