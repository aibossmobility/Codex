import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type PageLink = { label: string; path: string; note?: string };
type PageGroup = { title: string; links: PageLink[] };

const groups: PageGroup[] = [
  {
    title: "Papa Life",
    links: [
      { label: "Home", path: "/" },
      { label: "Courses", path: "/courses" },
      { label: "Media Library (opens Courses)", path: "/media-library" },
      { label: "Papa Intro", path: "/papa-intro" },
      { label: "Papa Journal", path: "/papa-journal" },
      { label: "Papa First Lesson", path: "/papa-first-lesson" },
      { label: "Papa Daily Work Report", path: "/papa-daily-work-report" },
      { label: "AI Coach", path: "/ai-coach" },
      { label: "Resources", path: "/resources" },
      { label: "Books", path: "/books" },
      { label: "Podcast", path: "/podcast" },
      { label: "Tuesday", path: "/tuesday" },
      { label: "Tuesday Live", path: "/tuesday-live" },
      { label: "Membership", path: "/membership" },
      { label: "Contact", path: "/contact" },
    ],
  },  {
    title: "Fatherhood & Journey",
    links: [
      { label: "My Journey", path: "/my-journey" },
      { label: "Assessment", path: "/assessment" },
      { label: "Relationship Assessment", path: "/relationship-assessment" },
      { label: "2-Minute Fatherhood Check-In", path: "/marlee-assessment" },
      { label: "Papa Journey", path: "/papa-journey" },
      { label: "Adult Son Relationship", path: "/adult-son-relationship" },
      { label: "Adult Daughter Relationship", path: "/adult-daughter-relationship" },
      { label: "Why Adult Children Pull Away", path: "/why-adult-children-pull-away" },
      { label: "Father-Child Estrangement", path: "/father-child-estrangement" },
      { label: "PAPA Framework", path: "/papa-framework" },
      { label: "About Brian Keith Hill", path: "/about-brian-keith-hill" },
      { label: "Welcome to Papa Life", path: "/welcome-to-papa-life" },
    ],
  },
  {
    title: "Members & Commerce",
    links: [
      { label: "Member Login", path: "/member-login" },
      { label: "Member Register", path: "/member-register" },
      { label: "Member Activate", path: "/member-activate" },
      { label: "Forgot Password", path: "/member-forgot-password" },
      { label: "Reset Password", path: "/member-reset-password" },
      { label: "Member Billing", path: "/member-billing" },
      { label: "Member Portal", path: "/portal" },
      { label: "Shop", path: "/shop" },
      { label: "Join Papa Life", path: "/join" },
    ],
  },  {
    title: "AI Boss OS & Operations",
    links: [
      { label: "AI Boss OS", path: "/ai-boss" },
      { label: "Executive Memory", path: "/executive-memory" },
      { label: "Command Center", path: "/crm-console" },
      { label: "Dashboard (opens Command Center)", path: "/dashboard" },
      { label: "CRM Intake", path: "/crm" },
      { label: "Papa Life Outreach", path: "/admin/papa-life-outreach" },
      { label: "Strategist", path: "/strategist" },
      { label: "Theme Matrix", path: "/theme-matrix" },
      { label: "Operators", path: "/operators" },
      { label: "Governance", path: "/governance" },
      { label: "Booking", path: "/booking" },
      { label: "Research Lab", path: "/research-lab" },
      { label: "YouTube Growth", path: "/ai-boss/youtube-growth" },
      { label: "Approvals & Queue", path: "/ai-boss/approvals" },
      { label: "Takeover", path: "/ai-boss/takeover" },
      { label: "Tuesday Live Fallback", path: "/ai-boss/tuesday-live" },
    ],
  },
  {
    title: "Account & Legal",
    links: [
      { label: "Admin Login", path: "/login" },
      { label: "Privacy Policy", path: "/privacy-policy" },
      { label: "Privacy", path: "/privacy" },
      { label: "Terms of Service", path: "/terms-of-service" },
      { label: "Terms", path: "/terms" },
    ],
  },
];
export default function AllPages() {
  const [, navigate] = useLocation();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((response) => response.json())
      .then((data) => {
        if (!data.ok) navigate("/login");
      })
      .catch(() => navigate("/login"))
      .finally(() => setAuthChecked(true));
  }, []);

  if (!authChecked) {
    return <div className="min-h-screen bg-[#090909] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-yellow" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#090909] text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <img src="/images/papa-life-logo.png" alt="Papa Life" className="h-10 w-10 rounded-lg object-contain bg-white" />
          <div><h1 className="font-bold">All Papa Life Pages</h1><p className="text-xs text-gray-500">One-tap access to the full site</p></div>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => navigate("/ai-boss")}><ArrowLeft className="mr-2 h-4 w-4" />AI Boss</Button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-6 p-4 pb-20">
        {groups.map((group) => (
          <section key={group.title} className="rounded-2xl border border-white/10 bg-[#111] p-4">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-brand-yellow">{group.title}</h2>
            <div className="flex flex-col divide-y divide-white/10">
              {group.links.map((link) => (
                <a key={link.path} href={link.path} className="flex items-center justify-between gap-4 py-3 text-left hover:text-brand-yellow">
                  <div><p className="font-medium">{link.label}</p><p className="text-xs text-gray-600">papalifecoach.com{link.path}</p></div>
                  <ExternalLink className="h-4 w-4 shrink-0 text-gray-600" />
                </a>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
