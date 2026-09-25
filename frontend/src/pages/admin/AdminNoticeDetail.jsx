import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Building2, Pencil, Trash2, Check, X } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { canApprove, canDeleteAnyNotice } from "../../lib/permissions";
import { formatFileSize } from "../../lib/fileType";
import AttachmentThumb from "../../components/AttachmentThumb";
import RejectModal from "../../components/admin/RejectModal";
import { PENDING_COUNT_CHANGED_EVENT } from "../../layouts/AdminLayout";
import { AUDIENCE_LABELS, audienceStyle } from "../../lib/audience";

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

function AttachmentCard({ attachment }) {
  const downloadUrl = `${import.meta.env.VITE_API_URL}/attachments/${attachment.id}/download`;

  return (
    <a href={downloadUrl}
      className="group relative w-36 shrink-0 rounded-xl border border-gray-200 overflow-hidden hover:border-jkuat-green/40 hover:shadow-md transition-all bg-white"
    >
      <div className="relative w-full h-24 overflow-hidden">
        <AttachmentThumb attachment={attachment} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
          <Download size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      <div className="px-2.5 py-2">
        <p className="text-[11px] font-semibold text-gray-700 truncate" title={attachment.file_name}>
          {attachment.file_name}
        </p>
        <p className="text-[10px] text-gray-400">{formatFileSize(attachment.file_size)}</p>
      </div>
    </a>
  );
}

export default function AdminNoticeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { showError, showSuccess } = useToast();

  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await api.get(`/notices/${id}`);
      setNotice(data);
    } catch (err) {
      showError(err.message);
      setNotice(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  function goBack() {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate("/dashboard/all-notices");
    }
  }

  async function handleApprove() {
    setActionLoading(true);
    try {
      await api.patch(`/notices/${id}/approve`);
      window.dispatchEvent(new Event(PENDING_COUNT_CHANGED_EVENT));
      showSuccess("Notice approved");
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
      await api.patch(`/notices/${id}/reject`, { rejection_notes: notes });
      window.dispatchEvent(new Event(PENDING_COUNT_CHANGED_EVENT));
      showSuccess("Notice rejected");
      setShowRejectModal(false);
      load();
    } catch (err) {
      showError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this notice? This cannot be undone.")) return;
    try {
      await api.delete(`/notices/${id}`);
      showSuccess("Notice deleted");
      goBack();
    } catch (err) {
      showError(err.message);
    }
  }

  if (loading) return <div className="text-gray-400">Loading...</div>;
  if (!notice) return <div className="text-gray-400">Notice not found.</div>;

  const isAuthor = notice.author_id === currentUser?.id;
  const canReview = notice.status === "pending" && canApprove(currentUser);
  const canEditOrDelete = isAuthor || currentUser?.role?.name === "super_admin" || canDeleteAnyNotice(currentUser);

  return (
    <div>
      <button onClick={goBack} className="text-sm text-jkuat-green mb-4 inline-flex items-center gap-1 font-semibold">
        <ArrowLeft size={14} /> Back
      </button>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${STATUS_STYLES[notice.status]}`}>
              {STATUS_LABEL[notice.status]}
            </span>
            <span className={`inline-block ${audienceStyle(notice.audience).bg} ${audienceStyle(notice.audience).text} text-[10px] font-black tracking-wider px-2.5 py-0.5 rounded-full uppercase`}>
              {AUDIENCE_LABELS[notice.audience] || notice.audience}
            </span>
            {notice.category?.name && (
              <span className="inline-block bg-gray-100 text-gray-600 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                {notice.category.name}
              </span>
            )}
            {notice.org_unit?.name && (
              <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                <Building2 size={10} />
                {notice.org_unit.name}
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
                  onClick={() => navigate(`/dashboard/edit-notice/${notice.id}`)}
                  title="Edit"
                  className="text-gray-400 hover:text-jkuat-green"
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

        <h1 className="font-serif text-2xl font-extrabold text-gray-900 mb-2">{notice.title}</h1>

        <p className="text-xs text-gray-400 mb-1">
          Posted by {notice.author.full_name} on {formatFullDateTime(notice.created_at)}
        </p>
        {notice.reviewed_by && (
          <p className="text-xs text-gray-400 mb-4">
            {notice.status === "rejected" ? "Rejected" : "Approved"} by {notice.reviewed_by.full_name} on {formatFullDateTime(notice.reviewed_at)}
          </p>
        )}

        {notice.status === "rejected" && notice.rejection_notes && (
          <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-6">
            <p className="text-[10px] font-bold uppercase tracking-wide text-jkuat-red mb-1">
              Rejection notes
            </p>
            <p className="text-sm text-red-700 whitespace-pre-wrap">{notice.rejection_notes}</p>
          </div>
        )}

        <div
          className="prose prose-neutral max-w-none text-gray-800"
          dangerouslySetInnerHTML={{ __html: notice.body }}
        />

        {notice.attachments?.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">
              {notice.attachments.length} {notice.attachments.length === 1 ? "Attachment" : "Attachments"}
            </h3>
            <div className="flex flex-wrap gap-3">
              {notice.attachments.map((att) => (
                <AttachmentCard key={att.id} attachment={att} />
              ))}
            </div>
          </div>
        )}
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