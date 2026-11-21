import { PageMeta } from "@/components/PageMeta";
import { SiteLogo } from "@/components/SiteLogo";

export default function TuesdayLive() {
  return (
    <main className="min-h-screen bg-black text-white">
      <PageMeta
        title="Papa Life | Historical Fatherhood Teachings"
        description="Former Tuesday fatherhood sessions are archived. There are no recurring Monday or Tuesday live coaching appointments."
        keywords="Papa Life, fatherhood teachings, PAPA Framework, fatherhood resources"
      />
      <div className="mx-auto max-w-3xl px-6 py-14">
        <a href="/" aria-label="Papa Life home"><SiteLogo size="md" /></a>
        <h1 className="mt-10 text-4xl font-extrabold">Historical fatherhood teachings</h1>
        <p className="mt-6 text-lg text-white/80">
          Regular Monday and Tuesday live coaching sessions have ended.
          This page is an archive, not an invitation to a new meeting.
        </p>
        <p className="mt-5 text-lg text-white/80">
          Explore current self-paced books, courses, audio, and fatherhood resources.
        </p>
        <a className="mt-8 inline-block rounded-full bg-yellow-400 px-6 py-3 font-bold text-black" href="/resources">
          Explore Fatherhood Resources
        </a>
      </div>
    </main>
  );
}
