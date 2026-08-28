import { ArrowRight, RotateCw } from "lucide-react";

export function TakeTheWheelTeaser() {
  return (
    <section className="border-y border-[#17231c]/10 bg-white py-12 md:py-16">
      <div className="container grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#26743a]">Your road back starts here</p>
          <h2 className="mt-3 font-heading text-4xl font-black leading-tight md:text-5xl">Life is a journey. <span className="text-[#e5ad00]">You’re the driver.</span></h2>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-[#314239]">You do not have to figure out every step at once. Take the wheel, begin with a two-minute check-in, and let Papa Life guide you toward the next right move with your adult child.</p>
          <a href="/take-the-wheel" className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#f6c515] px-6 py-3 font-black text-[#17231c] shadow-sm hover:bg-[#ffdb3b]">
            Take the Wheel <ArrowRight className="h-5 w-5" />
          </a>
        </div>
        <div className="relative mx-auto aspect-square w-full max-w-[460px]">
          <div className="absolute inset-0 rounded-full border-[24px] border-[#181818] bg-[#fff9de] shadow-xl" />
          <div className="absolute inset-[13%] rounded-full border-[10px] border-[#f6c515] bg-[conic-gradient(from_-36deg,#f6c515_0deg_72deg,#e94141_72deg_144deg,#59a844_144deg_216deg,#f6c515_216deg_288deg,#2f7d32_288deg_360deg)]" />
          <div className="absolute left-1/2 top-1/2 flex h-[32%] w-[32%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-[8px] border-[#181818] bg-[#222] text-center text-white shadow-lg">
            <RotateCw className="h-8 w-8 text-[#f6c515]" />
            <span className="mt-2 text-sm font-black uppercase">Turn the Wheel</span>
          </div>
          <div className="absolute left-1/2 top-[4%] -translate-x-1/2 rounded-full bg-white px-4 py-2 text-sm font-black shadow">1 · Awareness</div>
          <div className="absolute bottom-[7%] left-[8%] rounded-full bg-white px-3 py-2 text-xs font-black shadow">4 · Take Action</div>
          <div className="absolute bottom-[7%] right-[8%] rounded-full bg-white px-3 py-2 text-xs font-black shadow">3 · Understand</div>
          <div className="absolute right-[2%] top-[35%] rounded-full bg-white px-3 py-2 text-xs font-black shadow">2 · Engage</div>
          <div className="absolute left-[2%] top-[35%] rounded-full bg-white px-3 py-2 text-xs font-black shadow">5 · Reconnection</div>
        </div>
      </div>
    </section>
  );
}
