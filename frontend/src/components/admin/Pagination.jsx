import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({ page, onPageChange, hasMore, pageSize }) {
  return (
    <div className="flex items-center justify-between mt-4">
      <button
        onClick={() => onPageChange(Math.max(0, page - 1))}
        disabled={page === 0}
        className="flex items-center gap-1 text-xs font-semibold text-gray-500 disabled:opacity-30"
      >
        <ChevronLeft size={14} /> Previous
      </button>
      <span className="text-xs text-gray-400">Page {page + 1}</span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={!hasMore}
        className="flex items-center gap-1 text-xs font-semibold text-gray-500 disabled:opacity-30"
      >
        Next <ChevronRight size={14} />
      </button>
    </div>
  );
}