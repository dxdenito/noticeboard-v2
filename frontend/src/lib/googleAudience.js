import { api } from "../api/client";

let initialized = false;
let latestOnVerified = null;

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  return new Promise((resolve) => {
    const check = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(check);
        resolve(window.google);
      }
    }, 100);
  });
}

async function handleCredentialResponse(response) {
  if (!latestOnVerified) return;
  try {
    const data = await api.post("/audience/verify", { id_token: response.credential });
    latestOnVerified(data.audience, null);
  } catch (err) {
    latestOnVerified(null, err);
  }
}

export async function initGoogleAudience(clientId, onVerified) {
  latestOnVerified = onVerified;
  const google = await loadGoogleScript();
  if (!initialized) {
    google.accounts.id.initialize({
      client_id: clientId,
      callback: handleCredentialResponse,
      auto_select: true,
      cancel_on_tap_outside: false,
    });
    initialized = true;
  }
  return google;
}

export function promptOneTap() {
  window.google?.accounts?.id?.prompt();
}

export function renderGoogleButton(container, options = {}) {
  window.google?.accounts?.id?.renderButton(container, {
    theme: "outline",
    size: "large",
    text: "signin_with",
    width: 260,
    ...options,
  });
}