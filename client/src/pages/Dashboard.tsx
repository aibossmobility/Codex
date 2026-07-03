import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "wouter";
import { SiteLogo } from "@/components/SiteLogo";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  BookOpen,
  Play,
  Pencil,
  TrendingUp,
  Heart,
  MessageSquare,
  Trash2,
  Download,
  RefreshCw,
  CheckCircle2,
  Clock,
  X,
  Mail,
  Phone,
  MapPin,
  Globe,
  Building2,
  UserPlus,
  StickyNote,
  ChevronRight,
  Send,
  LogOut,
  Plus,
  ExternalLink,
  FileText,
  GraduationCap,
  BookMarked,
  ListTodo,
  Calendar,
  Video,
  UserCheck,
  KeyRound,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Upload,
  FileStack,
  Settings,
  Shield,
  Megaphone,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import SmsCampaigns from "./SmsCampaigns";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Lead {
  id: number;
  invited_by: string;
  first_name: string;
  last_name: string;
  mobile_phone: string;
  business_email: string;
  business_name: string;
  website: string;
  street_address: string;
  address2: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  consent_transactional: number;
  consent_marketing: number;
  checkout_status: string;
  status: string;
  created_at: string;
}

interface Note {
  id: number;
  lead_id: number;
  body: string;
  created_at: string;
}

interface Task {
  id: number;
  lead_id: number;
  title: string;
  due_date: string | null;
  completed: number;
  created_at: string;
}

interface Member {
  id: number;
  lead_id: number | null;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  payment_status: string;
  trial_expires_at: string | null;
  paid_at: string | null;
  enrolled_at: string | null;
  created_at: string;
}

interface PaymentEvent {
  id: number;
  member_id: number | null;
  provider: string;
  transaction_id: string | null;
  email: string | null;
  amount_cents: number | null;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  payment_status: string | null;
}

interface Course {
  id: number;
  title: string;
  description: string | null;
  pillar: string;
  sort_order: number;
  lesson_count: number;
  created_at: string;
}

interface Lesson {
  id: number;
  course_id: number;
  title: string;
  description: string | null;
  content_url: string | null;
  content_type: string;
  sort_order: number;
  duration_minutes: number | null;
  created_at: string;
}

interface JournalPrompt {
  id: number;
  pillar: string;
  prompt_text: string;
  sort_order: number;
}

interface Stats {
  total: number;
  checkedOut: number;
  deliveryRate: number;
  byDay: { day: string; count: number }[];
  byConsent: { transactional: number; marketing: number };
  traffic?: {
    total: number;
    byDoorway: { doorway: string; count: number }[];
    bySource: { source: string; count: number }[];
    recent: {
      doorway: string;
      destination: string;
      source: string | null;
      campaign: string | null;
      referrer: string | null;
      created_at: string;
    }[];
  };
}

interface Resource {
  id: number;
  title: string;
  description: string | null;
  url: string;
  category: string;
  sort_order: number;
  created_at: string;
}

interface PapaAiInteraction {
  id: number;
  session_id: string;
  mode: string;
  first_name: string | null;
  email: string | null;
  phone: string | null;
  source_page: string | null;
  user_message: string | null;
  assistant_reply: string | null;
  conversation_summary: string | null;
  provider: string;
  assessment_result_json: string | null;
  report_json: string | null;
  recommended_resources_json: string | null;
  created_at: string;
}

interface NotificationEvent {
  id: number;
  event_type: string;
  provider: string | null;
  recipient: string | null;
  subject: string;
  status: "sent" | "skipped" | "error";
  response_status: number | null;
  error: string | null;
  created_at: string;
}

// ─── Agent Cards Data ────────────────────────────────────────────────────────

const agents = [
  {
    name: "The Purpose Voice",
    pillar: "Purpose",
    description: "Knowing why you lead, not just what you do",
    icon: Pencil,
    color: "#f59e0b",
    border: "border-l-primary",
  },
  {
    name: "The Alignment Guide",
    pillar: "Alignment",
    description: "Integrating faith, family, and business into one coherent life",
    icon: MessageSquare,
    color: "#3b82f6",
    border: "border-l-blue-400",
  },
  {
    name: "The Authority Architect",
    pillar: "Authority",
    description: "Leading with grace-based assertiveness, not aggression or passivity",
    icon: TrendingUp,
    color: "#22c55e",
    border: "border-l-green-400",
  },
  {
    name: "The Presence Designer",
    pillar: "Presence",
    description: "Being intentionally present, not just physically there",
    icon: Heart,
    color: "#f97316",
    border: "border-l-accent",
  },
];

// ─── Client Detail Panel ─────────────────────────────────────────────────────

const PIPELINE_STAGES = ["New", "Contacted", "Qualified", "Enrolled", "Active", "Alumni"];

const stageBadge: Record<string, string> = {
  New: "bg-white/10 text-gray-400",
  Contacted: "bg-brand-yellow/10 text-brand-yellow",
  Qualified: "bg-primary/10 text-primary",
  Enrolled: "bg-primary/10 text-primary",
  Active: "bg-primary/10 text-primary",
  Alumni: "bg-accent/10 text-accent",
};

