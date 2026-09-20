import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, Loader2, ShieldCheck, Copy, Check, ArrowLeft } from "lucide-react";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const COLORS = {
  ink: "#1C2B22", paper: "#F3F1EC", paperDeep: "#EBE7DD",
  moss: "#2F5233", brass: "#B8923F", rust: "#B4472A", slate: "#5C6660",
};

const PERMISSION_LABELS = {
  canViewFinancials: "View revenue & no-show $ figures",
  canManageBilling: "Manage subscription & billing",
  canManageStaff: "Add, edit, or remove teammates",
  canManageSchedule: "Add, edit, or delete appointments",
};

const ROLE_DEFAULTS = {
  MANAGER: { canViewFinancials: true, canManageBilling: false, canManageStaff: true, canManageSchedule: true },
  STAFF: { canViewFinancials: false, canManageBilling: false, canManageStaff: false, canManageSchedule: true },
};

function PermissionToggle({ label, checked, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center justify-between w-full text-sm py-2.5 px-3 border"
      style={{ borderColor: COLORS.paperDeep, background: checked ? COLORS.paperDeep : "transparent" }}>
      <span>{label}</span>
      <span className="flex items-center justify-center" style={{ width: 20, height: 20, border: `1px solid ${COLORS.ink}`, background: checked ? COLORS.moss : "transparent" }}>
        {checked && <Check size={13} color="white" />}
      </span>
    </button>
  );
}

