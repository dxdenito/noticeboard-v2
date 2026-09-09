import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import image from "../images/image-1.jpg";

export default function NoticeGrid({ notices, onLockedClick }) {
  if (notices.length === 0) {
    return <p className="text-center text-xs font-medium text-gray-400 italic py-12">No notices found.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
      {notices.map((notice) => (
        <article
          key={notice.id}
          className="relative bg-white border border-gray-200 flex flex-col shadow-sm hover:shadow-xl transition-all rounded overflow-hidden group"
        >
          {notice.is_locked && (
            <button
              onClick={onLockedClick}
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/70 backdrop-blur-[1px] z-10"
            >
              <Lock size={20} className="text-gray-700" />
              <span className="text-xs font-bold text-gray-700 px-4 text-center">
                Verify your email to unlock
              </span>
            </button>
          )}

          <div className={notice.is_locked ? "blur-sm pointer-events-none select-none flex flex-col flex-1" : "flex flex-col flex-1"}>
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
                  <span>{new Date(notice.created_at).toLocaleDateString()}</span>
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
          </div>
        </article>
      ))}
    </div>
  );
}