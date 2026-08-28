import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client";
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from "../context/AuthContext";
import { ArrowLeft, Star, Pin, PinOff } from "lucide-react";
import { useToast } from "../context/ToastContext";


export default function NoticeDetail() {
  const { id } = useParams();
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const currentPostUrl = window.location.href;
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();

  async function toggleBookmark() {
    setBookmarkLoading(true);
    try {
      if (bookmarked) {
        await api.delete(`/notices/${id}/bookmark`);
        setBookmarked(false);
      } else {
        await api.post(`/notices/${id}/bookmark`);
        setBookmarked(true);
      }
    } catch (err) {
      showError(err.message);
    } finally {
      setBookmarkLoading(false);
    }
  }
  async function togglePin() {
    try {
      if (notice.is_pinned) {
        const updated = await api.patch(`/notices/${id}/unpin`);
        setNotice(updated);
        showSuccess("Removed from public site");
      } else {
        const updated = await api.patch(`/notices/${id}/pin`);
        setNotice(updated);
        showSuccess("Pinned to public site");
      }
    } catch (err) {
      showError(err.message);
    }
  }

  useEffect(() => {
    async function loadNotice() {
      try {
        const data = await api.get(`/notices/${id}`);
        setNotice(data);
        setBookmarked(data.is_bookmarked);
      } catch (err) {
        showError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadNotice();
  }, [id]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
 

  return (
    <>
    <div className="max-w-2xl mx-auto p-4">
      <Link to="/" className="text-sm text-blue-600 mb-4 inline-flex items-center gap-1">
        <ArrowLeft size={14} /> Back to feed
      </Link>
      <br />
      {user && (
        <button onClick={toggleBookmark} disabled={bookmarkLoading} className="text-sm text-blue-600 mb-4 inline-flex items-center gap-1">
          <Star size={14} fill={bookmarked ? "currentColor" : "none"} />
          {bookmarked ? "Bookmarked" : "Bookmark this"}
        </button>
      )}
      {user?.role.role === "admin" && (
        <button onClick={togglePin} className="text-sm text-jkuat-green mb-4 ml-3 inline-flex items-center gap-1 transition-transform active:scale-90">
          <span className="transition-transform duration-200">
            {notice.is_pinned ? <PinOff size={14} /> : <Pin size={14} />}
          </span>
          {notice.is_pinned ? "Unpin" : "Pin to public site"}
        </button>
      )}
      

      <div className="bg-white p-6 rounded  ">
        <h1 className="text-2xl font-semibold mb-2">{notice.title}</h1>
        <p className="text-sm text-gray-500 mb-4">
          {notice.category?.name} &middot; {notice.priority}
        </p>
        <p className="whitespace-pre-wrap">{notice.body}</p>
      </div>
    </div>
    {notice.attachments?.length > 0 && (
      <div className="mt-4 border-t pt-4 flex  justify-center ">
        <h3 className="font-medium mb-2">Attachments</h3>
        <ul className="space-y-1">
          {notice.attachments.map((att) => (
            <li key={att.id}>
              

               <a href={`${import.meta.env.VITE_API_URL}/attachments/${att.id}/download`}
                className="text-blue-600 text-sm underline"
              >
                {att.file_name}
              </a>
            </li>
          ))}
        </ul>
      </div>
    )}

    <div className="mt-4 p-2 border border-[#eaeaea] rounded bg-[#fafafa] flex items-center justify-center gap-2" >
        <div>
          <h3>Scan to Read on Mobile</h3>
          <p style={{ color: '#555', fontSize: '0.9em' }}>
            Share this article with friends or switch to your phone by scanning this code.
          </p>
        </div>



        <div style={{ background: '#fff', padding: '10px', borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <QRCodeSVG
            value={currentPostUrl}
            size={60}
            bgColor={"#ffffff"}
            fgColor={"#000000"}
            level={"M"}
          />
        </div>
      </div>
      </>
  );
}