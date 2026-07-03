import { cn } from "@/lib/utils";

export const SITE_NAME = "Boss Mobile Life Coach";
export const SITE_NAME_SHORT = "Boss Mobile";

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
    <div className={cn("flex items-center min-w-0", className)}>
      <img
        src={SITE_LOGO_SRC}
        alt={SITE_NAME}
        width={900}
        height={900}
        className={cn("w-auto object-contain object-left shrink-0", h)}
        decoding="async"
      />
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
        alt={SITE_NAME}
        width={900}
        height={900}
        className={cn("object-contain", box)}
        decoding="async"
      />
    </div>
  );
}
