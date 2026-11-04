import React, { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  KanbanSquare,
  GitFork,
  FileBarChart,
  Bell,
  CheckSquare,
  LogOut,
  FolderGit2,
  Menu,
  X,
  Activity,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { notificationsApi } from "../api/notifications";

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId?: string }>();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Poll for unread notifications count every 30s
  const { data: notificationsData } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => notificationsApi.list(true),
    enabled: !!user,
    refetchInterval: 30000,
  });

  const unreadCount = notificationsData?.total || 0;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const isActive = (path: string) => location.pathname === path;
  const isProjectActive = (subpath: string) =>
    projectId
      ? location.pathname.includes(`/projects/${projectId}/${subpath}`)
      : false;

  return (
    <nav className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Left Navigation */}
          <div className="flex items-center gap-8">
            <Link
              to="/projects"
              className="flex items-center gap-2.5 font-black text-lg tracking-tight"
            >
              <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center text-slate-950 font-extrabold shadow-sm">
                AP
              </div>
              <span className="text-white">
                Agile<span className="text-teal-400">Pulse</span>
              </span>
            </Link>

            {/* Project Context Links (shown when inside a project) */}
            {projectId && (
              <div className="hidden md:flex items-center space-x-1 pl-4 border-l border-slate-800">
                <Link
                  to={`/projects/${projectId}/board`}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isProjectActive("board")
                      ? "bg-slate-800 text-teal-400 shadow-sm"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <KanbanSquare className="w-4 h-4" />
                  <span>Kanban</span>
                </Link>

                <Link
                  to={`/projects/${projectId}/hierarchy`}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isProjectActive("hierarchy")
                      ? "bg-slate-800 text-teal-400 shadow-sm"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <GitFork className="w-4 h-4" />
                  <span>Hierarchy</span>
                </Link>

                <Link
                  to={`/projects/${projectId}/dashboard`}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isProjectActive("dashboard")
                      ? "bg-slate-800 text-teal-400 shadow-sm"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </Link>

                <Link
                  to={`/projects/${projectId}/reports`}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isProjectActive("reports")
                      ? "bg-slate-800 text-teal-400 shadow-sm"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <FileBarChart className="w-4 h-4" />
                  <span>Reports</span>
                </Link>

                <Link
                  to={`/projects/${projectId}/activity`}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isProjectActive("activity")
                      ? "bg-slate-800 text-teal-400 shadow-sm"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  <span>Activity</span>
                </Link>
              </div>
            )}
          </div>

          {/* Right Navigation */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              to="/projects"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive("/projects")
                  ? "text-teal-400 bg-slate-800"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <FolderGit2 className="w-4 h-4" />
              <span>Projects</span>
            </Link>

            <Link
              to="/my-tasks"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive("/my-tasks")
                  ? "text-teal-400 bg-slate-800"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span>My Tasks</span>
            </Link>

            <Link
              to="/notifications"
              className="relative p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[1rem] px-1 items-center justify-center rounded-full bg-teal-500 text-[10px] font-extrabold text-slate-950">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>

            {/* User Profile & Logout */}
            <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-teal-300 border border-slate-600">
                {user?.full_name?.charAt(0) || "U"}
              </div>
              <div className="text-left text-xs leading-tight">
                <p className="font-semibold text-slate-200">
                  {user?.full_name}
                </p>
                <p className="text-slate-400 capitalize">{user?.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors ml-1"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mobile hamburger menu button */}
          <div className="flex md:hidden items-center gap-2">
            <Link to="/notifications" className="relative p-2 text-slate-300">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-teal-500 text-[10px] font-bold text-slate-950">
                  {unreadCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-400 hover:text-white"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-950 border-b border-slate-800 px-4 pt-2 pb-4 space-y-1">
          {projectId && (
            <>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 py-1">
                Project Navigation
              </div>
              <Link
                to={`/projects/${projectId}/board`}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:bg-slate-800"
              >
                Kanban Board
              </Link>
              <Link
                to={`/projects/${projectId}/hierarchy`}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:bg-slate-800"
              >
                Hierarchy Tree
              </Link>
              <Link
                to={`/projects/${projectId}/dashboard`}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:bg-slate-800"
              >
                Dashboard
              </Link>
              <Link
                to={`/projects/${projectId}/reports`}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:bg-slate-800"
              >
                Reports
              </Link>
              <Link
                to={`/projects/${projectId}/activity`}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:bg-slate-800"
              >
                Activity Log
              </Link>
              <div className="border-t border-slate-800 my-2"></div>
            </>
          )}
          <Link
            to="/projects"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:bg-slate-800"
          >
            All Projects
          </Link>
          <Link
            to="/my-tasks"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:bg-slate-800"
          >
            My Assigned Tasks
          </Link>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-rose-400 hover:bg-slate-800"
          >
            Sign Out
          </button>
        </div>
      )}
    </nav>
  );
};
