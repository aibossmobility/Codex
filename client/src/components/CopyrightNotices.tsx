import { useLocation } from "wouter";

const privatePrefixes = [
  "/papa-life-os", "/ai-boss", "/admin", "/crm", "/dashboard", "/login",
  "/portal", "/member-login", "/member-billing", "/member-activate",
  "/member-reset-password", "/member-forgot-password", "/governance", "/operators",
  "/strategist", "/executive-memory", "/research-lab", "/theme-matrix",
];

export function PublicCopyrightStrip() {
  const [location] = useLocation();
  const path = location.replace(/\/$/, "") || "/";
  if (privatePrefixes.some(prefix => path === prefix || path.startsWith(prefix + "/"))) return null;
  return (
    <div aria-label="Copyright notice" className="border-t border-[#e6be3e]/25 bg-[#17231c] px-4 py-4 text-center text-sm text-white/85">
      © 2026 Brian Keith Hill. All rights reserved.
    </div>
  );
}

export function CurriculumUseNotice() {
  return (
    <section aria-label="Curriculum Use and Licensing" className="mx-auto max-w-4xl border-t border-[#c69c40]/40 px-6 py-8 text-sm leading-relaxed text-inherit">
      <p className="font-semibold">© 2026 Brian Keith Hill. All rights reserved.</p>
      <h2 className="mt-4 text-lg font-bold">Curriculum Use and Licensing</h2>
      <p className="mt-2">The original written lessons, instructional materials, worksheets, and educational content created and owned by Brian Keith Hill are protected by copyright.</p>
      <p className="mt-2">Reproduction, redistribution, publication, or use of these materials to teach courses requires prior written permission, except as permitted by law.</p>
      <p className="mt-2">For educational partnerships, institutional licensing, or permission to use these materials, contact <a className="underline" href="mailto:brian@bossmobility.net">brian@bossmobility.net</a>.</p>
    </section>
  );
}

/** Visible ownership notice for Brian's private operating workspaces. */
export function PrivateCopyrightStrip() {
  const [location] = useLocation();
  const path = location.replace(/\/$/, "") || "/";
  const ownerRoutes = ["/papa-life-os", "/ai-boss", "/admin/papa-life-outreach"];
  if (!ownerRoutes.some(prefix => path === prefix || path.startsWith(prefix + "/"))) return null;
  return (
    <footer aria-label="Private workspace copyright and permitted use" className="border-t-4 border-[#f2c230] bg-[#17231c] px-5 py-6 text-center text-sm leading-relaxed text-white/90 print:border-t print:border-[#17231c] print:bg-white print:text-black">
      <p className="font-extrabold">© 2026 Brian Keith Hill. All rights reserved.</p>
      <p className="mx-auto mt-2 max-w-4xl">Private owner workspace. Original written materials, curriculum, worksheets, graphics, and dashboard content are protected by copyright. Reproduction, redistribution, publication, or use of these materials to teach courses requires prior written permission, except as permitted by law.</p>
      <p className="mt-2">Permission or licensing: <a className="font-semibold underline" href="mailto:brian@bossmobility.net">brian@bossmobility.net</a></p>
    </footer>
  );
}
