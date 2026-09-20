import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Calendar, DollarSign, AlertTriangle, Check, X, Clock, Plus,
  Trash2, TrendingDown, Landmark, Loader2, LogOut, ChevronDown, Users, CreditCard
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip, Cell } from "recharts";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const COLORS = {
  ink: "#1C2B22", paper: "#F3F1EC", paperDeep: "#EBE7DD",
  moss: "#2F5233", brass: "#B8923F", rust: "#B4472A", slate: "#5C6660",
};

const STATUS = {
  BOOKED: { label: "Booked", color: COLORS.slate, icon: Clock },
  DONE: { label: "Done", color: COLORS.moss, icon: Check },
  NOSHOW: { label: "No-show", color: COLORS.rust, icon: X },
  CANCELLED: { label: "Cancelled", color: COLORS.rust, icon: X },
};

const SWIPE_OPEN = -168;

function money(n) {
  return n < 0 ? `-$${Math.abs(n).toLocaleString()}` : `$${n.toLocaleString()}`;
}
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function ScheduleRow({ row, onSetStatus, onDelete, canSeeMoney }) {
  const [dragX, setDragX] = useState(0);
  const [open, setOpen] = useState(false);
  const startX = useRef(null);
  const dragging = useRef(false);

  const onPointerDown = (e) => { startX.current = e.clientX; dragging.current = true; e.currentTarget.setPointerCapture?.(e.pointerId); };
  const onPointerMove = (e) => {
    if (!dragging.current || startX.current === null) return;
    const delta = e.clientX - startX.current;
    const base = open ? SWIPE_OPEN : 0;
    setDragX(Math.min(0, Math.max(SWIPE_OPEN, base + delta)));
  };
  const endDrag = () => {
    dragging.current = false;
    const shouldOpen = dragX < SWIPE_OPEN / 2;
    setOpen(shouldOpen);
    setDragX(shouldOpen ? SWIPE_OPEN : 0);
  };

  const s = STATUS[row.status];
  const negative = row.status === "NOSHOW" || row.status === "CANCELLED";
  const time = new Date(row.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return (
    <div className="tb-row relative border-t overflow-hidden" style={{ borderColor: COLORS.paperDeep }}>
      <div className="absolute inset-y-0 right-0 flex items-stretch lg:hidden" style={{ width: 168 }}>
        <button onClick={() => { onSetStatus(row.id, "DONE"); setOpen(false); setDragX(0); }} className="flex flex-col items-center justify-center gap-1 text-xs text-white" style={{ width: 56, background: COLORS.moss }}><Check size={18} /> Done</button>
        <button onClick={() => { onSetStatus(row.id, "NOSHOW"); setOpen(false); setDragX(0); }} className="flex flex-col items-center justify-center gap-1 text-xs text-white" style={{ width: 56, background: COLORS.brass }}><X size={18} /> No-show</button>
        <button onClick={() => onDelete(row.id)} className="flex flex-col items-center justify-center gap-1 text-xs text-white" style={{ width: 56, background: COLORS.rust }}><Trash2 size={18} /> Delete</button>
      </div>

      <div
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}
        className="relative grid grid-cols-[52px_1fr_auto] lg:grid-cols-[64px_1fr_150px_auto] gap-2 lg:gap-3 px-3 sm:px-4 py-3 items-center"
        style={{ background: COLORS.paper, transform: `translateX(${dragX}px)`, transition: dragging.current ? "none" : "transform 160ms ease-out" }}
      >
        <span className="text-xs sm:text-sm" style={{ color: COLORS.slate }}>{time}</span>
        <span className="min-w-0">
          <span className="block text-sm sm:text-base truncate">{row.client?.name}</span>
          <span className="flex items-center gap-1.5 text-xs mt-0.5 lg:hidden" style={{ color: s.color }}><s.icon size={11} /> {s.label} &middot; {row.service}</span>
          <span className="hidden lg:block text-xs mt-0.5" style={{ color: COLORS.slate }}>{row.service}</span>
        </span>
        <span className="hidden lg:flex items-center gap-1 text-xs" style={{ color: s.color }}><s.icon size={12} /> {s.label}</span>
        <span className="flex items-center gap-2 justify-end">
          {canSeeMoney ? (
            <span className="text-sm sm:text-base" style={{ fontFamily: "'Source Serif 4', serif", color: negative ? COLORS.rust : COLORS.ink, minWidth: 56 }}>
              {negative ? `-${money(Number(row.value))}` : money(Number(row.value))}
            </span>
          ) : (
            <span className="text-xs" style={{ color: COLORS.slate }}>&mdash;</span>
          )}
          <span className="hidden lg:flex items-center gap-1">
            <button onClick={() => onSetStatus(row.id, "DONE")} title="Mark done" className="p-1.5 border" style={{ borderColor: COLORS.paperDeep, color: COLORS.moss }}><Check size={14} /></button>
            <button onClick={() => onSetStatus(row.id, "NOSHOW")} title="Mark no-show" className="p-1.5 border" style={{ borderColor: COLORS.paperDeep, color: COLORS.rust }}><X size={14} /></button>
            <button onClick={() => onDelete(row.id)} title="Delete" className="p-1.5 border" style={{ borderColor: COLORS.paperDeep, color: COLORS.slate }}><Trash2 size={14} /></button>
          </span>
        </span>
      </div>
    </div>
  );
}

