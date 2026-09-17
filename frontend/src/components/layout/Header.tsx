"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Search,
  ChevronDown,
  LogOut,
  User,
  CheckCheck,
  FileText,
  AlertTriangle,
  Clock,
  X,
} from "lucide-react";

const API_URL = "http://localhost:8000";

type Notification = {
  id: number;
  title: string;
  message: string;
  time: string;
  type: "review" | "audit" | "deadline";
  unread: boolean;
};

export default function Header() {
  const router = useRouter();

  const [showMenu, setShowMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: 1,
      title: "Review Required",
      message: "A workpaper is waiting for your review.",
      time: "10 minutes ago",
      type: "review",
      unread: true,
    },
    {
      id: 2,
      title: "Audit Workpaper Completed",
      message: "An audit workpaper has been marked as completed.",
      time: "1 hour ago",
      type: "audit",
      unread: true,
    },
    {
      id: 3,
      title: "Upcoming Deadline",
      message: "An engagement deadline is approaching.",
      time: "3 hours ago",
      type: "deadline",
      unread: true,
    },
  ]);

  const unreadCount = notifications.filter(
    (notification) => notification.unread
  ).length;

  const handleLogout = async () => {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    try {
      const response = await fetch(
        `${API_URL}/api/auth/logout/`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        console.error(
          "Logout failed:",
          response.status
        );

        setLoggingOut(false);
        return;
      }

      console.log("Logout successful.");

      setShowMenu(false);

      router.replace("/login");

      router.refresh();
    } catch (error) {
      console.error(
        "Logout request failed:",
        error
      );

      setLoggingOut(false);
    }
  };

  const getNotificationIcon = (
    type: Notification["type"]
  ) => {
    if (type === "review") {
      return (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <AlertTriangle size={17} />
        </div>
      );
    }

    if (type === "deadline") {
      return (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
          <Clock size={17} />
        </div>
      );
    }

    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
        <FileText size={17} />
      </div>
    );
  };

  const markAsRead = (id: number) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id
          ? {
              ...notification,
              unread: false,
            }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        unread: false,
      }))
    );
  };

  const removeNotification = (id: number) => {
    setNotifications((current) =>
      current.filter(
        (notification) => notification.id !== id
      )
    );
  };

  return (
    <header className="fixed left-64 right-0 top-0 z-30 h-20 border-b border-slate-200 bg-white">
      <div className="flex h-full items-center justify-between px-8">

        {/* Page title */}
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Audit Management System
          </h2>

          <p className="mt-0.5 text-sm text-slate-500">
            Manage and monitor your audit activities
          </p>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-5">

          {/* Search */}
          <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 md:flex">
            <Search
              size={18}
              className="text-slate-400"
            />

            <input
              type="text"
              placeholder="Search..."
              className="w-40 bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </div>

          {/* Notifications */}
          <div className="relative">

            <button
              type="button"
              onClick={() => {
                setShowNotifications(
                  (current) => !current
                );

                setShowMenu(false);
              }}
              className="relative rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              aria-label="Notifications"
              aria-expanded={showNotifications}
            >
              <Bell size={20} />

              {/* Notification count */}
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                  {unreadCount > 9
                    ? "9+"
                    : unreadCount}
                </span>
              )}
            </button>

            {/* Notification dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-14 w-96 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">

                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Notifications
                    </h3>

                    <p className="mt-0.5 text-xs text-slate-500">
                      {unreadCount > 0
                        ? `${unreadCount} unread notification${
                            unreadCount === 1
                              ? ""
                              : "s"
                          }`
                        : "You're all caught up"}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">

                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllAsRead}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-blue-600"
                        title="Mark all as read"
                        aria-label="Mark all as read"
                      >
                        <CheckCheck size={18} />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        setShowNotifications(false)
                      }
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      aria-label="Close notifications"
                    >
                      <X size={18} />
                    </button>

                  </div>
                </div>

                {/* Notifications list */}
                <div className="max-h-[420px] overflow-y-auto">

                  {notifications.length === 0 ? (
                    <div className="px-5 py-12 text-center">

                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <Bell size={22} />
                      </div>

                      <p className="mt-3 text-sm font-medium text-slate-700">
                        No notifications
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        New audit activities will appear here.
                      </p>

                    </div>
                  ) : (
                    notifications.map(
                      (notification) => (
                        <div
                          key={notification.id}
                          className={`group relative flex gap-3 border-b border-slate-100 px-5 py-4 transition hover:bg-slate-50 ${
                            notification.unread
                              ? "bg-blue-50/40"
                              : "bg-white"
                          }`}
                        >

                          {/* Icon */}
                          {getNotificationIcon(
                            notification.type
                          )}

                          {/* Content */}
                          <button
                            type="button"
                            onClick={() =>
                              markAsRead(
                                notification.id
                              )
                            }
                            className="min-w-0 flex-1 text-left"
                          >
                            <div className="flex items-start gap-2 pr-5">

                              <p
                                className={`text-sm ${
                                  notification.unread
                                    ? "font-semibold text-slate-900"
                                    : "font-medium text-slate-700"
                                }`}
                              >
                                {notification.title}
                              </p>

                              {notification.unread && (
                                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                              )}

                            </div>

                            <p className="mt-1 text-xs leading-5 text-slate-500">
                              {notification.message}
                            </p>

                            <p className="mt-1.5 text-[11px] text-slate-400">
                              {notification.time}
                            </p>
                          </button>

                          {/* Remove */}
                          <button
                            type="button"
                            onClick={() =>
                              removeNotification(
                                notification.id
                              )
                            }
                            className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-300 opacity-0 transition hover:bg-slate-200 hover:text-slate-600 group-hover:opacity-100"
                            aria-label="Remove notification"
                          >
                            <X size={14} />
                          </button>

                        </div>
                      )
                    )
                  )}

                </div>

                {/* Footer */}
                {notifications.length > 0 && (
                  <div className="border-t border-slate-100 bg-slate-50 px-5 py-3">
                    <button
                      type="button"
                      onClick={() =>
                        setShowNotifications(false)
                      }
                      className="w-full text-center text-xs font-semibold text-blue-600 transition hover:text-blue-700"
                    >
                      View all notifications
                    </button>
                  </div>
                )}

              </div>
            )}
          </div>

          {/* User menu */}
          <div className="relative border-l border-slate-200 pl-5">

            {/* User button */}
            <button
              type="button"
              onClick={() => {
                setShowMenu(
                  (current) => !current
                );

                setShowNotifications(false);
              }}
              disabled={loggingOut}
              className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-slate-50 disabled:cursor-not-allowed"
              aria-expanded={showMenu}
              aria-haspopup="menu"
            >
              {/* Avatar */}
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">
                S
              </div>

              {/* User information */}
              <div className="hidden text-left sm:block">
                <p className="text-sm font-semibold text-slate-900">
                  Samweli
                </p>

                <p className="text-xs text-slate-500">
                  Auditor
                </p>
              </div>

              <ChevronDown
                size={17}
                className={`text-slate-400 transition-transform ${
                  showMenu
                    ? "rotate-180"
                    : ""
                }`}
              />
            </button>

            {/* User dropdown */}
            {showMenu && (
              <div
                className="absolute right-0 top-16 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
                role="menu"
              >

                {/* User information */}
                <div className="border-b border-slate-100 px-4 py-4">
                  <div className="flex items-center gap-3">

                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">
                      S
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        Samweli
                      </p>

                      <p className="text-xs text-slate-500">
                        Auditor
                      </p>
                    </div>

                  </div>
                </div>

                {/* Menu buttons */}
                <div className="p-2">

                  {/* Profile */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                    role="menuitem"
                  >
                    <User size={17} />
                    Profile
                  </button>

                  {/* Logout */}
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    role="menuitem"
                  >
                    <LogOut size={17} />

                    {loggingOut
                      ? "Logging out..."
                      : "Logout"}
                  </button>

                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </header>
  );
}