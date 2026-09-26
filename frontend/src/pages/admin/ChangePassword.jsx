import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

export default function ChangePassword() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const forced = user?.must_change_password;

  async function handleSubmit(e) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showError("New passwords don't match");
      return;
    }
    if (newPassword.length < 8) {
      showError("New password must be at least 8 characters");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      await refreshUser();
      showSuccess("Password changed successfully");
      if (forced) {
        navigate("/dashboard");
      } else {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      showError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Change Password</h1>
      {forced ? (
        <p className="text-sm text-jkuat-red mb-6 flex items-center gap-1.5">
          <KeyRound size={14} /> You must set a new password before continuing.
        </p>
      ) : (
        <p className="text-sm text-gray-500 mb-6">Update the password you use to sign in.</p>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Current password</label>
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">New password</label>
          <input
            type="password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Confirm new password</label>
          <input
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-jkuat-green text-white font-bold py-2.5 rounded-lg disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Change Password"}
        </button>
      </form>
    </div>
  );
}