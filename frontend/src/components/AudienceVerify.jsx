import { useEffect, useRef } from "react";
import { CheckCircle } from "lucide-react";
import { initGoogleAudience, renderGoogleButton } from "../lib/googleAudience";
import { useToast } from "../context/ToastContext";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function AudienceVerify({ onVerified, currentAudience }) {
  const buttonRef = useRef(null);
  const { showError, showSuccess } = useToast();

  useEffect(() => {
    if (currentAudience) return;
    let cancelled = false;
    initGoogleAudience(CLIENT_ID, (audience, err) => {
      if (cancelled) return;
      if (audience) {
        showSuccess(`Verified as ${audience}`);
        onVerified(audience);
      } else if (err) {
        showError(err.message);
      }
    }).then((google) => {
      if (!cancelled && buttonRef.current) {
        renderGoogleButton(buttonRef.current);
      }
    });
    return () => { cancelled = true; };
  }, [currentAudience]);

  if (currentAudience) {
    return (
      <div className="flex items-center gap-2 bg-jkuat-green/10 text-jkuat-green text-xs font-semibold px-4 py-2 rounded-lg mb-4">
        <CheckCircle size={14} />
        Verified as {currentAudience} — seeing {currentAudience} notices too
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 mb-2">
      <div ref={buttonRef} />
      <p className="text-[11px] text-gray-400 text-center px-4">
        Only your institutional email is checked to confirm student/staff access.
      </p>
    </div>
  );
}