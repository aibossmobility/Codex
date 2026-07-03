import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export type SiteCtaPublic = {
  id: number;
  placement: string;
  headline: string | null;
  body: string | null;
  button_label: string | null;
  button_url: string | null;
  variant: string;
  sort_order: number;
};

const shell: Record<string, string> = {
  amber: "rounded-xl border border-brand-yellow/40 bg-gradient-to-br from-brand-yellow/10 to-transparent p-5 shadow-[0_0_24px_rgba(255,214,10,0.08)]",
  outline: "rounded-xl border border-white/15 bg-white/[0.04] p-5",
  minimal: "rounded-lg border border-white/10 bg-transparent px-1 py-3 text-sm",
};

/**
 * Renders active marketing CTAs for a placement (driven by MCP /api/admin/ctas).
 */
export function SiteCtaBlocks({
  placement,
  className = "",
  compact = false,
  limit,
}: {
  placement: string;
  className?: string;
  /** Slim inline card — for hero-adjacent prompts that should not dominate the page */
  compact?: boolean;
  limit?: number;
}) {
  const [items, setItems] = useState<SiteCtaPublic[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/ctas?placement=${encodeURIComponent(placement)}`)
      .then((r) => (r.ok ? r.json() : { ctas: [] }))
      .then((d) => {
        if (!cancelled) setItems(Array.isArray(d.ctas) ? d.ctas : []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [placement]);

  const visible = limit != null && limit > 0 ? items.slice(0, limit) : items;
  if (!visible.length) return null;

  return (
    <div className={`space-y-4 w-full max-w-full ${className}`}>
      {visible.map((cta) => {
        const v = compact
          ? "rounded-lg border border-brand-yellow/25 bg-brand-yellow/[0.06] px-4 py-4 sm:px-5 min-w-0 overflow-hidden"
          : shell[cta.variant] || shell.amber;
        const href = cta.button_url?.trim() || "";
        const isExternal =
          /^https?:\/\//i.test(href) && !/bossmobilelifecoach\.com/i.test(href);
        return (
          <div key={cta.id} className={v}>
            {cta.headline ? (
              <h3
                className={
                  compact
                    ? "font-heading font-semibold text-white text-base sm:text-lg mb-1.5 leading-snug"
                    : "font-heading font-bold text-white text-lg mb-2"
                }
              >
                {cta.headline}
              </h3>
            ) : null}
            {cta.body ? (
              <p
                className={
                  compact
                    ? "text-gray-400 text-xs sm:text-sm leading-relaxed"
                    : "text-gray-300 text-sm leading-relaxed whitespace-pre-wrap"
                }
              >
                {cta.body}
              </p>
            ) : null}
            {cta.button_label && href ? (
              <div className={compact ? "mt-3 min-w-0" : "mt-4"}>
                <Button
                  asChild
                  size={compact ? "sm" : "default"}
                  className={
                    compact
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs sm:text-sm h-auto min-h-9 w-full max-w-full whitespace-normal py-2.5 px-3 text-center leading-snug"
                      : "bg-primary text-primary-foreground hover:bg-primary/90 font-semibold max-w-full whitespace-normal"
                  }
                >
                  <a
                    href={href}
                    className={compact ? "block w-full text-center" : undefined}
                    {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  >
                    {cta.button_label}
                  </a>
                </Button>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
