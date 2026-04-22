/**
 * ERV public route layout — no auth required.
 * Serves the ERV map at /erv/map
 */
export default function ErvLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
