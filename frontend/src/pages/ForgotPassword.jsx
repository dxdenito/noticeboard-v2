import { useState } from "react";
import { Link } from "react-router-dom";
import logo from "../images/jkuatlogo.png";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { showError } = useToast();

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSubmitted(true);
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
            Forgot Password
          </h1>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest text-center">
            {submitted ? "Check your email" : "We'll email you a reset link"}
          </p>
        </div>

        {submitted ? (
          <p className="text-sm text-gray-500 text-center">
            If that email is registered, a reset link is on its way. It's valid for 24 hours.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 pl-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@jkuat.ac.ke"
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-sm font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:border-jkuat-green transition-colors bg-gray-50/50"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-jkuat-green hover:bg-jkuat-green-dark text-white font-extrabold tracking-wide py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 text-sm"
            >
              {submitting ? "Sending..." : "SEND RESET LINK"}
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