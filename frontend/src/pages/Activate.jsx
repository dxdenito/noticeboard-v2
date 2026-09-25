import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { api } from "../api/client";

export default function Activate() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("This activation link is missing its token.");
      return;
    }
    api.post(`/users/activate?token=${encodeURIComponent(token)}`)
      .then(() => setStatus("success"))
      .catch((err) => {
        setStatus("error");
        setErrorMessage(err.message);
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white border border-gray-200 rounded-xl p-8 max-w-sm w-full text-center">
        {status === "loading" && (
          <>
            <Loader2 size={32} className="animate-spin text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Activating your account...</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 size={32} className="text-jkuat-green mx-auto mb-3" />
            <h1 className="font-bold text-lg text-gray-900 mb-1">Account activated</h1>
            <p className="text-sm text-gray-500 mb-5">You can now log in.</p>
            <Link to="/login" className="inline-block bg-jkuat-green text-white text-sm font-bold px-5 py-2.5 rounded-lg">
              Go to login
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle size={32} className="text-jkuat-red mx-auto mb-3" />
            <h1 className="font-bold text-lg text-gray-900 mb-1">Activation failed</h1>
            <p className="text-sm text-gray-500">{errorMessage}</p>
          </>
        )}
      </div>
    </div>
  );
}