function AddTeammateForm({ token, onAdded, onClose }) {
  const [form, setForm] = useState({ name: "", email: "", role: "STAFF" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch("/staff", { method: "POST", token, body: form });
      setResult(data);
      onAdded(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="border p-5" style={{ borderColor: COLORS.moss, background: COLORS.paperDeep }}>
        <p className="text-sm font-medium mb-2">{result.user.name} was added as {result.user.role.toLowerCase()}.</p>
        <p className="text-xs mb-3" style={{ color: COLORS.slate }}>Share this one-time temporary password with them — it won't be shown again.</p>
        <div className="flex items-center gap-2 mb-4">
          <code className="text-sm px-3 py-2 border flex-1" style={{ borderColor: COLORS.ink, background: COLORS.paper }}>{result.tempPassword}</code>
          <button onClick={() => { navigator.clipboard?.writeText(result.tempPassword); setCopied(true); }} className="p-2 border" style={{ borderColor: COLORS.ink }}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
        <button onClick={onClose} className="text-sm px-4 py-2 text-white" style={{ background: COLORS.ink }}>Done</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="border p-5 space-y-4" style={{ borderColor: COLORS.ink, background: COLORS.paperDeep }}>
      <div className="grid sm:grid-cols-2 gap-4">
        <div><label className="block text-xs mb-1" style={{ color: COLORS.slate }}>Name</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full text-sm px-3 py-2 border" style={{ borderColor: COLORS.ink, background: COLORS.paper }} /></div>
        <div><label className="block text-xs mb-1" style={{ color: COLORS.slate }}>Email</label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="w-full text-sm px-3 py-2 border" style={{ borderColor: COLORS.ink, background: COLORS.paper }} /></div>
      </div>
      <div>
        <label className="block text-xs mb-1" style={{ color: COLORS.slate }}>Role</label>
        <div className="flex gap-2">
          {["STAFF", "MANAGER"].map((r) => (
            <button key={r} type="button" onClick={() => setForm({ ...form, role: r })} className="text-sm px-4 py-2 border"
              style={{ borderColor: COLORS.ink, background: form.role === r ? COLORS.ink : "transparent", color: form.role === r ? "white" : COLORS.ink }}>
              {r === "STAFF" ? "Staff" : "Manager"}
            </button>
          ))}
        </div>
      </div>
      {error && <div className="text-xs px-3 py-2 text-white" style={{ background: COLORS.rust }}>{error}</div>}
      <div className="flex gap-3">
        <button type="button" onClick={onClose} className="text-sm px-4 py-2 border" style={{ borderColor: COLORS.ink }}>Cancel</button>
        <button type="submit" disabled={loading} className="text-sm px-4 py-2 text-white flex items-center gap-2" style={{ background: COLORS.moss }}>
          {loading && <Loader2 size={14} className="animate-spin" />} Add teammate
        </button>
      </div>
    </form>
  );
}

function StaffRow({ member, token, currentUserId, onUpdated, onRemoved }) {
  const [expanded, setExpanded] = useState(false);
  const [flags, setFlags] = useState(member);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const isOwner = member.role === "OWNER";
  const isSelf = member.id === currentUserId;

  const savePermission = async (key, value) => {
    const prev = flags;
    setFlags((f) => ({ ...f, [key]: value }));
    setSaving(true);
    try {
      const updated = await apiFetch(`/staff/${member.id}`, { method: "PATCH", token, body: { [key]: value } });
      setFlags(updated);
      onUpdated(updated);
    } catch (err) {
      setFlags(prev);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const changeRole = async (role) => {
    setSaving(true);
    try {
      const updated = await apiFetch(`/staff/${member.id}`, { method: "PATCH", token, body: { role, ...ROLE_DEFAULTS[role] } });
      setFlags(updated);
      onUpdated(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    try {
      await apiFetch(`/staff/${member.id}`, { method: "DELETE", token });
      onRemoved(member.id);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="border-t" style={{ borderColor: COLORS.paperDeep }}>
      <button onClick={() => !isOwner && setExpanded((v) => !v)} className="w-full flex items-center justify-between px-4 py-3 text-left" style={{ cursor: isOwner ? "default" : "pointer" }}>
        <div>
          <p className="text-sm font-medium">{member.name} {isSelf && <span style={{ color: COLORS.slate }}>(you)</span>}</p>
          <p className="text-xs" style={{ color: COLORS.slate }}>{member.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs px-2 py-1" style={{ background: isOwner ? COLORS.ink : COLORS.paperDeep, color: isOwner ? "white" : COLORS.ink }}>{member.role}</span>
          {!isOwner && !isSelf && <span onClick={(e) => { e.stopPropagation(); remove(); }} className="p-1.5" style={{ color: COLORS.rust }}><Trash2 size={14} /></span>}
        </div>
      </button>
      {expanded && !isOwner && (
        <div className="px-4 pb-4 space-y-3">
          <div className="flex gap-2">
            {["STAFF", "MANAGER"].map((r) => (
              <button key={r} onClick={() => changeRole(r)} className="text-xs px-3 py-1.5 border"
                style={{ borderColor: COLORS.ink, background: flags.role === r ? COLORS.ink : "transparent", color: flags.role === r ? "white" : COLORS.ink }}>
                {r === "STAFF" ? "Staff" : "Manager"}
              </button>
            ))}
            {saving && <Loader2 size={14} className="animate-spin self-center" style={{ color: COLORS.slate }} />}
          </div>
          <div className="space-y-1.5">
            {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
              <PermissionToggle key={key} label={label} checked={!!flags[key]} onChange={(v) => savePermission(key, v)} />
            ))}
          </div>
          {error && <div className="text-xs px-3 py-2 text-white" style={{ background: COLORS.rust }}>{error}</div>}
        </div>
      )}
    </div>
  );
}

export default function StaffManagement() {
  const { token, user } = useAuth();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStaff(await apiFetch("/staff", { token }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ color: COLORS.ink, background: COLORS.paper }} className="min-h-screen">
      <div className="px-4 sm:px-6 lg:px-12 py-5 border-b flex items-center justify-between" style={{ borderColor: COLORS.paperDeep }}>
        <Link to="/dashboard" className="flex items-center gap-2 text-sm" style={{ color: COLORS.ink }}><ArrowLeft size={16} /> Dashboard</Link>
        <span className="text-xs flex items-center gap-1" style={{ color: COLORS.slate }}><ShieldCheck size={13} /> Staff & permissions</span>
      </div>

      <div className="px-4 sm:px-6 lg:px-12 py-8 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <h1 style={{ fontFamily: "'Source Serif 4', serif" }} className="text-2xl font-semibold">Team</h1>
          <button onClick={() => setShowAdd((v) => !v)} className="text-sm px-4 py-2 flex items-center gap-1 text-white" style={{ background: COLORS.moss }}><Plus size={14} /> Add teammate</button>
        </div>
        <p className="text-sm mb-6" style={{ color: COLORS.slate }}>Control who can see revenue figures, manage billing, or add other teammates.</p>

        {showAdd && <div className="mb-6"><AddTeammateForm token={token} onAdded={() => load()} onClose={() => setShowAdd(false)} /></div>}
        {error && <div className="mb-4 px-4 py-3 text-sm text-white" style={{ background: COLORS.rust }}>{error}</div>}

        {loading ? (
          <div className="flex items-center justify-center py-16" style={{ color: COLORS.slate }}><Loader2 size={18} className="animate-spin mr-2" /> Loading team&hellip;</div>
        ) : (
          <div className="border" style={{ borderColor: COLORS.ink }}>
            {staff.length === 0 && <div className="px-4 py-8 text-sm text-center" style={{ color: COLORS.slate }}>No team members yet.</div>}
            {staff.map((member) => (
              <StaffRow key={member.id} member={member} token={token} currentUserId={user?.id}
                onUpdated={(u) => setStaff((prev) => prev.map((m) => (m.id === u.id ? u : m)))}
                onRemoved={(id) => setStaff((prev) => prev.filter((m) => m.id !== id))} />
            ))}
          </div>
        )}
        <p className="text-xs mt-4" style={{ color: COLORS.slate }}>New teammates get a one-time temporary password shown right after they're added.</p>
      </div>
    </div>
  );
}
