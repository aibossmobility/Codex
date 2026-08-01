import { cn } from "@/lib/utils";

export const SITE_NAME = "Papa Life";
export const SITE_NAME_SHORT = "Papa Life";

/** Official PAPA / Boss Mobile Life Coach mark (Brian's brand asset in `public/images`). */
export const SITE_LOGO_SRC = "/images/papa-life-logo.png";

type SiteLogoProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  compact?: boolean;
};

function logoHeightClass(size: "sm" | "md" | "lg", compact: boolean | undefined): string {
  if (compact && size === "sm") return "h-8";
  if (size === "sm") return "h-9";
  if (size === "lg") return "h-14 md:h-16";
  return "h-11";
}

export function SiteLogo({ className, size = "md", compact }: SiteLogoProps) {
  const h = logoHeightClass(size, compact);

  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <img
        src={SITE_LOGO_SRC}
        alt="Papa Life logo"
        width={900}
        height={900}
        className={cn("w-auto shrink-0 object-contain object-left", h)}
        decoding="async"
      />
      <span className="min-w-0 leading-tight">
        <span className="block whitespace-nowrap text-sm font-black text-current sm:text-base">Papa Life</span>
        <span className="block whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.08em] text-current/70 sm:text-[11px]">
          For Fathers of Adult Children
        </span>
      </span>
    </div>
  );
}

export function SiteLogoStacked({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const box =
    size === "sm" ? "h-24 w-24" : size === "lg" ? "h-40 w-40 md:h-44 md:w-44" : "h-32 w-32";

  return (
    <div className={cn("flex flex-col items-center text-center", className)}>
      <img
        src={SITE_LOGO_SRC}
        alt="Papa Life logo"
        width={900}
        height={900}
        className={cn("object-contain", box)}
        decoding="async"
      />
      <span className="mt-2 text-base font-black">Papa Life</span>
      <span className="text-[10px] font-bold uppercase tracking-[0.08em] opacity-70">
        For Fathers of Adult Children
      </span>
    </div>
  );
}
