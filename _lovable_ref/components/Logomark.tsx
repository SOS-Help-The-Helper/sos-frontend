import logoUrl from "@/assets/logomark.svg";

export function Logomark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return <img src={logoUrl} alt="SOS Connect" width={size} height={size} className={className} />;
}
