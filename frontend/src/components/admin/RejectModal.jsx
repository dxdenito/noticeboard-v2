import { useState } from "react";

export default function RejectModal({ onConfirm, onCancel, loading }) {
  const [notes, setNotes] = useState("");

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md p-5">
        <h2 className="text-base font-bold text-gray-900 mb-1">Reject notice</h2>
        <p className="text-xs text-gray-500 mb-3">
          Add a reason or suggested edit for the author to see.
        </p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          autoFocus
          placeholder="Why is this being rejected?"
          className="w-full border border-gray-200 rounded-md p-2 text-sm focus:outline-none focus:ring-1 focus:ring-jkuat-red resize-none"
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
            onClick={() => onConfirm(notes)}
            disabled={loading || !notes.trim()}
            className="bg-jkuat-red text-white text-xs font-bold px-3 py-1.5 rounded disabled:opacity-50"
          >
            Reject notice
          </button>
        </div>
      </div>
    </div>
  );
}