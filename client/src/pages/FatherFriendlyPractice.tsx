import { PageMeta } from "@/components/PageMeta";
import { SiteLogo } from "@/components/SiteLogo";

const principles = [
  {
    title: "1. Fathers shape the service",
    status: "Established",
    body: "Papa Life is built around fathers of adult children, not a general family program with fathers added later. The Check-In, coaching, courses, live teaching, and relationship tools start with fathers’ real experiences of distance, silence, regret, role transition, and reconnection.",
  },
  {
    title: "2. Father-specific support",
    status: "Established",
    body: "Fathers have low-pressure ways to enter: the 2-Minute Fatherhood Check-In, PAPA Framework, courses, AI coaching, membership resources, and live teaching. The goal is healthier father engagement, not pressure or control.",
  },
  {
    title: "3. Positive fatherhood images and language",
    status: "Established",
    body: "Papa Life presents fathers as caring, capable of growth, and important to family life. We continue to review our website and outreach materials for realistic, positive, age-diverse, and culturally diverse representations of fathers.",
  },
  {
    title: "4. Men serving fathers",
    status: "Developing",
    body: "Papa Life is founded and led by a father. As the work grows, we are developing a pathway for trained peer fathers, mentors, and facilitators to serve other fathers within clear roles and boundaries.",
  },
  {
    title: "5. Provider training",
    status: "Developing",
    body: "Papa Life already teaches listening without defensiveness, accountability, apology, authority without control, emotional safety, and consistency. We are developing this into training for churches, nonprofits, and family-service organizations working with fathers of adult children.",
  },
  {
    title: "6. Fathers are expected to participate",
    status: "Established",
    body: "Papa Life works with the father’s responsibility and choices. A father cannot outsource reconciliation or use coaching simply to prove his adult child is wrong. The work begins with examining his own patterns, listening, growth, and consistent action.",
  },
  {
    title: "7. Fathers are clearly included",
    status: "Established",
    body: "At Papa Life, fathers are not an afterthought. Fathers are the primary people the program is designed to serve, while respecting the dignity, autonomy, and boundaries of their adult children.",
  },
];

