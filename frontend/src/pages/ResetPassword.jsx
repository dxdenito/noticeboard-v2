import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import logo from "../images/jkuatlogo.png";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showError("Passwords don't match");
      return;
    }
    if (newPassword.length < 8) {
      showError("Password must be at least 8 characters");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: newPassword });
      showSuccess("Password reset — you can now log in");
      navigate("/login");
    } catch (err) {
      showError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full min-h-screen bg-white relative flex items-center justify-center overflow-hidden font-sans select-none">
      <main className="w-full max-w-md bg-white border border-gray-100 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-8 relative z-10 mx-auto">
        <div className="absolute top-0 left-0 right-0 h-2 bg-jkuat-green rounded-t-2xl" />

        <div className="flex flex-col items-center justify-center space-y-2 pt-2 mb-6">
          <img src={logo} className="h-10" alt="Jkuat Logo" />
          <h1 className="text-xl font-black tracking-tight text-gray-900 uppercase pt-2">
            Reset Password
          </h1>
        </div>

        {!token ? (
          <p className="text-sm text-jkuat-red text-center">
            This reset link is missing its token. Request a new one from the forgot password page.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 pl-1">
                New password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-sm font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:border-jkuat-green transition-colors bg-gray-50/50"
              />
            </div>
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 pl-1">
                Confirm new password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-sm font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:border-jkuat-green transition-colors bg-gray-50/50"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-jkuat-green hover:bg-jkuat-green-dark text-white font-extrabold tracking-wide py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 text-sm"
            >
              {submitting ? "Resetting..." : "RESET PASSWORD"}
            </button>
          </form>
        )}

        <Link to="/login" className="block text-center text-xs text-jkuat-blue font-medium pt-6 hover:underline">
          ← Back to login
        </Link>
      </main>
    </div>
  );
}