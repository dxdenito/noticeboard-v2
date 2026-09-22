import { useEffect } from "react";
import { initGoogleAudience, promptOneTap } from "../lib/googleAudience";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export function useAudienceOneTap(onVerified) {
  useEffect(() => {
    let cancelled = false;
    initGoogleAudience(CLIENT_ID, (audience) => {
      if (!cancelled && audience) onVerified(audience);
    }).then(() => {
      if (!cancelled) promptOneTap();
    });
    return () => { cancelled = true; };
  }, []);
}