export default function FatherFriendlyPractice() {
  return (
    <div className="min-h-screen bg-[#f8f0db] text-[#17231c]">
      <PageMeta
        title="Our Father-Friendly Practice | Papa Life Coach"
        description="How Papa Life applies the Alameda County Fathers Corps Father-Friendly Principles to serving fathers of adult children."
        canonicalPath="/father-friendly-practice"
      />

      <nav className="border-b border-[#17231c]/20 bg-[#f2c230]">
        <div className="container flex min-h-20 items-center justify-between gap-5 py-4">
          <a href="/" aria-label="Papa Life home"><SiteLogo size="md" /></a>
          <div className="flex flex-wrap gap-5 text-sm font-bold">
            <a href="/" className="hover:text-[#b33a32]">Home</a>
            <a href="/papa-framework" className="hover:text-[#b33a32]">PAPA Framework</a>
            <a href="/site-directory" className="hover:text-[#b33a32]">Site Directory</a>
          </div>
        </div>
      </nav>

      <header className="bg-[#17231c] text-white">
        <div className="container py-14 md:py-20">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#f2c230]">Father-Friendly Practice</p>
          <h1 className="mt-4 max-w-5xl text-4xl font-extrabold leading-tight md:text-6xl">
            Fathers should be seen, welcomed, supported, and expected to participate.
          </h1>
          <p className="mt-6 max-w-4xl text-lg leading-relaxed text-white/80 md:text-xl">
            Papa Life serves fathers whose children are adults. We use the Alameda County Fathers Corps Father-Friendly Principles as a practical local benchmark for how we design services, communicate with fathers, build resources, and work with community partners.
          </p>
          <div className="mt-7 max-w-4xl border-l-4 border-[#f2c230] bg-white/10 p-5 leading-relaxed text-white/85">
            <strong>Important:</strong> Papa Life describes this work as aligned with, guided by, and working to apply the Father-Friendly Principles. We do not claim certification, endorsement, accreditation, or official partnership unless formally granted.
          </div>
        </div>
      </header>

      <main>
        <section className="py-14 md:py-18">
          <div className="container">
            <h2 className="text-3xl font-extrabold md:text-4xl">What father-friendly practice means at Papa Life</h2>
            <p className="mt-4 max-w-4xl text-lg leading-relaxed text-[#314239]">
              The Fathers Corps principles were created to help agencies and organizations better serve and support fathers and father-figures. Papa Life applies that lens to a later stage of fatherhood that is often overlooked: relationships with adult sons and daughters.
            </p>
            <div className="mt-7 rounded-xl bg-[#f2c230] p-5 text-lg font-extrabold">
              PAPA = Presence → Authority → Purpose → Alignment
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-2">
              {principles.map((principle) => (
                <article key={principle.title} className="rounded-2xl border border-[#17231c]/15 bg-white p-6 shadow-sm">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-white ${principle.status === "Established" ? "bg-[#145b35]" : "bg-[#b33a32]"}`}>
                    {principle.status}
                  </span>
                  <h3 className="mt-4 text-xl font-extrabold">{principle.title}</h3>
                  <p className="mt-3 leading-relaxed text-[#314239]">{principle.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-14 md:py-18">
          <div className="container">
            <div className="rounded-2xl bg-[#145b35] p-7 text-white md:p-9">
              <h2 className="text-3xl font-extrabold">For churches, nonprofits, agencies, and community partners</h2>
              <p className="mt-4 max-w-4xl text-lg leading-relaxed text-white/85">
                Papa Life can complement broader family services by filling a father-specific gap: helping fathers navigate relationships after their children become adults. Partner opportunities can include father referrals, workshops, and a developing provider training, <strong>Working With Fathers of Adult Children</strong>.
              </p>
              <div className="mt-6 flex flex-wrap gap-4">
                <a href="/contact" className="rounded-md bg-[#f2c230] px-5 py-3 font-extrabold text-[#17231c]">Connect with Papa Life</a>
                <a href="/site-directory" className="rounded-md border border-white/40 px-5 py-3 font-extrabold text-white">Explore Public Resources</a>
              </div>
            </div>

            <div className="mt-10 max-w-4xl">
              <h2 className="text-2xl font-extrabold">Continuous improvement</h2>
              <p className="mt-3 leading-relaxed text-[#314239]">
                This is a practice, not a badge. Papa Life is strengthening its father-feedback process, referral network, peer-father pathway, provider training, and documentation of father-friendly access. As those practices change, the internal master record and public page should be updated together.
              </p>

              <h2 className="mt-9 text-2xl font-extrabold">Official sources</h2>
              <ul className="mt-4 space-y-3">
                <li><a className="font-bold text-[#145b35] underline" href="https://www.first5alameda.org/wp-content/uploads/2024/11/Father-Friendly-Principles_First-5-Alameda-County_2024-1.pdf" target="_blank" rel="noreferrer">Alameda County Fathers Corps Father-Friendly Principles</a></li>
                <li><a className="font-bold text-[#145b35] underline" href="https://www.first5alameda.org/about-us/strategic-plan/fathers-corps/" target="_blank" rel="noreferrer">First 5 Alameda County — Fathers Corps</a></li>
                <li><a className="font-bold text-[#145b35] underline" href="https://www.first5alameda.org/resource/organizational-self-assessment-of-father-friendly-services/" target="_blank" rel="noreferrer">Organizational Self-Assessment of Father Friendly Services</a></li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#17231c] py-8 text-white">
        <div className="container flex flex-col justify-between gap-4 md:flex-row">
          <div><strong>Papa Life</strong><br /><span className="text-white/60">Fathers of Adult Children</span></div>
          <div className="flex flex-wrap gap-4 text-sm">
            <a href="/" className="text-[#f2c230]">Home</a>
            <a href="/site-directory" className="text-[#f2c230]">Site Directory</a>
            <a href="/privacy-policy" className="text-[#f2c230]">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
