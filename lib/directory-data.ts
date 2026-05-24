/**
 * EMPTIED — 2026-05-24
 * All mock data removed. Types + empty arrays preserved for import compatibility.
 * Pages should fetch real data from lib/api.ts.
 * Backup: lib/directory-data.backup.ts
 */

export type Credential = {
  id: string; type: string; issuer: string; status: "verified" | "pending" | "expired";
  expiry?: string; verifiedBy?: string; verifiedOn?: string; personId?: string;
};

export type Skill = {
  id: string; name: string; endorsedBy?: string;
};

export type HistoryEntry = {
  date: string; event: string; icon?: string;
};

export type Person = {
  id: string; name: string; role: string; county: string; housing: string;
  credential: string; skills: Skill[]; history: HistoryEntry[];
  credentials: Credential[];
  org: { id: string; name: string };
};

export type Org = {
  id: string; name: string; type: string; county: string;
  members: number; active: boolean; color: string;
};

export const orgs: Org[] = [];
export const people: Person[] = [];
export const allCredentials: (Credential & { person: string; personId: string })[] = [];

export function avatarColor(name: string): string {
  const colors = ["#89CFF0", "#EF4E4B", "#F5EBD6", "#34D399", "#C4B5FD", "#FDA4AF"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return colors[Math.abs(h) % colors.length];
}

export function initials(name: string): string {
  return name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
}
