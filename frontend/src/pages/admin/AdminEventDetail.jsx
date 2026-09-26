import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Building2, Pencil, Trash2, Check, X, Calendar } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { canApprove, canDeleteAnyNotice } from "../../lib/permissions";
import { AUDIENCE_LABELS, audienceStyle } from "../../lib/audience";
import RejectModal from "../../components/admin/RejectModal";
import { PENDING_COUNT_CHANGED_EVENT } from "../../layouts/AdminLayout";

const STATUS_STYLES = {
  approved: "bg-jkuat-green/10 text-jkuat-green",
  pending: "bg-amber-50 text-amber-700",
  rejected: "bg-red-50 text-red-600",
};

const STATUS_LABEL = {
  approved: "Published",
  pending: "Pending review",
  rejected: "Rejected",
};

function formatFullDateTime(isoString) {
  const d = new Date(isoString);
  const datePart = d.toLocaleDateString("default", { day: "numeric", month: "short", year: "numeric" });
  const timePart = d.toLocaleTimeString("default", { hour: "numeric", minute: "2-digit" });
  return `${datePart} · ${timePart}`;
}

export default function AdminEventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { showError, showSuccess } = useToast();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await api.get(`/events/${id}`);
      setEvent(data);
    } catch (err) {
      showError(err.message);
      setEvent(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  function goBack() {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate("/dashboard/review-queue");
    }
  }

  async function handleApprove() {
    setActionLoading(true);
    try {
      await api.patch(`/events/${id}/approve`);
      showSuccess("Event approved");
      load();
    } catch (err) {
      showError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject(notes) {
    setActionLoading(true);
    try {
      await api.patch(`/events/${id}/reject`, { rejection_notes: notes });
      showSuccess("Event rejected");
      setShowRejectModal(false);
      load();
    } catch (err) {
      showError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this event? This cannot be undone.")) return;
    try {
      await api.delete(`/events/${id}`);
      showSuccess("Event deleted");
      goBack();
    } catch (err) {
      showError(err.message);
    }
  }

  if (loading) return <div className="text-gray-400">Loading...</div>;
  if (!event) return <div className="text-gray-400">Event not found.</div>;

  const isAuthor = event.author_id === currentUser?.id;
  const canReview = event.status === "pending" && canApprove(currentUser);
  const canEditOrDelete = isAuthor || currentUser?.role?.name === "super_admin" || canDeleteAnyNotice(currentUser);
  const pill = audienceStyle(event.audience);

  return (
    <div>
      <button onClick={goBack} className="text-sm text-jkuat-blue mb-4 inline-flex items-center gap-1 font-semibold">
        <ArrowLeft size={14} /> Back
      </button>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        {event.image_url && (
          <div className="w-full h-64 rounded-xl overflow-hidden mb-4">
            <img
              src={`${import.meta.env.VITE_API_URL}${event.image_url}`}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${STATUS_STYLES[event.status]}`}>
              {STATUS_LABEL[event.status]}
            </span>
            <span className={`inline-block ${pill.bg} ${pill.text} text-[10px] font-bold px-2.5 py-0.5 rounded-full`}>
              {AUDIENCE_LABELS[event.audience] || event.audience}
            </span>
            {event.org_unit?.name && (
              <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                <Building2 size={10} />
                {event.org_unit.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {canReview && (
              <>
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="flex items-center gap-1 bg-jkuat-green text-white text-xs font-bold px-3 py-1.5 rounded disabled:opacity-50"
                >
                  <Check size={13} /> Approve
                </button>
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={actionLoading}
                  className="flex items-center gap-1 bg-jkuat-red text-white text-xs font-bold px-3 py-1.5 rounded disabled:opacity-50"
                >
                  <X size={13} /> Reject
                </button>
              </>
            )}
            {canEditOrDelete && (
              <>
                <button
                  onClick={() => navigate(`/dashboard/edit-event/${event.id}`)}
                  title="Edit"
                  className="text-gray-400 hover:text-jkuat-blue"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={handleDelete}
                  title="Delete"
                  className="text-gray-400 hover:text-jkuat-red"
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}
          </div>
        </div>

        <h1 className="font-serif text-2xl font-extrabold text-gray-900 mb-2">{event.title}</h1>

        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mb-1">
          <span className="flex items-center gap-1.5">
            <Calendar size={13} />
            {formatFullDateTime(event.start_date)}
            {event.end_date && ` – ${formatFullDateTime(event.end_date)}`}
          </span>
          {event.location && (
            <span className="flex items-center gap-1.5">
              <MapPin size={13} />
              {event.location}
            </span>
          )}
        </div>

        <p className="text-xs text-gray-400 mb-4">
          Posted by {event.author.full_name}
          {event.reviewed_by && (
            <> · {event.status === "rejected" ? "Rejected" : "Approved"} by {event.reviewed_by.full_name} on {formatFullDateTime(event.reviewed_at)}</>
          )}
        </p>

        {event.status === "rejected" && event.rejection_notes && (
          <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-6">
            <p className="text-[10px] font-bold uppercase tracking-wide text-jkuat-red mb-1">
              Rejection notes
            </p>
            <p className="text-sm text-red-700 whitespace-pre-wrap">{event.rejection_notes}</p>
          </div>
        )}

        <div
          className="prose prose-neutral max-w-none text-gray-800"
          dangerouslySetInnerHTML={{ __html: event.description }}
        />
      </div>

      {showRejectModal && (
        <RejectModal
          loading={actionLoading}
          onCancel={() => setShowRejectModal(false)}
          onConfirm={handleReject}
        />
      )}
    </div>
  );
}