function AddAppointmentSheet({ open, onClose, onSubmit }) {
  const [draft, setDraft] = useState({ time: "", clientName: "", service: "", value: "" });
  if (!open) return null;
  const submit = (e) => {
    e.preventDefault();
    if (!draft.time || !draft.clientName || !draft.value) return;
    onSubmit(draft);
    setDraft({ time: "", clientName: "", service: "", value: "" });
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <form onSubmit={submit} className="relative w-full lg:w-auto lg:min-w-[440px] max-w-2xl border-t lg:border rounded-t-2xl lg:rounded-none p-6 pb-10 lg:pb-6 space-y-4"
        style={{ background: COLORS.paper, borderColor: COLORS.ink, paddingBottom: "calc(2.5rem + env(safe-area-inset-bottom))" }}>
        <div className="mx-auto mb-2 h-1.5 w-12 rounded-full lg:hidden" style={{ background: COLORS.paperDeep }} />
        <p style={{ fontFamily: "'Source Serif 4', serif" }} className="text-lg font-semibold">Add appointment</p>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-xs mb-1" style={{ color: COLORS.slate }}>Time</label>
            <input type="time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} className="w-full text-base px-3 py-3 border" style={{ borderColor: COLORS.ink, background: COLORS.paper, minHeight: 48 }} /></div>
          <div><label className="block text-xs mb-1" style={{ color: COLORS.slate }}>Client</label>
            <input value={draft.clientName} onChange={(e) => setDraft({ ...draft, clientName: e.target.value })} className="w-full text-base px-3 py-3 border" style={{ borderColor: COLORS.ink, background: COLORS.paper, minHeight: 48 }} /></div>
          <div><label className="block text-xs mb-1" style={{ color: COLORS.slate }}>Service</label>
            <input value={draft.service} onChange={(e) => setDraft({ ...draft, service: e.target.value })} className="w-full text-base px-3 py-3 border" style={{ borderColor: COLORS.ink, background: COLORS.paper, minHeight: 48 }} /></div>
          <div><label className="block text-xs mb-1" style={{ color: COLORS.slate }}>Value ($)</label>
            <input type="number" value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} className="w-full text-base px-3 py-3 border" style={{ borderColor: COLORS.ink, background: COLORS.paper, minHeight: 48 }} /></div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 lg:flex-none lg:px-6 py-3.5 text-sm border" style={{ borderColor: COLORS.ink, minHeight: 48 }}>Cancel</button>
          <button type="submit" className="flex-1 lg:flex-none lg:px-6 py-3.5 text-sm text-white" style={{ background: COLORS.moss, minHeight: 48 }}>Save appointment</button>
        </div>
      </form>
    </div>
  );
}

