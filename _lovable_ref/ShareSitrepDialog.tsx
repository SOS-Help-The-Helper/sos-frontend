import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Link as LinkIcon, Copy, Mail, MessageCircle, Twitter, Linkedin, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function ShareSitrepDialog({
  open,
  onOpenChange,
  incidentId,
  title,
  dek,
  county,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  incidentId: string;
  title: string;
  dek: string;
  county?: string;
}) {
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);
  const path = `/share/incident/${incidentId}`;
  const url = `${origin}${path}`;
  const shareText = `${title} — situation report`;

  const targets = [
    {
      label: "X",
      icon: Twitter,
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`,
    },
    {
      label: "LinkedIn",
      icon: Linkedin,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    },
    {
      label: "WhatsApp",
      icon: MessageCircle,
      href: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${url}`)}`,
    },
    {
      label: "Email",
      icon: Mail,
      href: `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(`${dek}\n\n${url}`)}`,
    },
  ];

  function copy() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      toast.success("Link copied");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Share situation report</DialogTitle>
          <DialogDescription>
            A public, PII-redacted case study of this incident.
          </DialogDescription>
        </DialogHeader>

        {/* Preview card */}
        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            sosconnect.org · situation report
          </p>
          <p className="text-[15px] font-semibold mt-1 leading-tight">{title}</p>
          <p className="text-[12.5px] text-muted-foreground mt-1 line-clamp-2">{dek}</p>
          {county && (
            <p className="font-mono text-[10px] text-muted-foreground mt-2">{county} County</p>
          )}
        </div>

        {/* Copy link */}
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 h-10">
          <LinkIcon size={13} className="text-muted-foreground shrink-0" />
          <input
            readOnly
            value={url || "…"}
            className="flex-1 bg-transparent text-[12px] font-mono text-foreground/80 focus:outline-none truncate"
          />
          <button
            onClick={copy}
            className="inline-flex items-center gap-1 h-7 px-2 rounded-md bg-primary text-primary-foreground text-[11px] font-medium hover:opacity-90 transition shrink-0"
          >
            <Copy size={11} /> Copy
          </button>
        </div>

        {/* Social targets */}
        <div className="grid grid-cols-4 gap-2">
          {targets.map((t) => {
            const Icon = t.icon;
            return (
              <a
                key={t.label}
                href={t.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-lg border border-border bg-card hover:bg-muted text-[11px] text-foreground transition"
              >
                <Icon size={16} />
                {t.label}
              </a>
            );
          })}
        </div>

        <Link
          to="/share/incident/$id"
          params={{ id: incidentId }}
          className="inline-flex items-center justify-center gap-1.5 h-10 rounded-lg border border-border bg-card hover:bg-muted text-[12px] font-medium transition"
        >
          <ExternalLink size={12} /> Open public page
        </Link>
      </DialogContent>
    </Dialog>
  );
}
