import { PageMeta } from "@/components/PageMeta";
import { SiteLogo } from "@/components/SiteLogo";
import { brianKeithHillHeadshot } from "@/lib/site-assets";
import { ArrowDown, ArrowRight, Check, HeartHandshake, ShieldCheck, X } from "lucide-react";

const joinHref = "/go/join?src=welcome-to-papa-life";

const fitStatements = [
  "My son or daughter rarely calls or responds.",
  "I am not sure when or why our relationship changed.",
  "I miss being part of my grandchildren’s lives.",
  "I want to apologize, but I do not know what to say.",
  "Our conversations quickly become defensive or tense.",
  "I regret choices I made when my children were younger.",
  "I have prayed for reconciliation but need practical direction.",
  "I want to rebuild trust without trying to control my adult child.",
  "I am willing to begin the process by examining myself.",
];

const stakes = ["Missed family milestones", "Additional years of distance", "Lost time with grandchildren", "Increasingly fixed family narratives", "Regret over opportunities not taken"];
const benefits = [
  "Listen without immediately defending.", "Take responsibility without collapsing into shame.",
  "Understand the difference between authority and control.", "Apologize without explanation or manipulation.",
  "Communicate with humility and clarity.", "Rebuild trust through small, consistent actions.",
  "Respond wisely when an adult child pulls away.", "Become emotionally and spiritually safer to talk to.",
  "Lead with presence instead of pressure.", "Walk alongside other fathers who understand the journey.",
];

const isNot = ["A method for forcing an adult child to respond.", "A place to prove the father was right.", "A promise of instant reconciliation.", "A program based on blaming children.", "A shortcut around difficult personal growth.", "A substitute for qualified mental-health or emergency support."];
const isList = ["A Scripture-centered path toward humility.", "A practical process for becoming safer to talk to.", "A place to strengthen spiritual and emotional foundations.", "Guidance for taking the next right step.", "A community where fathers do not have to carry the journey alone.", "A movement calling fathers back to purpose, presence, responsibility, and alignment."];
const transformations = [["Defensiveness", "Listening"], ["Shame", "Healthy responsibility"], ["Control", "Presence"], ["Confusion", "Clarity"], ["Silence", "Safer conversation"], ["Isolation", "Community"], ["Fear", "Renewed hope"]];
const framework = [
  ["Presence", "Learning to listen, remain emotionally available, and stay engaged without pressure."],
  ["Purpose", "Remembering that fatherhood does not end when a child becomes an adult."],
  ["Authority", "Leading through character, wisdom, responsibility, and example—not control."],
  ["Alignment", "Bringing words, choices, faith, and relationships into agreement."],
];

function Cta({ children }: { children: React.ReactNode }) {
  return <a href={joinHref} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#f2c230] px-6 py-3 font-extrabold text-[#17231c] shadow-lg hover:bg-[#f7d75e]">{children}<ArrowRight className="h-4 w-4" aria-hidden="true" /></a>;
}

