import { Link } from "wouter";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, ClipboardCheck, TrendingUp, Users } from "lucide-react";
import { PageMeta } from "@/components/PageMeta";
const points = [{ icon: BookOpen, title: "Choose a Course", detail: "Find where to begin." }, { icon: Users, title: "Join Today", detail: "Invest in your growth." }, { icon: ClipboardCheck, title: "Guided Sign-Up", detail: "Get step-by-step help." }, { icon: TrendingUp, title: "Start Your Change", detail: "Put what you learn into action." }];
export default function PapaStart() {
 return <div className="min-h-screen bg-[#041514] text-white">
  <PageMeta title="Start Here | Papa Life" description="Explore courses and take your next step toward healthier relationships with your adult children." />
  <header className="border-b border-white/15 px-6 py-6"><div className="mx-auto flex max-w-7xl items-center justify-between"><Link href="/"><a className="text-2xl font-extrabold">Papa Life <span className="block text-xs font-semibold tracking-wider text-gray-300">FOR FATHERS OF ADULT CHILDREN</span></a></Link><Link href="/"><a className="flex items-center gap-2"><ArrowLeft size={18}/> Back Home</a></Link></div></header>
  <main className="mx-auto grid max-w-7xl gap-12 px-6 py-12 lg:grid-cols-2 lg:items-center">
   <section><span className="inline-block rounded-lg bg-emerald-600 px-5 py-2 font-bold">Start Here</span><h1 className="mt-6 text-5xl font-black leading-tight md:text-7xl">Real Change <span className="bg-gradient-to-r from-emerald-400 via-amber-300 to-red-500 bg-clip-text text-transparent">Starts Today.</span></h1>
    <div className="my-8 h-1 w-64 rounded bg-gradient-to-r from-emerald-500 via-yellow-400 to-red-500"/><h2 className="text-2xl font-bold">Let Brian's Digital AI help you:</h2>
    <ul className="mt-5 space-y-4 text-xl font-semibold">{["Choose the right course","Sign up and get started","Take your next step toward a healthier relationship"].map(s=><li key={s} className="flex items-start gap-3"><CheckCircle2 className="mt-1 shrink-0 text-emerald-400"/>{s}</li>)}</ul>
    <div className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-4">{points.map(({icon:Icon,title,detail})=><div key={title} className="text-center"><Icon className="mx-auto mb-3 text-emerald-400" size={34}/><strong>{title}</strong><p className="mt-2 text-sm text-gray-300">{detail}</p></div>)}</div>
   </section>
   <section className="rounded-3xl border border-emerald-500 bg-gradient-to-br from-emerald-950 to-black p-8 text-center sm:p-12"><div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full border-4 border-amber-400 text-5xl text-amber-300">✓</div><h2 className="text-5xl font-black md:text-6xl">Enroll <span className="text-amber-300">Now</span></h2><p className="mt-5 text-xl text-gray-300">Choose a course. Start investing in your growth today.</p>
    <Link href="/courses"><a className="mt-10 flex min-h-16 items-center justify-center gap-3 rounded-full bg-amber-400 px-6 text-lg font-extrabold text-black hover:bg-amber-300">Click Here to Choose a Course <ArrowRight/></a></Link>
    <Link href="/ai-coach"><a className="mt-5 flex min-h-14 items-center justify-center gap-3 rounded-full border border-emerald-400 px-6 text-lg font-bold hover:bg-emerald-950">Talk with Brian's Digital AI <ArrowRight size={19}/></a></Link>
    <p className="mt-8 text-sm text-gray-400">Review each course's details and price before purchase. Growth takes sustained effort, and your adult child's response cannot be guaranteed.</p>
   </section>
  </main>
 </div>;
}