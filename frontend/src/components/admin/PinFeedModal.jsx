import { useState } from "react";

export default function PinFeedModal({ notice, onConfirm, onCancel, loading }) {
  const [expiryDate, setExpiryDate] = useState("");

  function handleConfirm() {
    onConfirm(expiryDate ? new Date(expiryDate).toISOString() : null);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md p-5">
        <h2 className="text-base font-bold text-gray-900 mb-1">Pin to feed</h2>
        <p className="text-xs text-gray-500 mb-3">
          "{notice.title}" — choose how long this stays pinned, or leave blank to pin indefinitely.
        </p>
        <input
          type="date"
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
          min={new Date().toISOString().split("T")[0]}
          className="w-full border border-gray-200 rounded-md p-2 text-sm focus:outline-none focus:ring-1 focus:ring-jkuat-green"
        />
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onCancel}
            disabled={loading}
            className="text-xs font-semibold text-gray-500 px-3 py-1.5 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="bg-jkuat-green text-white text-xs font-bold px-3 py-1.5 rounded disabled:opacity-50"
          >
            {expiryDate ? "Pin until this date" : "Pin indefinitely"}
          </button>
        </div>
      </div>
    </div>
  );
}