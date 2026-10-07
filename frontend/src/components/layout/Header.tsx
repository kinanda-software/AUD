"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell, CheckCheck, ChevronDown, Clock, FileText, LogOut, Menu,
  RefreshCw, Settings, X,
} from "lucide-react";
import { logoutToLogin } from "@/lib/logout";
import {
  deleteNotification, getNotifications, markAllNotificationsRead,
  markNotificationRead, type AuditNotification,
} from "@/lib/notifications";
import type { AuthUser } from "./AppLayout";

type HeaderProps = {
  user: AuthUser;
  navigationOpen: boolean;
  onToggleNavigation: () => void;
};

export default function Header({ user, navigationOpen, onToggleNavigation }: HeaderProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [notifications, setNotifications] = useState<AuditNotification[]>([]);
  const [notificationError, setNotificationError] = useState("");
  const [notificationLoading, setNotificationLoading] = useState(true);
  const [notificationBusy, setNotificationBusy] = useState(false);
  const loadController = useRef<AbortController | null>(null);
  const displayName = `${user.first_name} ${user.last_name}`.trim() || user.username;
  const initials = (user.first_name && user.last_name
    ? `${user.first_name[0]}${user.last_name[0]}` : displayName.slice(0, 2)).toUpperCase();
  const roleDisplayName = user.role === "admin" ? "Administrator"
    : user.role.replace(/\b\w/g, (letter) => letter.toUpperCase());
  const unreadCount = notifications.filter((item) => !item.is_read).length;

  const refreshNotifications = useCallback(() => {
    loadController.current?.abort();
    const controller = new AbortController();
    loadController.current = controller;
    return getNotifications(controller.signal).then((result) => {
      if (!controller.signal.aborted) {
        setNotifications(result);
        setNotificationError("");
      }
    }).catch((failure: unknown) => {
      if (controller.signal.aborted) return;
      console.error("Notification load failed:", failure);
      setNotificationError("Unable to load notifications. Retry to retrieve current information.");
    }).finally(() => {
      if (!controller.signal.aborted) setNotificationLoading(false);
    });
  }, []);

  const requestNotifications = () => {
    setNotificationLoading(true);
    setNotificationError("");
    void refreshNotifications();
  };

  useEffect(() => {
    void refreshNotifications();
    return () => loadController.current?.abort();
  }, [refreshNotifications]);

  useEffect(() => {
    const closeMenus = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowMenu(false);
        setShowNotifications(false);
      }
    };
    document.addEventListener("keydown", closeMenus);
    return () => document.removeEventListener("keydown", closeMenus);
  }, []);

  const updateNotification = async (operation: () => Promise<void>) => {
    if (notificationBusy || notificationLoading) return;
    setNotificationBusy(true);
    setNotificationError("");
    try {
      await operation();
    } catch (failure) {
      console.error("Notification update failed:", failure);
      setNotificationError("Unable to update notifications. Your change was not confirmed; please retry.");
    } finally {
      setNotificationBusy(false);
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError("");
    try {
      await logoutToLogin();
    } catch (failure) {
      console.error("Logout request failed:", failure);
      setLogoutError("Unable to log out. Please check your connection and try again.");
      setLoggingOut(false);
    }
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-30 h-20 border-b border-slate-200 bg-white lg:left-64">
      <div className="flex h-full items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={onToggleNavigation} aria-label={navigationOpen ? "Close navigation" : "Open navigation"} aria-expanded={navigationOpen} aria-controls="workspace-navigation" className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden">
            <Menu size={22} aria-hidden="true" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-slate-900 sm:text-lg">IFS / AUD</p>
            <p className="hidden text-xs text-slate-600 sm:block">Audit Management Platform</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <div className="relative">
            <button type="button" onClick={() => {
              if (!showNotifications && !notificationBusy) requestNotifications();
              setShowNotifications((value) => !value);
              setShowMenu(false);
            }} aria-label="Notifications" aria-expanded={showNotifications} aria-controls="audit-notifications" className="relative rounded-xl p-2.5 text-slate-700 hover:bg-slate-100">
              <Bell size={21} aria-hidden="true" />
              {unreadCount > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-red-700 px-1.5 py-0.5 text-[10px] font-bold text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>}
              {notificationError && <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-amber-600" aria-label="Notifications unavailable" />}
            </button>
            {showNotifications && <section id="audit-notifications" aria-label="Audit notifications" className="fixed left-3 right-3 top-20 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-14 sm:w-96">
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 p-4">
                <div><h2 className="text-sm font-bold text-slate-900">Notifications</h2><p className="mt-1 text-xs text-slate-600">{notificationLoading ? "Loading..." : notificationError ? "Information unavailable" : `${unreadCount} unread`}</p></div>
                <div className="flex">
                  <button type="button" aria-label="Refresh notifications" disabled={notificationBusy || notificationLoading} onClick={requestNotifications} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-50"><RefreshCw size={17} aria-hidden="true" /></button>
                  {unreadCount > 0 && <button type="button" aria-label="Mark all as read" disabled={notificationBusy || notificationLoading} onClick={() => void updateNotification(async () => {
                    await markAllNotificationsRead();
                    setNotifications((items) => items.map((item) => ({ ...item, is_read: true })));
                  })} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-50"><CheckCheck size={17} aria-hidden="true" /></button>}
                  <button type="button" aria-label="Close notifications" onClick={() => setShowNotifications(false)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><X size={17} aria-hidden="true" /></button>
                </div>
              </div>
              {notificationError && <p role="alert" className="bg-red-50 p-4 text-xs leading-5 text-red-800">{notificationError} Previously loaded items, if shown, may be out of date.</p>}
              <div className="max-h-[60vh] overflow-y-auto">
                {notificationLoading && <p role="status" className="p-5 text-sm text-slate-600">Retrieving notifications...</p>}
                {!notificationLoading && !notificationError && !notifications.length && <p className="p-8 text-center text-sm text-slate-600">No notifications for your account.</p>}
                {notifications.map((notification) => (
                  <article key={notification.id} className={`flex gap-3 border-b border-slate-200 p-4 ${notification.is_read ? "bg-white" : "bg-blue-50/50"}`}>
                    {notification.notification_type === "deadline" ? <Clock size={18} className="mt-1 shrink-0 text-amber-700" aria-hidden="true" /> : <FileText size={18} className="mt-1 shrink-0 text-blue-700" aria-hidden="true" />}
                    <button type="button" disabled={notificationBusy || notificationLoading || notification.is_read} onClick={() => void updateNotification(async () => {
                      const updated = await markNotificationRead(notification.id);
                      setNotifications((items) => items.map((item) => item.id === updated.id ? updated : item));
                    })} className="min-w-0 flex-1 text-left disabled:cursor-default">
                      <p className="text-sm font-semibold text-slate-900">{notification.title}{!notification.is_read && <span className="ml-2 text-xs text-blue-800">Unread</span>}</p>
                      <p className="mt-1 break-words text-xs leading-5 text-slate-600">{notification.message}</p>
                      <time dateTime={notification.created_at} className="mt-2 block text-xs text-slate-600">{new Date(notification.created_at).toLocaleString("en-GB")}</time>
                    </button>
                    <button type="button" aria-label={`Delete notification: ${notification.title}`} disabled={notificationBusy || notificationLoading} onClick={() => void updateNotification(async () => {
                      await deleteNotification(notification.id);
                      setNotifications((items) => items.filter((item) => item.id !== notification.id));
                    })} className="h-fit rounded-lg p-1 text-slate-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"><X size={16} aria-hidden="true" /></button>
                  </article>
                ))}
              </div>
            </section>}
          </div>
          <div className="relative border-l border-slate-200 pl-2 sm:pl-4">
            <button type="button" aria-label={`Account menu for ${displayName}`} aria-expanded={showMenu} aria-haspopup="menu" disabled={loggingOut} onClick={() => { setShowMenu((value) => !value); setShowNotifications(false); }} className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-slate-50">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-800">{initials}</span>
              <span className="hidden max-w-40 text-left sm:block"><span className="block truncate text-sm font-semibold text-slate-900">{displayName}</span><span className="block text-xs text-slate-600">{roleDisplayName}</span></span>
              <ChevronDown size={16} className="text-slate-600" aria-hidden="true" />
            </button>
            {showMenu && <div role="menu" className="absolute right-0 top-14 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
              <p className="break-words border-b border-slate-200 px-3 py-3 text-sm font-semibold text-slate-900">{displayName}</p>
              <Link href="/settings" role="menuitem" onClick={() => setShowMenu(false)} className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-slate-700 hover:bg-slate-100"><Settings size={17} aria-hidden="true" />Settings</Link>
              <button type="button" role="menuitem" disabled={loggingOut} onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"><LogOut size={17} aria-hidden="true" />{loggingOut ? "Logging out..." : "Logout"}</button>
              {logoutError && <p role="alert" className="px-3 py-2 text-xs leading-5 text-red-700">{logoutError}</p>}
            </div>}
          </div>
        </div>
      </div>
    </header>
  );
}
