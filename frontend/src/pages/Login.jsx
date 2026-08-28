import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from "../images/jkuatlogo.png"
import { useToast } from '../context/ToastContext';

export default function AsymmetricLoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const { showError, showSuccess } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      showError(err.message)
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="w-full min-h-screen bg-white relative flex items-center justify-center overflow-hidden font-sans select-none">
      
      {/* ========================================================================= */}
      {/* BACKGROUND DIAGONAL STRIPES (As drawn in sketch)                           */}
      {/* ========================================================================= */}
      
      {/* Top Right / Center Diagonal Stripes (White background canvas with Red stripe overlay) */}
      <div 
        className="absolute inset-0 z-0 bg-white pointer-events-none"
        style={{
          background: `linear-gradient(135deg, 
            rgba(255,255,255,0) 0%, 
            rgba(255,255,255,0) 40%, 
            #dc2626 40%, 
            #dc2626 65%, 
            #ffffff 65%, 
            #ffffff 100%)`
        }}
      />

      {/* Bottom Left / Center Diagonal Stripes (Green stripe overlay matching alignment) */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, 
            rgba(255,255,255,0) 0%, 
            rgba(255,255,255,0) 68%, 
            #16a34a 68%, 
            #16a34a 85%, 
            transparent 85%)`
        }}
      />

      {/* Additional creative geometric alignment block overlay to complete the look */}
      <div 
        className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-white pointer-events-none z-0"
        style={{ clipPath: 'polygon(0 100%, 100% 100%, 0 0)' }}
      />


      {/* ========================================================================= */}
      {/* LOGIN CARD WINDOW (Centered Container)                                    */}
      {/* ========================================================================= */}
      <main className="w-full max-w-md bg-white border border-gray-100 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-8 relative z-10 mx-auto backdrop-blur-sm bg-white/95">
        
        {/* Top Decorative Color Accent Strip */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-jkuat-green rounded-t-2xl" />

        <form onSubmit={handleLogin} className="flex flex-col items-stretch space-y-6">
          
          {/* LOGO CONTAINER (Handwritten cloud emblem reimagined) */}
          <div className="flex flex-col items-center justify-center space-y-2 pt-2">
            <img src={logo} className="h-10" alt="Jkuat Logo" />
            <h1 className="text-xl font-black tracking-tight text-gray-900 uppercase pt-2">
              Noticeboard Portal
            </h1>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Secure Credentials Access</p>
          </div>

          {/* INPUT FORM FIELD CONTROLS */}
          <div className="space-y-4 pt-4">
            
            {/* Username Input layout */}
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 pl-1">
                Username / Email
              </label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter workspace handle"
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-sm font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:border-red-600 transition-colors bg-gray-50/50"
              />
            </div>

            {/* Password Input layout */}
            <div className="flex flex-col space-y-1">
              <div className="flex justify-between items-center pl-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Password
                </label>
                <a href="#forgot" className="text-xs font-bold text-green-600 hover:underline">
                  Forgot?
                </a>
              </div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-sm font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-600 transition-colors bg-gray-50/50"
              />
            </div>

          </div>

          {/* LOGIN SUBMIT CALL TO ACTION */}
          <div className="pt-2">
            <button 
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-extrabold tracking-wide py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all transform active:scale-[0.99] cursor-pointer text-center text-sm"
            >
              LOGIN TO PANEL →
            </button>
          </div>

          {/* System Footer Link inside Card */}
          <p className="text-center text-xs text-gray-400 font-medium pt-2">
            Authorized Personnel Only. Certification code <span className="font-bold text-gray-500">ISO-9001</span>.
          </p>

        </form>
      </main>

    </div>
  );
}