export default function WelcomeToPapaLife() {
  return <div className="min-h-screen overflow-x-hidden bg-[#f8f0db] text-[#17231c]">
    <PageMeta title="Papa Life | Help for Fathers of Adult Children" description="Papa Life helps fathers of adult children move from distance, silence, and regret toward humility, safer communication, renewed hope, and the possibility of reconnection." keywords="help for fathers of adult children, family estrangement, reconnect with adult child, Papa Life" canonicalPath="/welcome-to-papa-life" />
    <nav className="border-b border-[#17231c]/15 bg-[#f2c230]"><div className="container flex h-20 items-center justify-between"><a href="/" aria-label="Papa Life home"><SiteLogo size="md" /></a><a href={joinHref} className="rounded-md bg-[#145b35] px-4 py-3 text-sm font-extrabold text-white hover:bg-[#0f492a]">Join Papa Life</a></div></nav>

    <header className="bg-[#17231c] text-white"><div className="container grid min-h-[620px] items-center gap-10 py-16 lg:grid-cols-[1.15fr_.85fr]">
      <div><p className="text-sm font-black uppercase tracking-[.2em] text-[#f2c230]">From distance to reconnection</p><h1 className="mt-5 max-w-4xl text-4xl font-extrabold leading-tight md:text-6xl">Your Adult Child May Be Grown, but Your Fatherhood Is Not Finished.</h1><p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/85 md:text-xl">If silence, distance, regret, or unresolved hurt has come between you and your adult child, Papa Life was created with fathers like you in mind.</p><p className="mt-5 text-2xl font-extrabold text-[#f2c230]">As long as you’re both alive, it’s never too late.</p><div className="mt-8 flex flex-wrap gap-4"><Cta>Join Papa Life — Immediate Access</Cta><a href="#is-this-you" className="inline-flex min-h-12 items-center gap-2 rounded-md border border-white/40 px-6 py-3 font-extrabold text-white hover:border-[#f2c230] hover:text-[#f2c230]">See If Papa Life Is for Me <ArrowDown className="h-4 w-4" /></a></div></div>
      <aside className="rounded-xl border border-white/15 bg-white/5 p-7"><HeartHandshake className="h-11 w-11 text-[#f2c230]" /><p className="mt-5 text-2xl font-extrabold">We do not help fathers win arguments.</p><p className="mt-2 text-xl text-white/75">We help fathers rebuild relationships.</p></aside>
    </div></header>

    <main>
      <section id="is-this-you" className="scroll-mt-6 py-16 md:py-20"><div className="container"><p className="text-sm font-black uppercase tracking-[.18em] text-[#b33a32]">Does this sound like you?</p><h2 className="mt-3 text-3xl font-extrabold md:text-5xl">You Love Them. You Just Don’t Know What to Do Next.</h2><div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{fitStatements.map(text => <div key={text} className="flex gap-3 rounded-lg border border-[#17231c]/15 bg-white p-5 shadow-sm"><Check className="mt-0.5 h-5 w-5 shrink-0 text-[#145b35]" aria-hidden="true"/><p className="font-semibold leading-relaxed">{text}</p></div>)}</div><p className="mt-8 rounded-lg bg-[#f2c230] p-6 text-lg font-extrabold">If several of these statements describe your life, Brian Keith Hill—founder of Boss Mobility and Papa Life—created this path for fathers like you.</p></div></section>

      <section className="bg-[#b33a32] py-16 text-white"><div className="container grid gap-10 lg:grid-cols-[1fr_.8fr]"><div><h2 className="text-4xl font-extrabold">Silence Rarely Heals Itself.</h2><p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/85">Waiting does not make you a bad father. But without new understanding and a different way of showing up, distance can deepen and missed opportunities can become lasting family stories.</p><ul className="mt-6 grid gap-3 sm:grid-cols-2">{stakes.map(x => <li key={x} className="flex gap-3"><Check className="mt-1 h-5 w-5 shrink-0 text-[#f2c230]" />{x}</li>)}</ul></div><blockquote className="rounded-xl bg-[#17231c] p-8 text-2xl font-extrabold leading-relaxed text-[#f2c230]">“The greatest risk is not hearing ‘no.’ The greatest risk is allowing another year to pass without becoming ready.”</blockquote></div></section>

      <section className="py-16 md:py-20"><div className="container"><p className="text-sm font-black uppercase tracking-[.18em] text-[#145b35]">Practical growth</p><h2 className="mt-3 text-4xl font-extrabold">What Papa Life Helps Fathers Do</h2><div className="mt-8 grid gap-4 sm:grid-cols-2">{benefits.map(x => <div key={x} className="flex gap-3 rounded-lg bg-white p-5"><ShieldCheck className="h-6 w-6 shrink-0 text-[#145b35]"/><p className="font-semibold">{x}</p></div>)}</div></div></section>

      <section className="bg-[#17231c] py-16 text-white"><div className="container"><h2 className="text-center text-4xl font-extrabold">What Papa Life Is—and Is Not</h2><div className="mt-10 grid gap-6 lg:grid-cols-2"><div className="rounded-xl border border-[#b33a32]/60 bg-[#b33a32]/10 p-7"><h3 className="text-2xl text-[#f2c230]">Papa Life Is Not</h3><ul className="mt-5 space-y-4">{isNot.map(x => <li key={x} className="flex gap-3"><X className="mt-1 h-5 w-5 shrink-0 text-[#b33a32]"/>{x}</li>)}</ul></div><div className="rounded-xl border border-[#76b947]/60 bg-[#145b35]/25 p-7"><h3 className="text-2xl text-[#f2c230]">Papa Life Is</h3><ul className="mt-5 space-y-4">{isList.map(x => <li key={x} className="flex gap-3"><Check className="mt-1 h-5 w-5 shrink-0 text-[#76b947]"/>{x}</li>)}</ul></div></div></div></section>

      <section className="bg-[#f2c230] py-16"><div className="container"><h2 className="max-w-4xl text-4xl font-extrabold md:text-5xl">From Distance to Reconnection Begins With the Father You Become.</h2><div className="mt-9 grid gap-3 md:grid-cols-2 lg:grid-cols-3">{transformations.map(([from,to]) => <div key={from} className="flex items-center justify-between gap-4 rounded-lg bg-[#f8f0db] p-5"><span className="font-bold text-[#b33a32]">{from}</span><ArrowRight className="h-5 w-5 shrink-0"/><span className="font-extrabold text-[#145b35]">{to}</span></div>)}</div><p className="mt-8 text-xl font-extrabold">We cannot control another person’s response. We can change how we show up.</p></div></section>

      <section className="py-16 md:py-20"><div className="container"><p className="text-sm font-black uppercase tracking-[.18em] text-[#b33a32]">The PAPA Framework</p><h2 className="mt-3 text-4xl font-extrabold">A Grounded Path Forward</h2><p className="mt-4 max-w-3xl text-lg text-[#314239]">Not a rigid formula or a promise of results—a set of principles for becoming a more present, responsible, and trustworthy father.</p><ol className="mt-9 grid gap-5 md:grid-cols-2">{framework.map(([title,copy], i) => <li key={title} className="rounded-xl border border-[#17231c]/15 bg-white p-7"><span className="text-sm font-black text-[#b33a32]">0{i+1}</span><h3 className="mt-2 text-2xl text-[#145b35]">{title}</h3><p className="mt-3 leading-relaxed text-[#314239]">{copy}</p></li>)}</ol></div></section>

      <section className="bg-[#145b35] py-16 text-white"><div className="container grid items-center gap-9 md:grid-cols-[280px_1fr]"><img src={brianKeithHillHeadshot} alt="Brian Keith Hill, founder of Boss Mobility and Papa Life" className="aspect-square w-full rounded-xl object-cover object-top"/><div><p className="text-sm font-black uppercase tracking-[.18em] text-[#f2c230]">About the founder</p><h2 className="mt-3 text-4xl font-extrabold">Brian Keith Hill</h2><p className="mt-5 max-w-3xl text-lg leading-relaxed text-white/85">Brian Keith Hill is the founder of Boss Mobility and Papa Life. He created Papa Life from lived experience, biblical conviction, and a lifelong commitment to fatherhood. As a father, grandfather, teacher, and mentor, Brian helps men face the places where pride, pain, misunderstanding, and silence have damaged family relationships. He approaches the work as a guide—not a guru—walking beside fathers as they learn to listen, accept responsibility, rebuild trust, and lead through presence.</p><a href="/about-brian-keith-hill" className="mt-6 inline-flex items-center gap-2 font-extrabold text-[#f2c230] hover:text-white">Learn more about Brian Keith Hill <ArrowRight className="h-4 w-4" aria-hidden="true" /></a></div></div></section>

      <section className="bg-[#17231c] py-20 text-center text-white"><div className="container"><h2 className="text-4xl font-extrabold md:text-5xl">You Do Not Have to Carry This Alone.</h2><p className="mx-auto mt-5 max-w-2xl text-lg text-white/80">You may not be able to rewrite yesterday, but you can decide what kind of father you will be from this day forward.</p><div className="mt-8"><Cta>Join Papa Life — Immediate Access</Cta></div><p className="mt-5 text-white/75">Begin the work of becoming the father healthy reconnection may become possible with.</p><p className="mt-8 text-2xl font-extrabold text-[#f2c230]">Father by title. Father by presence.</p></div></section>
    </main>
    <footer className="bg-[#f2c230] py-8"><div className="container flex flex-col items-center justify-between gap-4 sm:flex-row"><div><a href="/"><SiteLogo size="md" /></a><p className="mt-2 max-w-xl text-xs">Papa Life is a fatherhood initiative founded by <a href="/about-brian-keith-hill" className="underline">Brian Keith Hill</a> through Boss Mobility.</p></div><div className="flex gap-5 text-sm font-bold"><a href="/privacy-policy">Privacy</a><a href="/terms-of-service">Terms</a><a href="/member-login">Member Login</a></div></div></footer>
  </div>;
}