export default function Dashboard() {
  const { token, user, business, logout } = useAuth();
  const canSeeMoney = user?.role === "OWNER" || !!user?.canViewFinancials;

  const [schedule, setSchedule] = useState([]);
  const [stats, setStats] = useState({ booked: 0, lost: 0, net: 0, total: 0, rate: 0, noshowCount: 0, cancelledCount: 0 });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const date = todayISO();

  const loadAll = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const calls = [apiFetch(`/appointments?date=${date}`, { token })];
      if (canSeeMoney) {
        calls.push(apiFetch(`/appointments/stats?date=${date}`, { token }));
        calls.push(apiFetch(`/no-shows/history?days=7`, { token }));
      }
      const [appts, statsData, historyData] = await Promise.all(calls);
      setSchedule(appts);
      if (statsData) setStats(statsData);
      if (historyData) setHistory(historyData);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, date, canSeeMoney]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const addAppointment = async (draft) => {
    try {
      const startTime = new Date(`${date}T${draft.time}:00`).toISOString();
      const endTime = new Date(new Date(startTime).getTime() + 45 * 60000).toISOString();
      const created = await apiFetch("/appointments", { method: "POST", token, body: { clientName: draft.clientName, service: draft.service, startTime, endTime, value: Number(draft.value) } });
      setSchedule((prev) => [...prev, created].sort((a, b) => a.startTime.localeCompare(b.startTime)));
      setSheetOpen(false);
      if (canSeeMoney) apiFetch(`/appointments/stats?date=${date}`, { token }).then(setStats).catch(() => {});
    } catch (err) {
      setApiError(err.message);
    }
  };

  const setStatus = async (id, status) => {
    const prev = schedule;
    setSchedule((p) => p.map((r) => (r.id === id ? { ...r, status } : r)));
    try {
      await apiFetch(`/appointments/${id}/status`, { method: "PATCH", token, body: { status } });
      if (canSeeMoney) setStats(await apiFetch(`/appointments/stats?date=${date}`, { token }));
    } catch (err) {
      setSchedule(prev);
      setApiError(err.message);
    }
  };

  const removeRow = async (id) => {
    const prev = schedule;
    setSchedule((p) => p.filter((r) => r.id !== id));
    try {
      await apiFetch(`/appointments/${id}`, { method: "DELETE", token });
      if (canSeeMoney) setStats(await apiFetch(`/appointments/stats?date=${date}`, { token }));
    } catch (err) {
      setSchedule(prev);
      setApiError(err.message);
    }
  };

  const visibleSchedule = filter === "all" ? schedule : schedule.filter((r) => r.status === filter);

  return (
    <div style={{ color: COLORS.ink, background: COLORS.paper }} className="min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 lg:px-12 py-4 border-b sticky top-0 z-30" style={{ borderColor: COLORS.paperDeep, background: COLORS.paper }}>
        <div className="flex items-center gap-3 lg:gap-4">
          <span style={{ fontFamily: "'Source Serif 4', serif" }} className="text-lg lg:text-xl font-semibold">Tallybook</span>
          <span className="hidden sm:inline text-sm" style={{ color: COLORS.slate }}>{business?.name}</span>
        </div>
        <nav className="flex items-center gap-2 lg:gap-4 text-sm" style={{ color: COLORS.slate }}>
          <span className="hidden sm:inline">{user?.name}</span>
          {(user?.role === "OWNER" || user?.canManageStaff) && (
            <Link to="/staff" className="flex items-center gap-1 px-2.5 py-2 border" style={{ borderColor: COLORS.ink, color: COLORS.ink }}><Users size={13} /> <span className="hidden sm:inline">Staff</span></Link>
          )}
          {(user?.role === "OWNER" || user?.canManageBilling) && (
            <Link to="/billing" className="flex items-center gap-1 px-2.5 py-2 border" style={{ borderColor: COLORS.ink, color: COLORS.ink }}><CreditCard size={13} /> <span className="hidden sm:inline">Billing</span></Link>
          )}
          <button onClick={() => setSheetOpen(true)} className="hidden lg:flex items-center gap-1 px-3 py-2 text-sm text-white" style={{ background: COLORS.moss }}><Plus size={14} /> Add appointment</button>
          <button onClick={logout} className="flex items-center gap-1 px-2.5 py-2 border" style={{ borderColor: COLORS.ink, color: COLORS.ink }}><LogOut size={13} /> <span className="hidden sm:inline">Log out</span></button>
        </nav>
      </div>

      {apiError && <div className="mx-4 sm:mx-6 lg:mx-12 mt-4 px-4 py-3 text-sm text-white" style={{ background: COLORS.rust }}>{apiError}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-24" style={{ color: COLORS.slate }}><Loader2 size={18} className="animate-spin mr-2" /> Loading today's schedule&hellip;</div>
      ) : (
        <div className="px-4 sm:px-6 lg:px-12 py-5 lg:py-8 max-w-7xl mx-auto pb-28 lg:pb-10">
          {canSeeMoney && stats.rate >= 20 && (
            <div className="mb-5 px-4 py-3 flex items-center gap-3 text-sm text-white" style={{ background: COLORS.rust }}>
              <AlertTriangle size={16} /> {stats.rate}% of today's bookings lost to no-shows or cancellations &mdash; {money(stats.lost)} off the schedule.
            </div>
          )}

          {canSeeMoney && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px mb-6 lg:mb-8" style={{ background: COLORS.ink }}>
              {[
                { label: "Net revenue today", value: money(stats.net), color: COLORS.ink, icon: DollarSign },
                { label: "Lost to no-shows/cancels", value: money(-stats.lost), color: COLORS.rust, icon: TrendingDown },
                { label: "No-show + cancel rate", value: `${stats.rate}%`, color: stats.rate >= 20 ? COLORS.rust : COLORS.ink, icon: AlertTriangle },
                { label: "Appointments today", value: stats.total, color: COLORS.ink, icon: Calendar },
              ].map((s, i) => (
                <div key={i} className="p-3.5 sm:p-5" style={{ background: COLORS.paper }}>
                  <div className="flex items-center gap-1.5 mb-1.5 text-[11px] sm:text-xs" style={{ color: COLORS.slate }}><s.icon size={13} /> {s.label}</div>
                  <p style={{ fontFamily: "'Source Serif 4', serif", color: s.color }} className="text-xl sm:text-2xl lg:text-3xl font-semibold">{s.value}</p>
                </div>
              ))}
            </div>
          )}

          <div className={`grid gap-6 lg:gap-10 ${canSeeMoney ? "md:grid-cols-3 lg:grid-cols-[1fr_360px]" : ""}`}>
            <div className={canSeeMoney ? "md:col-span-2 lg:col-span-1" : ""}>
              <h2 style={{ fontFamily: "'Source Serif 4', serif" }} className="text-lg sm:text-xl font-semibold mb-3">Today's schedule</h2>

              <div className="flex gap-2 mb-3 text-xs sm:text-sm overflow-x-auto pb-1">
                {["all", "BOOKED", "DONE", "NOSHOW", "CANCELLED"].map((f) => (
                  <button key={f} onClick={() => setFilter(f)} className="px-3 sm:px-4 py-2 sm:py-2.5 border whitespace-nowrap flex-shrink-0"
                    style={{ borderColor: COLORS.ink, background: filter === f ? COLORS.ink : "transparent", color: filter === f ? "white" : COLORS.ink, minHeight: 40 }}>
                    {f === "all" ? "All" : STATUS[f].label}
                  </button>
                ))}
              </div>

              <p className="text-xs mb-2 flex items-center gap-1 lg:hidden" style={{ color: COLORS.slate }}><ChevronDown size={12} className="rotate-90" /> Swipe a row left for quick actions</p>

              <div className="border overflow-hidden" style={{ borderColor: COLORS.ink }}>
                <div className="grid grid-cols-[52px_1fr_auto] lg:grid-cols-[64px_1fr_150px_auto] gap-2 px-3 sm:px-4 py-2 text-[11px] sm:text-xs uppercase tracking-wide" style={{ background: COLORS.ink, color: "white" }}>
                  <span>Time</span><span>Client / service</span><span className="hidden lg:block">Status</span><span className="text-right">Value</span>
                </div>
                {visibleSchedule.length === 0 && <div className="px-4 py-8 text-sm text-center" style={{ color: COLORS.slate }}>Nothing here yet.</div>}
                {visibleSchedule.map((row) => (
                  <ScheduleRow key={row.id} row={row} onSetStatus={setStatus} onDelete={removeRow} canSeeMoney={canSeeMoney} />
                ))}
                {canSeeMoney && (
                  <div className="flex items-center justify-between px-3 sm:px-4 py-3 text-sm sm:text-base border-t" style={{ borderColor: COLORS.ink, background: COLORS.paperDeep, fontWeight: 600 }}>
                    <span>Net revenue today</span><span style={{ fontFamily: "'Source Serif 4', serif" }}>{money(stats.net)}</span>
                  </div>
                )}
              </div>
            </div>

            {canSeeMoney && (
              <div>
                <h2 style={{ fontFamily: "'Source Serif 4', serif" }} className="text-lg sm:text-xl font-semibold mb-3">No-show tracking</h2>
                <div className="border p-4 sm:p-5 mb-5" style={{ borderColor: COLORS.ink }}>
                  <p className="text-xs mb-3" style={{ color: COLORS.slate }}>Loss rate, last 7 days</p>
                  <div style={{ width: "100%", height: 140 }}>
                    <ResponsiveContainer>
                      <BarChart data={history} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke={COLORS.paperDeep} />
                        <XAxis dataKey="day" tick={{ fontSize: 11, fill: COLORS.slate }} axisLine={{ stroke: COLORS.paperDeep }} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: COLORS.slate }} axisLine={false} tickLine={false} width={28} />
                        <Tooltip contentStyle={{ fontSize: 12, borderColor: COLORS.ink, borderRadius: 0 }} formatter={(v) => [`${v}%`, "Loss rate"]} />
                        <Bar dataKey="rate">{history.map((d, i) => <Cell key={i} fill={d.rate >= 20 ? COLORS.rust : COLORS.moss} />)}</Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="border p-4 sm:p-5" style={{ borderColor: COLORS.ink }}>
                  <div className="flex items-center gap-2 mb-3"><Landmark size={14} style={{ color: COLORS.brass }} /><p className="text-sm font-medium">Today</p></div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span style={{ color: COLORS.slate }}>No-shows</span><span>{stats.noshowCount}</span></div>
                    <div className="flex justify-between"><span style={{ color: COLORS.slate }}>Cancellations</span><span>{stats.cancelledCount}</span></div>
                    <div className="h-px my-2" style={{ background: COLORS.paperDeep }} />
                    <div className="flex justify-between font-medium"><span>Revenue at risk</span><span style={{ color: COLORS.rust }}>{money(-stats.lost)}</span></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <button onClick={() => setSheetOpen(true)} className="lg:hidden fixed z-40 flex items-center justify-center rounded-full shadow-lg"
        style={{ right: "max(1.25rem, env(safe-area-inset-right))", bottom: "max(1.25rem, env(safe-area-inset-bottom))", width: 56, height: 56, background: COLORS.moss, color: "white" }}
        aria-label="Add appointment">
        <Plus size={24} />
      </button>

      <AddAppointmentSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onSubmit={addAppointment} />
    </div>
  );
}