function ClientPanel({
  lead,
  onClose,
  onDelete,
  onStatusChange,
}: {
  lead: Lead;
  onClose: () => void;
  onDelete: (id: number) => void;
  onStatusChange: (id: number, status: string) => void;
}) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [savingTask, setSavingTask] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(lead.status || "New");

  const fetchNotes = async () => {
    const res = await fetch(`/api/leads/${lead.id}/notes`);
    setNotes(await res.json());
  };

  const fetchTasks = async () => {
    const res = await fetch(`/api/leads/${lead.id}/tasks`);
    setTasks(await res.json());
  };

  useEffect(() => {
    fetchNotes();
    fetchTasks();
  }, [lead.id]);

  const updateStatus = async (status: string) => {
    setCurrentStatus(status);
    await fetch(`/api/leads/${lead.id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    onStatusChange(lead.id, status);
  };

  const addTask = async () => {
    if (!taskTitle.trim()) return;
    setSavingTask(true);
    await fetch(`/api/leads/${lead.id}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: taskTitle, due_date: taskDue || null }),
    });
    setTaskTitle("");
    setTaskDue("");
    await fetchTasks();
    setSavingTask(false);
  };

  const toggleTask = async (task: Task) => {
    await fetch(`/api/tasks/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !task.completed }),
    });
    fetchTasks();
  };

  const deleteTask = async (taskId: number) => {
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    fetchTasks();
  };

  const addNote = async () => {
    if (!noteText.trim()) return;
    setSaving(true);
    await fetch(`/api/leads/${lead.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: noteText }),
    });
    setNoteText("");
    await fetchNotes();
    setSaving(false);
  };

  const deleteNote = async (noteId: number) => {
    await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
    fetchNotes();
  };

  const address = [
    lead.street_address,
    lead.address2,
    lead.city,
    lead.state,
    lead.postal_code,
    lead.country,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-xl bg-[#0d0d0d] border-l border-white/10 h-full overflow-y-auto animate-in slide-in-from-right duration-300 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-[#0d0d0d] border-b border-white/10 px-6 py-5 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
              {lead.first_name[0]}{lead.last_name[0]}
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">
                {lead.first_name} {lead.last_name}
              </h2>
              <p className="text-gray-500 text-xs">{lead.business_email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 px-6 py-6 space-y-6">
          {/* Status + Date */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={currentStatus}
              onChange={(e) => updateStatus(e.target.value)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium border-0 focus:outline-none cursor-pointer ${stageBadge[currentStatus] || "bg-white/10 text-gray-400"}`}
              style={{ background: "transparent" }}
            >
              {PIPELINE_STAGES.map((s) => (
                <option key={s} value={s} className="bg-[#1a1a1a] text-white">{s}</option>
              ))}
            </select>
            <span className="inline-flex items-center gap-1.5 text-xs bg-white/5 text-gray-400 px-3 py-1.5 rounded-full">
              <Clock className="w-3.5 h-3.5" />
              {new Date(lead.created_at).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-3 font-semibold">
              Contact Information
            </h3>
            <div className="space-y-2.5">
              <DetailRow icon={Mail} label="Email" value={lead.business_email} />
              <DetailRow icon={Phone} label="Phone" value={lead.mobile_phone} />
              {address && <DetailRow icon={MapPin} label="Address" value={address} />}
              {lead.website && (
                <DetailRow
                  icon={Globe}
                  label="Website"
                  value={lead.website}
                  link={lead.website}
                />
              )}
            </div>
          </div>

          {/* Business Info */}
          {(lead.business_name || lead.invited_by) && (
            <div>
              <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-3 font-semibold">
                Business Information
              </h3>
              <div className="space-y-2.5">
                {lead.business_name && (
                  <DetailRow icon={Building2} label="Business" value={lead.business_name} />
                )}
                {lead.invited_by && (
                  <DetailRow icon={UserPlus} label="Invited By" value={lead.invited_by} />
                )}
              </div>
            </div>
          )}

          {/* Consent */}
          <div>
            <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-3 font-semibold">
              Consent
            </h3>
            <div className="space-y-2">
              <ConsentRow
                label="Transactional Messages"
                granted={!!lead.consent_transactional}
              />
              <ConsentRow
                label="Marketing & Promotional"
                granted={!!lead.consent_marketing}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-3 font-semibold flex items-center gap-2">
              <StickyNote className="w-3.5 h-3.5" /> Notes & Services
            </h3>

            {/* Add Note */}
            <div className="space-y-2 mb-4">
              <Textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a note about this client, services they may need, follow-up actions..."
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 text-sm resize-none min-h-[90px] focus:border-primary/50"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addNote();
                }}
              />
              <Button
                onClick={addNote}
                disabled={saving || !noteText.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm w-full"
              >
                <Send className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Add Note"}
              </Button>
            </div>

            {/* Notes List */}
            {notes.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-4">
                No notes yet. Add one above.
              </p>
            ) : (
              <div className="space-y-3">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="bg-white/5 rounded-xl px-4 py-3 border border-white/10 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-gray-300 text-sm leading-relaxed flex-1">
                        {note.body}
                      </p>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-gray-600 text-[10px] mt-2">
                      {new Date(note.created_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tasks */}
          <div>
            <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-3 font-semibold flex items-center gap-2">
              <ListTodo className="w-3.5 h-3.5" /> Follow-up Tasks
            </h3>
            <div className="space-y-2 mb-3">
              <input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Add a follow-up task..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50"
                onKeyDown={(e) => { if (e.key === "Enter") addTask(); }}
              />
              <div className="flex gap-2">
                <input
                  type="date"
                  value={taskDue}
                  onChange={(e) => setTaskDue(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                />
                <Button
                  onClick={addTask}
                  disabled={savingTask || !taskTitle.trim()}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs px-4"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            {tasks.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-3">No tasks yet.</p>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2.5 group">
                    <button onClick={() => toggleTask(task)} className="shrink-0">
                      <CheckCircle2 className={`w-4 h-4 transition-colors ${task.completed ? "text-green-400" : "text-gray-600 hover:text-gray-400"}`} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${task.completed ? "line-through text-gray-600" : "text-gray-300"}`}>{task.title}</p>
                      {task.due_date && (
                        <p className="text-[10px] text-gray-600 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" /> Due {new Date(task.due_date + "T00:00:00").toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#0d0d0d] border-t border-white/10 px-6 py-4">
          <button
            onClick={() => {
              if (confirm("Delete this client record?")) {
                onDelete(lead.id);
                onClose();
              }
            }}
            className="w-full flex items-center justify-center gap-2 text-sm text-red-400 hover:text-red-300 py-2 rounded-lg hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Delete Client Record
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  link,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  link?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-gray-400" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary text-sm hover:underline break-all"
          >
            {value}
          </a>
        ) : (
          <p className="text-white text-sm break-all">{value}</p>
        )}
      </div>
    </div>
  );
}

function ConsentRow({ label, granted }: { label: string; granted: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5">
      <span className="text-gray-400 text-sm">{label}</span>
      {granted ? (
        <span className="text-xs bg-green-400/10 text-green-400 px-2.5 py-1 rounded-full font-medium">
          Granted
        </span>
      ) : (
        <span className="text-xs bg-white/5 text-gray-500 px-2.5 py-1 rounded-full">
          Not given
        </span>
      )}
    </div>
  );
}

// ─── Resources View ───────────────────────────────────────────────────────────

const CATEGORIES = ["General", "Purpose", "Authority", "Presence", "Alignment", "Faith", "Business", "Family"];

function Resources() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [activeDoc, setActiveDoc] = useState<Resource | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", url: "", category: "General" });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [filterCat, setFilterCat] = useState("All");

  const fetchResources = async () => {
    const res = await fetch("/api/resources");
    setResources(await res.json());
  };

  useEffect(() => { fetchResources(); }, []);

  const handleSave = async () => {
    if (!form.title.trim() || !form.url.trim()) return;
    setSaving(true);
    if (editId) {
      await fetch(`/api/resources/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    setForm({ title: "", description: "", url: "", category: "General" });
    setShowAdd(false);
    setEditId(null);
    await fetchResources();
    setSaving(false);
  };

  const handleEdit = (r: Resource) => {
    setForm({ title: r.title, description: r.description || "", url: r.url, category: r.category });
    setEditId(r.id);
    setShowAdd(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this resource?")) return;
    await fetch(`/api/resources/${id}`, { method: "DELETE" });
    if (activeDoc?.id === id) setActiveDoc(null);
    fetchResources();
  };

  // Build embed URL from various link types
  const getEmbedUrl = (url: string): string | null => {
    // Google Docs / Sheets / Slides
    if (url.includes("docs.google.com")) {
      const base = url.split("/edit")[0].split("/pub")[0].split("/view")[0];
      return `${base}/preview`;
    }
    // Google Drive file
    if (url.includes("drive.google.com/file/d/")) {
      const match = url.match(/\/d\/([^/]+)/);
      if (match) return `https://drive.google.com/file/d/${match[1]}/preview`;
    }
    // Direct PDF
    if (url.endsWith(".pdf") || url.includes(".pdf?")) return url;
    // YouTube
    if (url.includes("youtube.com/watch")) {
      const v = new URL(url).searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (url.includes("youtu.be/")) {
      const v = url.split("youtu.be/")[1]?.split("?")[0];
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    // Notion, Loom, generic
    return url;
  };

  const filtered = filterCat === "All" ? resources : resources.filter((r) => r.category === filterCat);
  const usedCats = ["All", ...Array.from(new Set(resources.map((r) => r.category)))];

  return (
    <div className="flex gap-6 h-[calc(100vh-4rem)]">
      {/* Left panel — doc list */}
      <div className="w-80 shrink-0 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Teaching Docs</h2>
            <p className="text-xs text-gray-500 mt-0.5">{resources.length} resource{resources.length !== 1 ? "s" : ""}</p>
          </div>
          <Button
            onClick={() => { setShowAdd(!showAdd); setEditId(null); setForm({ title: "", description: "", url: "", category: "General" }); }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs px-3 py-2"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Doc
          </Button>
        </div>

        {/* Add/Edit form */}
        {showAdd && (
          <div className="bg-[#111] border border-white/10 rounded-xl p-4 space-y-3">
            <h3 className="text-white text-sm font-semibold">{editId ? "Edit Resource" : "Add New Resource"}</h3>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Title *"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50"
            />
            <input
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="URL (Google Doc, PDF, YouTube...) *"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50"
            />
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Description (optional)"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50"
            />
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs">
                {saving ? "Saving..." : editId ? "Update" : "Save"}
              </Button>
              <Button variant="outline" onClick={() => { setShowAdd(false); setEditId(null); }} className="border-white/10 text-gray-400 hover:text-white text-xs">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Category filter */}
        <div className="flex gap-1.5 flex-wrap">
          {usedCats.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={`text-xs px-2.5 py-1 rounded-full transition-colors ${filterCat === cat ? "bg-primary text-primary-foreground font-bold" : "bg-white/5 text-gray-400 hover:text-white"}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Doc list */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {filtered.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-8">No resources yet. Add one above.</p>
          ) : (
            filtered.map((r) => (
              <div
                key={r.id}
                onClick={() => setActiveDoc(r)}
                className={`group relative rounded-xl border p-3 cursor-pointer transition-all ${activeDoc?.id === r.id ? "border-primary/50 bg-primary/5" : "border-white/10 bg-[#111] hover:border-white/20 hover:bg-white/5"}`}
              >
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-medium truncate">{r.title}</p>
                    {r.description && <p className="text-gray-500 text-xs truncate mt-0.5">{r.description}</p>}
                    <span className="text-[10px] bg-white/5 text-gray-500 px-1.5 py-0.5 rounded mt-1 inline-block">{r.category}</span>
                  </div>
                </div>
                {/* Actions */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); handleEdit(r); }} className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-white">
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }} className="p-1 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right panel — embed viewer */}
      <div className="flex-1 bg-[#111] border border-white/10 rounded-2xl overflow-hidden flex flex-col">
        {activeDoc ? (
          <>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
              <div className="min-w-0">
                <h3 className="text-white font-bold truncate">{activeDoc.title}</h3>
                {activeDoc.description && <p className="text-gray-500 text-xs mt-0.5 truncate">{activeDoc.description}</p>}
              </div>
              <a href={activeDoc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/90 shrink-0 ml-4">
                <ExternalLink className="w-3.5 h-3.5" /> Open Original
              </a>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-black/20">
              <BookOpen className="w-12 h-12 text-gray-700 mb-4" />
              <p className="text-white font-semibold mb-2">{activeDoc.title}</p>
              <p className="text-gray-500 text-sm mb-5 max-w-md">Open the original document or video in a new tab.</p>
              <a href={activeDoc.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90">
                <ExternalLink className="w-4 h-4" /> Open Original
              </a>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <BookOpen className="w-12 h-12 text-gray-700 mb-4" />
            <p className="text-gray-500 font-medium">Select a document to view</p>
            <p className="text-gray-600 text-sm mt-1">
              Add Google Docs, PDFs, YouTube videos, or any embeddable URL
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

type View =
  | "command"
  | "crm"
  | "papa-ai"
  | "alerts"
  | "metrics"
  | "resources"
  | "members"
  | "curriculum"
  | "journal-prompts"
  | "sms"
  | "settings";

interface AdminUser {
  id: number;
  username: string;
  display_name: string;
  email: string;
  /** Brian-only Research Lab (server: RESEARCH_LAB_ADMIN_USERNAMES) */
  researchLabAccess?: boolean;
}

function Sidebar({
  view,
  setView,
  user,
  onLogout,
}: {
  view: View;
  setView: (v: View) => void;
  user: AdminUser | null;
  onLogout: () => void;
}) {
  const items: { id: View; label: string; Icon: typeof LayoutDashboard }[] = [
    { id: "command", label: "Command Center", Icon: LayoutDashboard },
    { id: "crm", label: "CRM", Icon: Users },
    { id: "papa-ai", label: "Papa AI", Icon: MessageSquare },
    { id: "alerts", label: "Alerts", Icon: Mail },
    { id: "sms", label: "SMS campaigns", Icon: Megaphone },
    { id: "members", label: "Members", Icon: UserCheck },
    { id: "curriculum", label: "Curriculum", Icon: GraduationCap },
    { id: "resources", label: "Teaching Docs", Icon: BookOpen },
    { id: "journal-prompts", label: "Journal Prompts", Icon: BookMarked },
    { id: "metrics", label: "System Metrics", Icon: BarChart3 },
    { id: "settings", label: "Settings", Icon: Settings },
  ];

  const initials = user?.display_name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() ?? "?";

  return (
    <aside className="w-56 min-h-screen bg-[#0d0d0d] border-r border-white/10 flex flex-col">
      <div className="px-3 py-4 border-b border-white/10 space-y-2">
        <div className="flex items-center gap-2">
          <SiteLogo size="sm" compact className="min-w-0 flex-1" />
          <span className="shrink-0 text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold">AI</span>
        </div>
        <p className="text-white font-bold text-sm tracking-tight">CRM</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              view === id
                ? "bg-white/10 text-white"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
        {user?.researchLabAccess ? (
          <Link
            href="/research-lab"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-primary/90 hover:text-primary/90 hover:bg-primary/10 transition-colors"
          >
            <FileStack className="w-4 h-4" />
            Research Lab
          </Link>
        ) : null}
      </nav>

      <div className="px-4 py-4 border-t border-white/10 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-semibold truncate">{user?.display_name ?? "—"}</p>
            <p className="text-gray-500 text-[10px] truncate">{user?.email ?? "—"}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </button>
      </div>
    </aside>
  );
}

// ─── Command Center ───────────────────────────────────────────────────────────

function CommandCenter({ stats }: { stats: Stats | null }) {
  const [runningAgent, setRunningAgent] = useState<string | null>(null);

  const handleActivate = (name: string) => {
    setRunningAgent(name);
    setTimeout(() => setRunningAgent(null), 3000);
  };

  return (
    <div className="space-y-8">
      <div className="relative rounded-2xl bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-white/10 p-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
        <div className="flex items-start justify-between">
          <div className="max-w-xl">
            <h1 className="text-3xl font-extrabold text-white leading-tight">
              Jamel, Stop Executing.{" "}
              <span className="text-primary">Start Architecting.</span>
            </h1>
            <p className="text-gray-400 mt-3 text-sm leading-relaxed">
              Your four-pillar AI team handles content, strategy, experience, and
              alignment — so you can focus on what matters: building your legacy as a
              father and entrepreneur.
            </p>
            <div className="flex gap-2 mt-4 flex-wrap">
              {["Purpose", "Authority", "Presence", "Alignment"].map((tag) => (
                <span key={tag} className="text-xs px-2.5 py-1 rounded-full border border-white/20 text-gray-300">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-5 py-2.5 rounded-lg shrink-0 ml-4">
            <Play className="w-4 h-4 mr-2" /> Run Daily Operations
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Operations Run", value: stats?.total ?? 0, color: "text-white" },
          { label: "Delivery Rate", value: `${stats?.deliveryRate ?? 0}%`, color: "text-green-400" },
          { label: "Avg Duration", value: "--", color: "text-white" },
          { label: "Agent Insights", value: 1, color: "text-primary" },
        ].map(({ label, value, color }) => (
          <Card key={label} className="bg-[#111] border-white/10">
            <CardContent className="p-5">
              <p className="text-xs text-gray-500 mb-2">{label}</p>
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {agents.map((agent) => {
          const Icon = agent.icon;
          const isRunning = runningAgent === agent.name;
          return (
            <Card key={agent.name} className={`bg-[#111] border-white/10 border-l-4 ${agent.border}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: agent.color + "22" }}>
                      <Icon className="w-4 h-4" style={{ color: agent.color }} />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-sm">{agent.name}</h3>
                      <p className="text-xs mt-0.5">
                        <span style={{ color: agent.color }} className="font-semibold">{agent.pillar}</span>{" "}
                        <span className="text-gray-500">— {agent.description}</span>
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-xs border-white/20 ${isRunning ? "text-primary border-primary/40" : "text-gray-400"}`}>
                    {isRunning ? "Running..." : "Ready"}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  className="w-full border-white/10 text-gray-300 hover:text-white hover:bg-white/10 text-sm"
                  onClick={() => handleActivate(agent.name)}
                  disabled={isRunning}
                >
                  {isRunning ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                  Activate {agent.name}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── CRM ─────────────────────────────────────────────────────────────────────

function CRM({
  leads,
  onDelete,
  onRefresh,
  onLeadsUpdate,
}: {
  leads: Lead[];
  onDelete: (id: number) => void;
  onRefresh: () => void;
  onLeadsUpdate: (updater: (prev: Lead[]) => Lead[]) => void;
}) {
  const [selected, setSelected] = useState<Lead | null>(null);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("All");

  const filtered = leads.filter((l) => {
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      `${l.first_name} ${l.last_name}`.toLowerCase().includes(q) ||
      l.business_email.toLowerCase().includes(q) ||
      (l.business_name || "").toLowerCase().includes(q) ||
      (l.city || "").toLowerCase().includes(q);
    const matchesStage = stageFilter === "All" || (l.status || "New") === stageFilter;
    return matchesSearch && matchesStage;
  });

  const exportCSV = () => {
    const headers = ["ID","First Name","Last Name","Email","Phone","Invited By","Business","Website","Street","City","State","Country","Postal","Consent Transact.","Consent Marketing","Checkout Status","Created At"];
    const rows = leads.map((l) => [l.id,l.first_name,l.last_name,l.business_email,l.mobile_phone,l.invited_by||"",l.business_name||"",l.website||"",l.street_address||"",l.city||"",l.state||"",l.country||"",l.postal_code||"",l.consent_transactional?"Yes":"No",l.consent_marketing?"Yes":"No",l.checkout_status,l.created_at]);
    const csv = [headers,...rows].map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `papalife-crm-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <>
      {selected && (
        <ClientPanel
          lead={selected}
          onClose={() => setSelected(null)}
          onDelete={(id) => { onDelete(id); onRefresh(); setSelected(null); }}
          onStatusChange={(id, status) => {
            onLeadsUpdate((prev) => prev.map((l) => l.id === id ? { ...l, status } : l));
            setSelected((prev) => prev?.id === id ? { ...prev, status } : prev);
          }}
        />
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">CRM</h2>
            <p className="text-sm text-gray-500 mt-1">
              {leads.length} client{leads.length !== 1 ? "s" : ""} — click any row to view details & notes
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="border-white/20 text-gray-300 hover:text-white hover:bg-white/10 text-sm" onClick={onRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
          </div>
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, business, city..."
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50"
        />

        {/* Stage filter */}
        <div className="flex gap-1.5 flex-wrap">
          {["All", ...PIPELINE_STAGES].map((s) => (
            <button
              key={s}
              onClick={() => setStageFilter(s)}
              className={`text-xs px-2.5 py-1 rounded-full transition-colors ${stageFilter === s ? "bg-primary text-primary-foreground font-bold" : "bg-white/5 text-gray-400 hover:text-white"}`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <Card className="bg-[#111] border-white/10">
            <CardContent className="py-16 text-center text-gray-500">
              {leads.length === 0
                ? "No clients yet. They'll appear here after the checkout form is submitted."
                : "No results match your search."}
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Client</th>
                  <th className="px-4 py-3 text-left">Contact</th>
                  <th className="px-4 py-3 text-left">Business</th>
                  <th className="px-4 py-3 text-left">Stage</th>
                  <th className="px-4 py-3 text-left">Joined</th>
                  <th className="px-4 py-3 text-left">Consents</th>
                  <th className="px-4 py-3 text-left"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => setSelected(lead)}
                    className="bg-[#0f0f0f] hover:bg-white/5 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                          {lead.first_name[0]}{lead.last_name[0]}
                        </div>
                        <div>
                          <p className="text-white font-medium">{lead.first_name} {lead.last_name}</p>
                          {lead.invited_by && (
                            <p className="text-gray-500 text-xs">via {lead.invited_by}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-300 text-xs">{lead.business_email}</p>
                      <p className="text-gray-500 text-xs">{lead.mobile_phone}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {lead.business_name || <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${stageBadge[lead.status || "New"] || "bg-white/10 text-gray-400"}`}>
                        {lead.status || "New"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {lead.consent_transactional ? (
                          <span className="text-[10px] bg-brand-yellow/10 text-brand-yellow px-1.5 py-0.5 rounded">Trans.</span>
                        ) : null}
                        {lead.consent_marketing ? (
                          <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded">Mktg.</span>
                        ) : null}
                        {!lead.consent_transactional && !lead.consent_marketing && (
                          <span className="text-gray-600 text-xs">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-primary transition-colors" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ─── System Metrics ───────────────────────────────────────────────────────────

function SystemMetrics({ stats }: { stats: Stats | null }) {
  if (!stats) return <div className="text-gray-500 text-center py-20">Loading metrics...</div>;

  const consentData = [
    { name: "Transactional", value: stats.byConsent?.transactional ?? 0, color: "#3b82f6" },
    { name: "Marketing", value: stats.byConsent?.marketing ?? 0, color: "#a855f7" },
    { name: "No Consent", value: Math.max(0, stats.total - Math.max(stats.byConsent?.transactional ?? 0, stats.byConsent?.marketing ?? 0)), color: "#374151" },
  ].filter((d) => d.value > 0);

  const chartData = [...(stats.byDay ?? [])].reverse().map((d) => ({
    day: d.day.slice(5),
    leads: d.count,
  }));
  const trafficTotal = stats.traffic?.total ?? 0;
  const stageClicks = stats.traffic?.byDoorway?.find((d) => d.doorway === "stage")?.count ?? 0;
  const emailClicks = stats.traffic?.byDoorway?.find((d) => d.doorway === "email-series")?.count ?? 0;
  const joinClicks = stats.traffic?.byDoorway?.find((d) => d.doorway === "join")?.count ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">System Metrics</h2>
        <p className="text-sm text-gray-500 mt-1">Lead pipeline analytics and consent data</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Clients", value: stats.total, color: "text-white" },
          { label: "Reached Checkout", value: stats.checkedOut, color: "text-green-400" },
          { label: "Conversion Rate", value: `${stats.deliveryRate}%`, color: "text-primary" },
          { label: "Doorway Clicks", value: trafficTotal, color: "text-brand-yellow" },
          { label: "Stage Tool Clicks", value: stageClicks, color: "text-primary" },
          { label: "Email Series Clicks", value: emailClicks, color: "text-accent" },
        ].map(({ label, value, color }) => (
          <Card key={label} className="bg-[#111] border-white/10">
            <CardContent className="p-5">
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className={`text-4xl font-bold ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-[#111] border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm font-semibold">Campaign Doorway Activity</CardTitle>
          <p className="text-xs text-gray-500">Anonymous clicks before a father gives an email or phone.</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: "Find Stage", value: stageClicks },
              { label: "Email Series", value: emailClicks },
              { label: "Join / Checkout", value: joinClicks },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
                <p className="text-xs text-gray-500">{item.label}</p>
                <p className="text-2xl font-bold text-white">{item.value}</p>
              </div>
            ))}
          </div>
          {stats.traffic?.recent?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs text-gray-500">
                    <th className="py-2 pr-4 font-medium">Time</th>
                    <th className="py-2 pr-4 font-medium">Doorway</th>
                    <th className="py-2 pr-4 font-medium">Source</th>
                    <th className="py-2 pr-4 font-medium">Campaign</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.traffic.recent.slice(0, 12).map((click, i) => (
                    <tr key={`${click.created_at}-${i}`} className="border-b border-white/5">
                      <td className="py-2 pr-4 text-gray-400">{new Date(click.created_at).toLocaleString()}</td>
                      <td className="py-2 pr-4 text-white">{click.doorway}</td>
                      <td className="py-2 pr-4 text-gray-300">{click.source || "unknown"}</td>
                      <td className="py-2 pr-4 text-gray-500">{click.campaign || "unknown"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-gray-600 text-sm text-center py-8">No doorway clicks logged yet</div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        <Card className="bg-[#111] border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm font-semibold">Leads Over Time (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="text-gray-600 text-sm text-center py-8">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData}>
                  <XAxis dataKey="day" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff" }} />
                  <Bar dataKey="leads" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[#111] border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm font-semibold">Consent Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {consentData.length === 0 ? (
              <div className="text-gray-600 text-sm text-center py-8">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={consentData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                    {consentData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff" }} />
                  <Legend formatter={(value) => <span style={{ color: "#9ca3af", fontSize: 12 }}>{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#111] border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm font-semibold">PAPA Framework Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {agents.map((agent) => (
              <div key={agent.pillar} className="text-center">
                <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-2" style={{ backgroundColor: agent.color + "22" }}>
                  <agent.icon className="w-5 h-5" style={{ color: agent.color }} />
                </div>
                <p className="text-white text-xs font-semibold">{agent.pillar}</p>
                <p className="text-gray-500 text-[10px] mt-0.5">Active</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Members View ─────────────────────────────────────────────────────────────

function Members() {
  const [members, setMembers] = useState<Member[]>([]);
  const [paymentEvents, setPaymentEvents] = useState<PaymentEvent[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", password: "" });
  const [saving, setSaving] = useState(false);
  const [resetId, setResetId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const fetchMembers = async () => {
    const res = await fetch("/api/members");
    setMembers(await res.json());
  };

  const fetchPaymentEvents = async () => {
    const res = await fetch("/api/admin/payment-events?limit=8", { credentials: "include" });
    const data = await res.json();
    if (res.ok && data.ok) setPaymentEvents(Array.isArray(data.events) ? data.events : []);
  };

  const refreshMembers = async () => {
    await Promise.all([fetchMembers(), fetchPaymentEvents()]);
  };

  useEffect(() => { void refreshMembers(); }, []);

  const handleCreate = async () => {
    if (!form.first_name.trim() || !form.email.trim() || !form.password.trim()) return;
    setSaving(true);
    await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ first_name: "", last_name: "", email: "", password: "" });
    setShowAdd(false);
    await refreshMembers();
    setSaving(false);
  };

  const toggleStatus = async (m: Member) => {
    const newStatus = m.status === "active" ? "inactive" : "active";
    await fetch(`/api/members/${m.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...m, status: newStatus }),
    });
    void refreshMembers();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this member account?")) return;
    await fetch(`/api/members/${id}`, { method: "DELETE" });
    void refreshMembers();
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim() || !resetId) return;
    await fetch(`/api/members/${resetId}/password`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    setResetId(null);
    setNewPassword("");
  };

  const markPaid = async (member: Member) => {
    if (!confirm(`Mark ${member.first_name} ${member.last_name} as paid?`)) return;
    await fetch(`/api/members/${member.id}/mark-paid`, { method: "PUT" });
    void refreshMembers();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Members</h2>
          <p className="text-sm text-gray-500 mt-1">{members.length} member account{members.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm">
          <Plus className="w-4 h-4 mr-2" /> Add Member
        </Button>
      </div>

      {showAdd && (
        <div className="bg-[#111] border border-white/10 rounded-xl p-5 space-y-3">
          <h3 className="text-white font-semibold text-sm">Create Member Account</h3>
          <div className="grid grid-cols-2 gap-3">
            <input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} placeholder="First name *" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50" />
            <input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} placeholder="Last name" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50" />
          </div>
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email *" type="email" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50" />
          <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password *" type="password" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50" />
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm">{saving ? "Creating..." : "Create"}</Button>
            <Button variant="outline" onClick={() => setShowAdd(false)} className="border-white/10 text-gray-400 hover:text-white text-sm">Cancel</Button>
          </div>
        </div>
      )}

      {resetId && (
        <div className="bg-[#111] border border-primary/30 rounded-xl p-4 space-y-3">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2"><KeyRound className="w-4 h-4 text-primary" /> Reset Password</h3>
          <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" type="password" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50" />
          <div className="flex gap-2">
            <Button onClick={handleResetPassword} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm">Update Password</Button>
            <Button variant="outline" onClick={() => { setResetId(null); setNewPassword(""); }} className="border-white/10 text-gray-400 hover:text-white text-sm">Cancel</Button>
          </div>
        </div>
      )}

      {paymentEvents.length > 0 && (
        <Card className="bg-[#111] border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm font-semibold">Recent Payment Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {paymentEvents.slice(0, 5).map((event) => {
              const memberName = [event.first_name, event.last_name].filter(Boolean).join(" ") || event.email || "Unknown member";
              return (
                <div key={event.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-black/25 px-3 py-2 text-xs">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{memberName}</p>
                    <p className="text-gray-500">
                      {event.provider}
                      {event.transaction_id ? ` · ${event.transaction_id}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-primary/10 text-primary">{event.payment_status || "paid"}</Badge>
                    <p className="mt-1 text-[10px] text-gray-600">{new Date(event.created_at).toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {members.length === 0 ? (
        <Card className="bg-[#111] border-white/10">
          <CardContent className="py-16 text-center text-gray-500">No member accounts yet. Add one above.</CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Member</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Payment</th>
                <th className="px-4 py-3 text-left">Enrolled</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {members.map((m) => (
                <tr key={m.id} className="bg-[#0f0f0f] hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-yellow/20 flex items-center justify-center text-brand-yellow font-bold text-sm shrink-0">
                        {m.first_name[0]}{m.last_name?.[0] || ""}
                      </div>
                      <p className="text-white font-medium">{m.first_name} {m.last_name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{m.email}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleStatus(m)} className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${m.status === "active" ? "bg-green-400/10 text-green-400 hover:bg-green-400/20" : "bg-white/5 text-gray-500 hover:bg-white/10"}`}>
                      {m.status === "active" ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <Badge className={m.payment_status === "paid" ? "bg-primary/10 text-primary" : "bg-brand-yellow/10 text-brand-yellow"}>
                        {m.payment_status || "unknown"}
                      </Badge>
                      {m.payment_status !== "paid" && (
                        <button
                          onClick={() => markPaid(m)}
                          className="block text-[11px] font-semibold text-brand-yellow hover:text-white"
                        >
                          Mark paid
                        </button>
                      )}
                      {m.trial_expires_at && (
                        <p className="text-[10px] text-gray-600">
                          Trial ends {new Date(m.trial_expires_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{m.enrolled_at ? new Date(m.enrolled_at).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => { setResetId(m.id); setNewPassword(""); }} className="p-1.5 rounded hover:bg-white/10 text-gray-500 hover:text-primary transition-colors">
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(m.id)} className="p-1.5 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Curriculum View ──────────────────────────────────────────────────────────

const PILLARS = ["General", "Purpose", "Authority", "Presence", "Alignment"];
const pillarColors: Record<string, string> = {
  Purpose: "text-primary bg-primary/10 border-primary/30",
  Authority: "text-green-400 bg-green-400/10 border-green-400/30",
  Presence: "text-accent bg-accent/10 border-accent/30",
  Alignment: "text-brand-yellow bg-brand-yellow/10 border-brand-yellow/30",
  General: "text-gray-400 bg-white/5 border-white/10",
};

function Curriculum() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Record<number, Lesson[]>>({});
  const [expandedCourse, setExpandedCourse] = useState<number | null>(null);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [courseForm, setCourseForm] = useState({ title: "", description: "", pillar: "General" });
  const [showAddLesson, setShowAddLesson] = useState<number | null>(null);
  const [lessonForm, setLessonForm] = useState({ title: "", description: "", content_url: "", content_type: "video", duration_minutes: "" });
  const [saving, setSaving] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [filterPillar, setFilterPillar] = useState("All");

  const uploadTrainingFile = async (file: File): Promise<{ url: string; content_type: string } | null> => {
    const fd = new FormData();
    fd.append("file", file);
    setUploadBusy(true);
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd, credentials: "include" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Upload failed");
      return { url: data.url as string, content_type: data.content_type as string };
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upload failed");
      return null;
    } finally {
      setUploadBusy(false);
    }
  };

  const handleReplaceLessonMedia = async (lesson: Lesson, courseId: number, file: File) => {
    const r = await uploadTrainingFile(file);
    if (!r) return;
    await fetch(`/api/lessons/${lesson.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: lesson.title,
        description: lesson.description,
        content_url: r.url,
        content_type: r.content_type,
        duration_minutes: lesson.duration_minutes,
        sort_order: lesson.sort_order,
      }),
    });
    await fetchLessons(courseId);
    await fetchCourses();
  };

  const fetchCourses = async () => {
    const res = await fetch("/api/courses");
    setCourses(await res.json());
  };

  const fetchLessons = async (courseId: number) => {
    const res = await fetch(`/api/courses/${courseId}/lessons`);
    const data = await res.json();
    setLessons((prev) => ({ ...prev, [courseId]: data }));
  };

  useEffect(() => { fetchCourses(); }, []);

  const toggleCourse = (id: number) => {
    if (expandedCourse === id) {
      setExpandedCourse(null);
    } else {
      setExpandedCourse(id);
      fetchLessons(id);
    }
  };

  const handleSaveCourse = async () => {
    if (!courseForm.title.trim()) return;
    setSaving(true);
    await fetch("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(courseForm),
    });
    setCourseForm({ title: "", description: "", pillar: "General" });
    setShowAddCourse(false);
    await fetchCourses();
    setSaving(false);
  };

  const handleDeleteCourse = async (id: number) => {
    if (!confirm("Delete this course and all its lessons?")) return;
    await fetch(`/api/courses/${id}`, { method: "DELETE" });
    if (expandedCourse === id) setExpandedCourse(null);
    fetchCourses();
  };

  const handleSaveLesson = async (courseId: number) => {
    if (!lessonForm.title.trim()) return;
    setSaving(true);
    await fetch(`/api/courses/${courseId}/lessons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...lessonForm, duration_minutes: lessonForm.duration_minutes ? parseInt(lessonForm.duration_minutes) : null }),
    });
    setLessonForm({ title: "", description: "", content_url: "", content_type: "video", duration_minutes: "" });
    setShowAddLesson(null);
    await fetchLessons(courseId);
    await fetchCourses();
    setSaving(false);
  };

  const handleDeleteLesson = async (lessonId: number, courseId: number) => {
    if (!confirm("Delete this lesson?")) return;
    await fetch(`/api/lessons/${lessonId}`, { method: "DELETE" });
    fetchLessons(courseId);
    fetchCourses();
  };

  const filtered = filterPillar === "All" ? courses : courses.filter((c) => c.pillar === filterPillar);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Curriculum</h2>
          <p className="text-sm text-gray-500 mt-1">{courses.length} course{courses.length !== 1 ? "s" : ""} across PAPA pillars</p>
        </div>
        <Button onClick={() => setShowAddCourse(!showAddCourse)} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm">
          <Plus className="w-4 h-4 mr-2" /> Add Course
        </Button>
      </div>

      {showAddCourse && (
        <div className="bg-[#111] border border-white/10 rounded-xl p-5 space-y-3">
          <h3 className="text-white font-semibold text-sm">New Course</h3>
          <input value={courseForm.title} onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })} placeholder="Course title *" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50" />
          <input value={courseForm.description} onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })} placeholder="Description (optional)" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50" />
          <select value={courseForm.pillar} onChange={(e) => setCourseForm({ ...courseForm, pillar: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50">
            {PILLARS.map((p) => <option key={p} value={p} className="bg-[#1a1a1a]">{p}</option>)}
          </select>
          <div className="flex gap-2">
            <Button onClick={handleSaveCourse} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm">{saving ? "Saving..." : "Save Course"}</Button>
            <Button variant="outline" onClick={() => setShowAddCourse(false)} className="border-white/10 text-gray-400 hover:text-white text-sm">Cancel</Button>
          </div>
        </div>
      )}

      {/* Pillar filter */}
      <div className="flex gap-1.5 flex-wrap">
        {["All", ...PILLARS].map((p) => (
          <button key={p} onClick={() => setFilterPillar(p)} className={`text-xs px-2.5 py-1 rounded-full transition-colors ${filterPillar === p ? "bg-primary text-primary-foreground font-bold" : "bg-white/5 text-gray-400 hover:text-white"}`}>{p}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="bg-[#111] border-white/10">
          <CardContent className="py-16 text-center text-gray-500">No courses yet. Add one above.</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((course) => (
            <div key={course.id} className="bg-[#111] border border-white/10 rounded-xl overflow-hidden">
              <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => toggleCourse(course.id)}>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${pillarColors[course.pillar] || pillarColors.General}`}>{course.pillar}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold">{course.title}</p>
                  {course.description && <p className="text-gray-500 text-xs mt-0.5 truncate">{course.description}</p>}
                </div>
                <span className="text-gray-500 text-xs shrink-0">{course.lesson_count} lesson{course.lesson_count !== 1 ? "s" : ""}</span>
                <div className="flex items-center gap-1">
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteCourse(course.id); }} className="p-1.5 rounded hover:bg-red-500/20 text-gray-600 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {expandedCourse === course.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </div>

              {expandedCourse === course.id && (
                <div className="border-t border-white/10 px-5 py-4 space-y-3">
                  {/* Lesson list */}
                  {(lessons[course.id] || []).map((lesson) => (
                    <div key={lesson.id} className="flex items-center gap-3 bg-white/5 rounded-lg px-4 py-3 group">
                      <Video className="w-4 h-4 text-gray-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-300 text-sm font-medium">{lesson.title}</p>
                        {lesson.description && <p className="text-gray-600 text-xs mt-0.5">{lesson.description}</p>}
                        {lesson.duration_minutes && <p className="text-gray-600 text-[10px] mt-0.5">{lesson.duration_minutes} min</p>}
                      </div>
                      {lesson.content_url && (
                        <a href={lesson.content_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/90 p-1">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <label className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 text-gray-500 hover:text-primary transition-all cursor-pointer" title="Replace media file">
                        <Upload className="w-3.5 h-3.5" />
                        <input
                          type="file"
                          accept="video/*,audio/*,.pdf,application/pdf"
                          className="hidden"
                          disabled={uploadBusy}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            e.target.value = "";
                            if (f) void handleReplaceLessonMedia(lesson, course.id, f);
                          }}
                        />
                      </label>
                      <button onClick={() => handleDeleteLesson(lesson.id, course.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Add lesson form */}
                  {showAddLesson === course.id ? (
                    <div className="bg-white/5 rounded-xl p-4 space-y-2.5">
                      <input value={lessonForm.title} onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })} placeholder="Lesson title *" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50" />
                      <input value={lessonForm.description} onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })} placeholder="Description (optional)" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50" />
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input value={lessonForm.content_url} onChange={(e) => setLessonForm({ ...lessonForm, content_url: e.target.value })} placeholder="Content URL or upload a file below" className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50" />
                        <label className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-xs text-gray-300 hover:bg-white/10 cursor-pointer shrink-0">
                          <Upload className="w-3.5 h-3.5" />
                          {uploadBusy ? "Uploading…" : "Upload"}
                          <input
                            type="file"
                            accept="video/*,audio/*,.pdf,application/pdf"
                            className="hidden"
                            disabled={uploadBusy}
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              e.target.value = "";
                              if (!f) return;
                              const r = await uploadTrainingFile(f);
                              if (r) setLessonForm((prev) => ({ ...prev, content_url: r.url, content_type: r.content_type }));
                            }}
                          />
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <select value={lessonForm.content_type} onChange={(e) => setLessonForm({ ...lessonForm, content_type: e.target.value })} className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50">
                          {["video", "document", "pdf", "audio", "quiz"].map((t) => <option key={t} value={t} className="bg-[#1a1a1a]">{t}</option>)}
                        </select>
                        <input value={lessonForm.duration_minutes} onChange={(e) => setLessonForm({ ...lessonForm, duration_minutes: e.target.value })} placeholder="Min" type="number" className="w-20 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50" />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => handleSaveLesson(course.id)} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs">{saving ? "Saving..." : "Add Lesson"}</Button>
                        <Button variant="outline" onClick={() => setShowAddLesson(null)} className="border-white/10 text-gray-400 hover:text-white text-xs">Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setShowAddLesson(course.id); setLessonForm({ title: "", description: "", content_url: "", content_type: "video", duration_minutes: "" }); }} className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-primary py-2 rounded-lg hover:bg-white/5 transition-colors border border-dashed border-white/10">
                      <Plus className="w-4 h-4" /> Add Lesson
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Journal Prompts View ─────────────────────────────────────────────────────

function JournalPrompts() {
  const [prompts, setPrompts] = useState<JournalPrompt[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ pillar: "Purpose", prompt_text: "" });
  const [saving, setSaving] = useState(false);
  const [filterPillar, setFilterPillar] = useState("All");

  const fetchPrompts = async () => {
    const res = await fetch("/api/admin/journal-prompts");
    setPrompts(await res.json());
  };

  useEffect(() => { fetchPrompts(); }, []);

  const handleSave = async () => {
    if (!form.prompt_text.trim()) return;
    setSaving(true);
    await fetch("/api/admin/journal-prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ pillar: "Purpose", prompt_text: "" });
    setShowAdd(false);
    await fetchPrompts();
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this journal prompt?")) return;
    await fetch(`/api/admin/journal-prompts/${id}`, { method: "DELETE" });
    fetchPrompts();
  };

  const filtered = filterPillar === "All" ? prompts : prompts.filter((p) => p.pillar === filterPillar);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Journal Prompts</h2>
          <p className="text-sm text-gray-500 mt-1">{prompts.length} prompt{prompts.length !== 1 ? "s" : ""} for member journaling</p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm">
          <Plus className="w-4 h-4 mr-2" /> Add Prompt
        </Button>
      </div>

      {showAdd && (
        <div className="bg-[#111] border border-white/10 rounded-xl p-5 space-y-3">
          <h3 className="text-white font-semibold text-sm">New Journal Prompt</h3>
          <select value={form.pillar} onChange={(e) => setForm({ ...form, pillar: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50">
            {["Purpose", "Authority", "Presence", "Alignment"].map((p) => <option key={p} value={p} className="bg-[#1a1a1a]">{p}</option>)}
          </select>
          <textarea value={form.prompt_text} onChange={(e) => setForm({ ...form, prompt_text: e.target.value })} placeholder="Write the journal prompt question..." rows={3} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50 resize-none" />
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm">{saving ? "Saving..." : "Save Prompt"}</Button>
            <Button variant="outline" onClick={() => setShowAdd(false)} className="border-white/10 text-gray-400 hover:text-white text-sm">Cancel</Button>
          </div>
        </div>
      )}

      <div className="flex gap-1.5 flex-wrap">
        {["All", "Purpose", "Authority", "Presence", "Alignment"].map((p) => (
          <button key={p} onClick={() => setFilterPillar(p)} className={`text-xs px-2.5 py-1 rounded-full transition-colors ${filterPillar === p ? "bg-primary text-primary-foreground font-bold" : "bg-white/5 text-gray-400 hover:text-white"}`}>{p}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="bg-[#111] border-white/10"><CardContent className="py-16 text-center text-gray-500">No prompts in this pillar.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <div key={p.id} className="flex items-start gap-4 bg-[#111] border border-white/10 rounded-xl px-5 py-4 group">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium border shrink-0 mt-0.5 ${pillarColors[p.pillar] || pillarColors.General}`}>{p.pillar}</span>
              <p className="text-gray-300 text-sm flex-1 leading-relaxed">{p.prompt_text}</p>
              <button onClick={() => handleDelete(p.id)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Settings (GHL Private Integration) ─────────────────────────────────────

type GhlIntegrationState = {
  configured: boolean;
  token_preview: string | null;
  location_id: string | null;
  updated_at: string | null;
  source: "dashboard" | "env" | null;
};

type IntegrationStatus = {
  ai: {
    live_ai_enabled: boolean;
    provider: string;
    default_provider: string;
    knowledge_base?: {
      enabled: boolean;
      chunks: number;
      sources: string[];
    };
  };
  payment: {
    stripe_configured: boolean;
    checkout_provider: "stripe" | "fastpay" | string;
    checkout_payment_link_configured: boolean;
    payment_webhook_configured: boolean;
    manual_mark_paid_available: boolean;
  };
  crm: {
    ghl_api_configured: boolean;
    ghl_token_via: string | null;
    cloud_webhook_configured: boolean;
    webhook_auth_configured: boolean;
  };
  email: {
    admin_notification_email_configured: boolean;
    sender_configured: boolean;
    provider: string | null;
    from_configured: boolean;
  };
  recent_notifications?: Array<{
    id: number;
    event_type: string;
    provider: string | null;
    recipient: string | null;
    subject: string;
    status: "sent" | "skipped" | "error";
    response_status: number | null;
    error: string | null;
    created_at: string;
  }>;
};

function GhlIntegrationSettings() {
  const [integration, setIntegration] = useState<GhlIntegrationState | null>(null);
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus | null>(null);
  const [apiToken, setApiToken] = useState("");
  const [locationId, setLocationId] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const load = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const r = await fetch("/api/admin/ghl-integration", { credentials: "include" });
      const data = await r.json();
      if (!r.ok || !data.ok) throw new Error(data.error || "Failed to load");
      setIntegration(data.integration);
      setLocationId(data.integration?.location_id || "");

      const statusResponse = await fetch("/api/admin/integrations/status", { credentials: "include" });
      const statusData = await statusResponse.json();
      if (statusResponse.ok && statusData.ok) setIntegrationStatus(statusData.status);
    } catch (e: unknown) {
      setMessage({ type: "err", text: e instanceof Error ? e.message : "Load failed" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    if (!apiToken.trim()) {
      setMessage({ type: "err", text: "Paste your Go High Level Private Integration token first." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const r = await fetch("/api/admin/ghl-integration", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_token: apiToken.trim(),
          location_id: locationId.trim() || null,
        }),
      });
      const data = await r.json();
      if (!r.ok || !data.ok) throw new Error(data.error || "Save failed");
      setApiToken("");
      setShowToken(false);
      setIntegration(data.integration);
      setMessage({ type: "ok", text: data.message || "Saved. MCP and automations will use this token." });
    } catch (e: unknown) {
      setMessage({ type: "err", text: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm("Remove the saved Go High Level token from this server?")) return;
    setSaving(true);
    setMessage(null);
    try {
      const r = await fetch("/api/admin/ghl-integration", {
        method: "DELETE",
        credentials: "include",
      });
      const data = await r.json();
      if (!r.ok || !data.ok) throw new Error(data.error || "Remove failed");
      setIntegration(data.integration);
      setApiToken("");
      setLocationId("");
      setMessage({ type: "ok", text: "Token removed from dashboard storage." });
    } catch (e: unknown) {
      setMessage({ type: "err", text: e instanceof Error ? e.message : "Remove failed" });
    } finally {
      setSaving(false);
    }
  };

  const sendTestNotification = async () => {
    setSendingTest(true);
    setMessage(null);
    try {
      const r = await fetch("/api/admin/notifications/test", {
        method: "POST",
        credentials: "include",
      });
      const data = await r.json();
      if (!r.ok || !data.ok) throw new Error(data.error || "Test failed");
      setMessage({
        type: data.result?.ok ? "ok" : "err",
        text: data.result?.ok
          ? "Test notification sent."
          : "Test notification was logged but not sent. Check readiness status.",
      });
      await load();
    } catch (e: unknown) {
      setMessage({ type: "err", text: e instanceof Error ? e.message : "Test failed" });
    } finally {
      setSendingTest(false);
    }
  };

  const statusBadge = (ok: boolean, yes = "Ready", no = "Needs setup") => (
    <Badge
      className={
        ok
          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
          : "bg-amber-500/15 text-amber-400 border-amber-500/30"
      }
    >
      {ok ? yes : no}
    </Badge>
  );

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          Settings
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          Connect Go High Level once here — no emailing keys or editing server files.
        </p>
      </div>

      <Card className="bg-[#111] border-white/10">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Production Readiness
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {integrationStatus ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div>
                  <p className="text-white">Papa Life AI</p>
                  <p className="text-xs text-gray-500">
                    Provider: {integrationStatus.ai.provider}
                    {integrationStatus.ai.knowledge_base?.enabled
                      ? ` · KB chunks: ${integrationStatus.ai.knowledge_base.chunks}`
                      : " · KB not loaded"}
                  </p>
                </div>
                {statusBadge(integrationStatus.ai.live_ai_enabled && Boolean(integrationStatus.ai.knowledge_base?.enabled))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div>
                  <p className="text-white">Payment Access</p>
                  <p className="text-xs text-gray-500">
                    Checkout: {integrationStatus.payment.checkout_provider}
                    {integrationStatus.payment.payment_webhook_configured ? " · webhook connected" : " · admin mark-paid available"}
                  </p>
                </div>
                {statusBadge(
                  integrationStatus.payment.stripe_configured ||
                    (integrationStatus.payment.checkout_payment_link_configured &&
                      integrationStatus.payment.payment_webhook_configured)
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div>
                  <p className="text-white">CRM Automation</p>
                  <p className="text-xs text-gray-500">
                    Token: {integrationStatus.crm.ghl_token_via || "none"}
                    {integrationStatus.crm.cloud_webhook_configured ? " · cloud webhook set" : " · cloud webhook missing"}
                  </p>
                </div>
                {statusBadge(
                  integrationStatus.crm.ghl_api_configured &&
                    integrationStatus.crm.cloud_webhook_configured &&
                    integrationStatus.crm.webhook_auth_configured
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-white">Email Notifications</p>
                  <p className="text-xs text-gray-500">
                    Admin email {integrationStatus.email.admin_notification_email_configured ? "set" : "missing"} · sender{" "}
                    {integrationStatus.email.sender_configured
                      ? integrationStatus.email.provider || "set"
                      : "missing"}
                  </p>
                </div>
                {statusBadge(
                  integrationStatus.email.admin_notification_email_configured &&
                    integrationStatus.email.sender_configured
                )}
              </div>
              {integrationStatus.recent_notifications?.length ? (
                <div className="rounded-lg border border-white/10 bg-black/25 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Recent notification log
                  </p>
                  <div className="space-y-2">
                    {integrationStatus.recent_notifications.slice(0, 3).map((event) => (
                      <div key={event.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="min-w-0 truncate text-gray-300">{event.subject}</span>
                        <Badge
                          className={
                            event.status === "sent"
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                              : event.status === "error"
                                ? "bg-red-500/15 text-red-300 border-red-500/30"
                                : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                          }
                        >
                          {event.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-gray-500 text-sm">Loading readiness status…</p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-[#111] border-white/10">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Go High Level API (Private Integration Token)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-gray-500 text-sm">Loading…</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  className={
                    integration?.configured
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                  }
                >
                  {integration?.configured ? "Connected" : "Not connected"}
                </Badge>
                {integration?.configured && integration.token_preview ? (
                  <span className="text-gray-500 text-xs font-mono">{integration.token_preview}</span>
                ) : null}
                {integration?.source === "env" ? (
                  <span className="text-gray-500 text-xs">(server .env override active)</span>
                ) : integration?.updated_at ? (
                  <span className="text-gray-500 text-xs">Updated {integration.updated_at}</span>
                ) : null}
              </div>

              <p className="text-gray-400 text-xs leading-relaxed">
                In GHL: <strong className="text-gray-300">Settings → Private Integrations</strong> → create or
                open your integration → copy the token. Enable <strong className="text-gray-300">SMS</strong> and{" "}
                <strong className="text-gray-300">Opportunities</strong> scopes if you use nurture SMS and pipeline
                stage moves.
              </p>

              <div className="space-y-2">
                <Label htmlFor="ghl-pit" className="text-gray-400 text-xs">
                  Private Integration Token (PIT)
                </Label>
                <div className="relative">
                  <Input
                    id="ghl-pit"
                    type={showToken ? "text" : "password"}
                    autoComplete="off"
                    placeholder={
                      integration?.configured
                        ? "Paste a new token to replace the saved one"
                        : "Paste your GHL private integration token"
                    }
                    value={apiToken}
                    onChange={(e) => setApiToken(e.target.value)}
                    className="bg-black/40 border-white/10 text-white pr-10 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white p-1"
                    aria-label={showToken ? "Hide token" : "Show token"}
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ghl-loc" className="text-gray-400 text-xs">
                  Location ID (optional)
                </Label>
                <Input
                  id="ghl-loc"
                  placeholder="e.g. l4gH0vx6W0XpcieCjWQY"
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="bg-black/40 border-white/10 text-white font-mono text-sm"
                />
              </div>

              {message ? (
                <p
                  className={`text-sm ${message.type === "ok" ? "text-emerald-400" : "text-red-400"}`}
                >
                  {message.text}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2 pt-1">
                <Button onClick={() => void save()} disabled={saving} className="bg-primary text-primary-foreground">
                  {saving ? "Saving…" : "Save token"}
                </Button>
                {integration?.configured && integration.source === "dashboard" ? (
                  <Button
                    variant="outline"
                    onClick={() => void remove()}
                    disabled={saving}
                    className="border-red-500/40 text-red-400 hover:bg-red-500/10"
                  >
                    Remove saved token
                  </Button>
                ) : null}
                <Button variant="ghost" onClick={() => void load()} disabled={loading} className="text-gray-400">
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  Refresh
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => void sendTestNotification()}
                  disabled={sendingTest}
                  className="text-gray-400"
                >
                  {sendingTest ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Mail className="w-3.5 h-3.5 mr-1" />}
                  Send test notification
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function parsePapaAiJson(value: string | null): any | null {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function AdminAlerts() {
  const [events, setEvents] = useState<NotificationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingTest, setSendingTest] = useState(false);
  const [error, setError] = useState("");

  const fetchEvents = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/notification-events?limit=100", { credentials: "include" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Unable to load alerts");
      setEvents(Array.isArray(data.events) ? data.events : []);
    } catch (err: any) {
      setError(err.message || "Unable to load alerts");
    } finally {
      setLoading(false);
    }
  };

  const sendTest = async () => {
    setSendingTest(true);
    setError("");
    try {
      const res = await fetch("/api/admin/notifications/test", { method: "POST", credentials: "include" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Unable to send test alert");
      await fetchEvents();
    } catch (err: any) {
      setError(err.message || "Unable to send test alert");
    } finally {
      setSendingTest(false);
    }
  };

  useEffect(() => {
    void fetchEvents();
  }, []);

  const counts = events.reduce(
    (acc, event) => {
      acc[event.status] = (acc[event.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-yellow">Admin Alerts</p>
          <h1 className="text-3xl font-bold text-white">Lead & System Alerts</h1>
          <p className="mt-2 text-sm text-gray-500">
            In-site backup inbox for Papa AI leads, assessments, payment confirmations, and notification tests.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={sendTest} disabled={sendingTest} variant="outline" className="border-white/15 text-white hover:border-brand-yellow">
            {sendingTest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
            Test
          </Button>
          <Button onClick={fetchEvents} variant="outline" className="border-white/15 text-white hover:border-brand-yellow">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["Total", events.length, "text-white"],
          ["Sent", counts.sent || 0, "text-emerald-400"],
          ["Saved Only", counts.skipped || 0, "text-brand-yellow"],
          ["Errors", counts.error || 0, "text-red-300"],
        ].map(([label, value, color]) => (
          <Card key={String(label)} className="border-white/10 bg-[#111]">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
              <p className={`mt-2 text-3xl font-black ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {error && <p className="rounded-lg bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</p>}

      <Card className="border-white/10 bg-[#111]">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-brand-yellow" />
            </div>
          ) : events.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-500">No alerts saved yet.</p>
          ) : (
            <div className="divide-y divide-white/10">
              {events.map((event) => (
                <article key={event.id} className="p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge
                          className={
                            event.status === "sent"
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                              : event.status === "error"
                                ? "bg-red-500/15 text-red-300 border-red-500/30"
                                : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                          }
                        >
                          {event.status === "skipped" ? "saved" : event.status}
                        </Badge>
                        <Badge className="bg-white/5 text-gray-300">{event.event_type}</Badge>
                        {event.provider && <Badge className="bg-primary/10 text-primary">{event.provider}</Badge>}
                      </div>
                      <p className="font-semibold text-white">{event.subject}</p>
                      <p className="mt-1 text-xs text-gray-600">
                        {event.recipient || "No email recipient"} · {new Date(event.created_at).toLocaleString()}
                      </p>
                    </div>
                    {event.response_status && <p className="text-xs text-gray-600">HTTP {event.response_status}</p>}
                  </div>
                  {event.error && (
                    <p className="mt-4 rounded-lg bg-black/35 p-4 text-sm leading-relaxed text-gray-400">
                      {event.error}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PapaAiAdmin() {
  const [interactions, setInteractions] = useState<PapaAiInteraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchInteractions = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/papa-ai/interactions", { credentials: "include" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Unable to load Papa AI interactions");
      setInteractions(Array.isArray(data.interactions) ? data.interactions : []);
    } catch (err: any) {
      setError(err.message || "Unable to load Papa AI interactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInteractions();
  }, []);

  const modeCounts = interactions.reduce<Record<string, number>>((acc, item) => {
    acc[item.mode] = (acc[item.mode] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-yellow">Papa Life AI</p>
          <h1 className="text-3xl font-bold text-white">Saved AI Interactions</h1>
          <p className="mt-2 text-sm text-gray-500">
            Review recent AI coach conversations, assessment reports, and lead requests.
          </p>
        </div>
        <Button onClick={fetchInteractions} variant="outline" className="border-white/15 text-white hover:border-brand-yellow">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-white/10 bg-[#111]">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-gray-500">Total</p>
            <p className="mt-2 text-3xl font-black text-white">{interactions.length}</p>
          </CardContent>
        </Card>
        {Object.entries(modeCounts).slice(0, 3).map(([mode, count]) => (
          <Card key={mode} className="border-white/10 bg-[#111]">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wide text-gray-500">{mode}</p>
              <p className="mt-2 text-3xl font-black text-brand-yellow">{count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {error && <p className="rounded-lg bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</p>}

      <Card className="border-white/10 bg-[#111]">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-brand-yellow" />
            </div>
          ) : interactions.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-500">No Papa AI interactions saved yet.</p>
          ) : (
            <div className="divide-y divide-white/10">
              {interactions.map((item) => {
                const report = parsePapaAiJson(item.report_json) || parsePapaAiJson(item.assessment_result_json);
                const resources = parsePapaAiJson(item.recommended_resources_json);
                const resourceItems = Array.isArray(resources)
                  ? resources
                  : Array.isArray(report?.resources)
                    ? report.resources
                    : [];

                return (
                  <article key={item.id} className="p-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <Badge className="bg-brand-yellow/10 text-brand-yellow">{item.mode}</Badge>
                          <Badge className="bg-primary/10 text-primary">{item.provider}</Badge>
                          {report?.focus_pillar && (
                            <Badge className="bg-white/5 text-gray-300">Focus: {report.focus_pillar}</Badge>
                          )}
                          <span className="text-xs text-gray-500">{new Date(item.created_at).toLocaleString()}</span>
                        </div>
                        <p className="font-semibold text-white">
                          {[item.first_name, item.email, item.phone].filter(Boolean).join(" · ") || "Anonymous visitor"}
                        </p>
                        {item.source_page && (
                          <p className="mt-1 truncate text-xs text-gray-600">{item.source_page}</p>
                        )}
                      </div>
                      <p className="text-xs text-gray-600">Session {item.session_id}</p>
                    </div>
                    {item.user_message && (
                      <p className="mt-4 rounded-lg bg-black/35 p-4 text-sm leading-relaxed text-white/80">
                        {item.user_message}
                      </p>
                    )}
                    {item.conversation_summary && (
                      <p className="mt-3 text-sm leading-relaxed text-gray-400">
                        {item.conversation_summary}
                      </p>
                    )}
                    {item.assistant_reply && (
                      <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-gray-400">
                        {item.assistant_reply}
                      </p>
                    )}
                    {(report?.summary || report?.strength_pillar || resourceItems.length > 0) && (
                      <div className="mt-4 grid gap-3 rounded-lg border border-white/10 bg-black/20 p-4 text-xs text-gray-400 md:grid-cols-2">
                        <div>
                          {report?.strength_pillar && (
                            <p>
                              <span className="text-gray-500">Strength:</span> {report.strength_pillar}
                            </p>
                          )}
                          {report?.summary && <p className="mt-2 leading-relaxed">{report.summary}</p>}
                        </div>
                        {resourceItems.length > 0 && (
                          <div>
                            <p className="mb-2 font-semibold uppercase tracking-wide text-gray-500">Resources</p>
                            <div className="flex flex-wrap gap-2">
                              {resourceItems.slice(0, 4).map((resource: any, index: number) => (
                                <Badge key={`${resource?.title || "resource"}-${index}`} className="bg-white/5 text-gray-300">
                                  {resource?.title || "Resource"}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [, navigate] = useLocation();
  const [view, setView] = useState<View>("command");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const prev = document.title;
    document.title = "CRM";
    return () => {
      document.title = prev;
    };
  }, []);

  // Check session on mount
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setUser(data.user);
          fetchData();
        } else {
          navigate("/login");
        }
      })
      .catch(() => navigate("/login"))
      .finally(() => setAuthChecked(true));
  }, []);

  const fetchData = async () => {
    const [leadsRes, statsRes] = await Promise.all([
      fetch("/api/leads"),
      fetch("/api/dashboard/stats"),
    ]);
    if (leadsRes.status === 401) { navigate("/login"); return; }
    setLeads(await leadsRes.json());
    setStats(await statsRes.json());
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/leads/${id}`, { method: "DELETE" });
    fetchData();
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    navigate("/login");
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0a0a0a] text-white">
      <Sidebar view={view} setView={setView} user={user} onLogout={handleLogout} />
      <main className="flex-1 p-8 overflow-y-auto">
        {view === "command" && <CommandCenter stats={stats} />}
        {view === "crm" && <CRM leads={leads} onDelete={handleDelete} onRefresh={fetchData} onLeadsUpdate={setLeads} />}
        {view === "papa-ai" && <PapaAiAdmin />}
        {view === "alerts" && <AdminAlerts />}
        {view === "sms" && <SmsCampaigns />}
        {view === "members" && <Members />}
        {view === "curriculum" && <Curriculum />}
        {view === "resources" && <Resources />}
        {view === "journal-prompts" && <JournalPrompts />}
        {view === "metrics" && <SystemMetrics stats={stats} />}
        {view === "settings" && <GhlIntegrationSettings />}
      </main>
    </div>
  );
}
