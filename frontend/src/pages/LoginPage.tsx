import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { authApi } from "../api/auth";
import { LogIn, Sparkles, ShieldCheck } from "lucide-react";

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await authApi.login({ email, password });
      login(res.access_token, res.user);
      showToast(`Welcome back, ${res.user.full_name}!`, "success");
      navigate("/projects");
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("Password123!");
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex w-12 h-12 rounded-xl bg-teal-500 items-center justify-center text-slate-950 font-black text-2xl shadow-lg shadow-teal-500/20 mb-4">
          AP
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">
          Sign in to <span className="text-teal-400">AgilePulse</span>
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Strict hierarchical agile workspace: Project &rarr; User Story &rarr;
          Task
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 py-8 px-6 shadow-2xl rounded-2xl border border-slate-800 sm:px-10">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm font-medium">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                placeholder="name@company.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-slate-950 bg-teal-400 hover:bg-teal-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all disabled:opacity-50"
            >
              {loading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Autofill */}
          <div className="mt-6 pt-6 border-t border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>One-Click Demo Accounts</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo("alice@example.com")}
                className="p-2 text-left bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-lg text-xs transition-colors"
              >
                <p className="font-bold text-teal-300">Alice Chen</p>
                <p className="text-slate-400 text-[11px]">Owner / Admin</p>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo("bob@example.com")}
                className="p-2 text-left bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-lg text-xs transition-colors"
              >
                <p className="font-bold text-teal-300">Bob Smith</p>
                <p className="text-slate-400 text-[11px]">Developer</p>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo("charlie@example.com")}
                className="p-2 text-left bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-lg text-xs transition-colors"
              >
                <p className="font-bold text-teal-300">Charlie Davis</p>
                <p className="text-slate-400 text-[11px]">Designer</p>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo("dana@example.com")}
                className="p-2 text-left bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-lg text-xs transition-colors"
              >
                <p className="font-bold text-teal-300">Dana Lee</p>
                <p className="text-slate-400 text-[11px]">QA Engineer</p>
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="font-semibold text-teal-400 hover:text-teal-300"
            >
              Register now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
