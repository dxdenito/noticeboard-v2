import { useState } from "react";
import { Mail, CheckCircle } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";

export default function AudienceVerify({ onVerified, currentAudience }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { showError, showSuccess } = useToast();

  if (currentAudience) {
    return (
      <div className="flex items-center gap-2 bg-jkuat-green/10 text-jkuat-green text-xs font-semibold px-4 py-2 rounded-lg mb-4">
        <CheckCircle size={14} />
        Verified as {currentAudience} — seeing {currentAudience} notices too
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = await api.post("/audience/verify", { email });
      showSuccess(`Verified as ${data.audience}`);
      onVerified(data.audience);
    } catch (err) {
      showError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center bg-gray-50 border border-gray-200 rounded-lg p-3 mb-6">
      <div className="flex items-center gap-2 flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2">
        <Mail size={14} className="text-gray-400 shrink-0" />
        <input
          type="email"
          placeholder="Enter your JKUAT email to see student/staff notices"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="flex-1 text-sm outline-none min-w-0"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="bg-jkuat-green hover:bg-jkuat-green/90 text-white text-xs font-bold px-4 py-2 rounded-lg disabled:opacity-50 shrink-0"
      >
        {submitting ? "Verifying..." : "Verify"}
      </button>
    </form>
  );
}