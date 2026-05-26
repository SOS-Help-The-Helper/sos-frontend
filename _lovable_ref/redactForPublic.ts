// Public-safe transforms for the /share/incident/:id case study.
// No DB to redact against in the prototype — these helpers operate on fixture shape.

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

/** Strip parens, dashes, digits — any phone-like fragment. */
export function stripPhone(s: string): string {
  return s.replace(/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g, "[redacted]");
}

export function redactName(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Resident";
  const first = parts[0];
  const lastInitial = parts.length > 1 ? `${parts[parts.length - 1][0]}.` : "";
  return `${first} ${lastInitial}`.trim();
}
