/**
 * PII redaction utilities for public-facing pages (e.g. /share/incident/[id]).
 * Strips names, phones, and detailed addresses for safe public sharing.
 */

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

/** "Asheville, NC" / "123 Main St, Buncombe" → "Buncombe County, NC" */
export function countyOnly(location: string, county: string): string {
  return `${county} County, NC`;
}

/** Strip phone numbers from text */
export function stripPhone(s: string): string {
  return s.replace(/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g, "[redacted]");
}

/** "David Plott" → "David P." */
export function redactName(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Resident";
  const first = parts[0];
  const lastInitial = parts.length > 1 ? `${parts[parts.length - 1][0]}.` : "";
  return `${first} ${lastInitial}`.trim();
}
