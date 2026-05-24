export type Credential = {
  id: string;
  type: string;
  issuer: string;
  status: "verified" | "pending" | "expired";
  expiry?: string;
  verifiedBy?: string;
  verifiedOn?: string;
  personId?: string;
};

export type Skill = {
  name: string;
  level: 1 | 2 | 3 | 4;
  source: "self" | "credential" | "org";
  credential?: string;
};

export type Person = {
  id: string;
  name: string;
  org: { id: string; name: string };
  role: string;
  sosScore: number;
  scoreBreakdown: { community: number; impact: number; readiness: number };
  county: string;
  phoneMask: string;
  email: string;
  housingStatus: "Stable" | "Displaced" | "At Risk";
  credentials: Credential[];
  skills: Skill[];
  household?: { address: string; members: { name: string; relation: string }[] };
  history: HistoryEntry[];
};

export type HistoryEntry = {
  id: string;
  kind: "request" | "resource" | "report" | "case";
  title: string;
  disaster: string;
  status: { label: string; tone: "green" | "blue" | "yellow" | "red" };
  date: string;
  link?: { caseId: string };
};

export type Org = {
  id: string;
  name: string;
  type: string;
  icon: string;
  location: string;
  memberCount: number;
  activeCases: number;
  capabilities: string[];
  trust: number;
  email: string;
  phone: string;
  website: string;
  counties: string[];
  members: { id: string; name: string; role: "Admin" | "Coordinator" | "Volunteer" | "Viewer" }[];
  stats: { active: number; resources: number; fulfilled: number; avgResponse: string };
  history: HistoryEntry[];
};

export const orgs: Org[] = [
  {
    id: "emergency-rv",
    name: "Emergency RV",
    type: "Mutual Aid Network",
    icon: "Truck",
    location: "Asheville, NC",
    memberCount: 42,
    activeCases: 18,
    capabilities: ["Housing", "Transport", "Logistics"],
    trust: 0.92,
    email: "dispatch@emergencyrv.org",
    phone: "(828) 555-0142",
    website: "emergencyrv.org",
    counties: ["Buncombe", "Madison", "Yancey", "Mitchell"],
    members: [
      { id: "maria-rodriguez", name: "Maria Rodriguez", role: "Coordinator" },
      { id: "james-okafor", name: "James Okafor", role: "Admin" },
      { id: "priya-shah", name: "Priya Shah", role: "Volunteer" },
      { id: "tom-walker", name: "Tom Walker", role: "Volunteer" },
    ],
    stats: { active: 18, resources: 34, fulfilled: 211, avgResponse: "4h 12m" },
    history: [
      { id: "oh1", kind: "case", title: "Opened SOS Case for Marcus H. — 3 child cases", disaster: "Helene", status: { label: "Active", tone: "blue" }, date: "2026-03-12", link: { caseId: "U-204" } },
      { id: "oh2", kind: "resource", title: "Staged 6 RV units in Buncombe staging area", disaster: "Helene", status: { label: "Deployed", tone: "blue" }, date: "2026-03-10", link: { caseId: "C-1042" } },
      { id: "oh3", kind: "request", title: "HOUSING.TEMPORARY fulfilled — Janet T.", disaster: "Helene", status: { label: "Fulfilled", tone: "green" }, date: "2026-03-08", link: { caseId: "C-1042" } },
      { id: "oh4", kind: "report", title: "Weekly capacity report submitted", disaster: "Helene", status: { label: "Logged", tone: "yellow" }, date: "2026-03-05" },
    ],
  },
  {
    id: "blueridge-mutual",
    name: "Blue Ridge Mutual Aid",
    type: "Community Org",
    icon: "Users",
    location: "Boone, NC",
    memberCount: 87,
    activeCases: 31,
    capabilities: ["Food", "Medical", "Housing"],
    trust: 0.88,
    email: "hello@blueridgemutual.org",
    phone: "(828) 555-0188",
    website: "blueridgemutual.org",
    counties: ["Watauga", "Avery", "Ashe"],
    members: [
      { id: "alex-chen", name: "Alex Chen", role: "Admin" },
      { id: "sara-lopez", name: "Sara Lopez", role: "Coordinator" },
    ],
    stats: { active: 31, resources: 52, fulfilled: 408, avgResponse: "2h 48m" },
    history: [
      { id: "bh1", kind: "case", title: "Joined SOS Case U-204 — repair + transport tasks", disaster: "Helene", status: { label: "Active", tone: "blue" }, date: "2026-03-12", link: { caseId: "U-204" } },
      { id: "bh2", kind: "request", title: "HOUSING.REPAIR scheduled — Marcus H.", disaster: "Helene", status: { label: "In Progress", tone: "yellow" }, date: "2026-03-11", link: { caseId: "C-1039" } },
      { id: "bh3", kind: "request", title: "FOOD.PANTRY + TRANSPORT — Marcus H.", disaster: "Helene", status: { label: "Open", tone: "yellow" }, date: "2026-03-10", link: { caseId: "C-1041" } },
    ],
  },
  {
    id: "wnc-foodbank",
    name: "WNC Food Bank",
    type: "Nonprofit",
    icon: "Utensils",
    location: "Hendersonville, NC",
    memberCount: 124,
    activeCases: 9,
    capabilities: ["Food", "Logistics"],
    trust: 0.95,
    email: "info@wncfoodbank.org",
    phone: "(828) 555-0200",
    website: "wncfoodbank.org",
    counties: ["Henderson", "Buncombe", "Transylvania"],
    members: [
      { id: "kim-nguyen", name: "Kim Nguyen", role: "Admin" },
      { id: "tom-walker", name: "Tom Walker", role: "Volunteer" },
    ],
    stats: { active: 9, resources: 1840, fulfilled: 12400, avgResponse: "6h 02m" },
    history: [
      { id: "wh1", kind: "request", title: "FOOD.HOT_MEAL fulfilled — Rosa V.", disaster: "Helene", status: { label: "In Progress", tone: "blue" }, date: "2026-03-11", link: { caseId: "C-1038" } },
      { id: "wh2", kind: "resource", title: "Food box inventory restocked (412 boxes)", disaster: "Helene", status: { label: "Logged", tone: "yellow" }, date: "2026-03-09" },
      { id: "wh3", kind: "report", title: "Supply shortage flagged — Madison County", disaster: "Madison food shortage", status: { label: "Critical", tone: "red" }, date: "2026-03-12" },
      { id: "wh4", kind: "resource", title: "18 pallets bottled water staged in Hickory", disaster: "Helene", status: { label: "Available", tone: "green" }, date: "2026-03-07" },
      { id: "wh5", kind: "case", title: "Joined coalition response — Burke flooding", disaster: "Burke flooding", status: { label: "Active", tone: "blue" }, date: "2026-03-10" },
    ],
  },
  {
    id: "mountain-medics",
    name: "Mountain Medics Collective",
    type: "Medical",
    icon: "HeartPulse",
    location: "Burnsville, NC",
    memberCount: 28,
    activeCases: 12,
    capabilities: ["Medical", "Wellness"],
    trust: 0.9,
    email: "team@mountainmedics.org",
    phone: "(828) 555-0177",
    website: "mountainmedics.org",
    counties: ["Yancey", "Mitchell", "Madison"],
    members: [
      { id: "dr-okafor", name: "Dr. James Okafor", role: "Coordinator" },
      { id: "alicia-ng", name: "Alicia Ng", role: "Coordinator" },
    ],
    stats: { active: 12, resources: 18, fulfilled: 96, avgResponse: "1h 24m" },
    history: [
      { id: "mh1", kind: "case", title: "Joined SOS Case U-204 — childcare task", disaster: "Helene", status: { label: "Active", tone: "blue" }, date: "2026-03-12", link: { caseId: "U-204" } },
      { id: "mh2", kind: "request", title: "CHILDCARE accepted — Linda P.", disaster: "Helene", status: { label: "Open", tone: "yellow" }, date: "2026-03-10", link: { caseId: "C-1040" } },
      { id: "mh3", kind: "request", title: "MENTAL_HEALTH session — Pat K.", disaster: "Burke flooding", status: { label: "Fulfilled", tone: "green" }, date: "2026-03-05", link: { caseId: "C-1036" } },
      { id: "mh4", kind: "request", title: "MEDICAL.SUPPLIES — Dale R.", disaster: "Burke flooding", status: { label: "Fulfilled", tone: "green" }, date: "2026-03-08", link: { caseId: "C-1037" } },
      { id: "mh5", kind: "report", title: "Boil-water advisory verified — Burke", disaster: "Burke flooding", status: { label: "Routine", tone: "yellow" }, date: "2026-03-11" },
    ],
  },
];

export const people: Person[] = [
  {
    id: "maria-rodriguez",
    name: "Maria Rodriguez",
    org: { id: "emergency-rv", name: "Emergency RV" },
    role: "Housing Coordinator",
    sosScore: 72,
    scoreBreakdown: { community: 30, impact: 32, readiness: 10 },
    county: "Buncombe",
    phoneMask: "(828) ***-1234",
    email: "m.rodriguez@emergencyrv.org",
    housingStatus: "Displaced",
    credentials: [
      { id: "c1", type: "FEMA IS-100", issuer: "FEMA", status: "verified", expiry: "2027-03-12", verifiedBy: "James Okafor", verifiedOn: "2025-09-14" },
      { id: "c2", type: "Wilderness First Aid", issuer: "NOLS", status: "verified", expiry: "2026-08-01", verifiedBy: "Mountain Medics", verifiedOn: "2024-08-04" },
      { id: "c3", type: "CDL Class B", issuer: "NCDMV", status: "pending" },
    ],
    skills: [
      { name: "Case Management", level: 4, source: "org", credential: "Emergency RV" },
      { name: "Spanish (fluent)", level: 4, source: "self" },
      { name: "First Aid", level: 3, source: "credential", credential: "Wilderness First Aid" },
      { name: "Logistics", level: 3, source: "org" },
    ],
    household: {
      address: "2106 E Southgate, Asheville NC",
      members: [
        { name: "Luis Rodriguez", relation: "Spouse" },
        { name: "Sofia Rodriguez", relation: "Child" },
      ],
    },
    history: [
      { id: "h1", kind: "request", title: "HOUSING.TEMPORARY request — Hurricane Helene", disaster: "Helene", status: { label: "Fulfilled", tone: "green" }, date: "2024-10-04", link: { caseId: "U-204" } },
      { id: "h2", kind: "resource", title: "COMMUNITY.VOLUNTEER resource — ran donation site", disaster: "Helene", status: { label: "Deployed", tone: "blue" }, date: "2024-10-09", link: { caseId: "C-1042" } },
      { id: "h3", kind: "request", title: "FOOD.MEALS request — Hurricane Helene", disaster: "Helene", status: { label: "Fulfilled", tone: "green" }, date: "2024-10-12", link: { caseId: "C-1041" } },
      { id: "h4", kind: "report", title: "Damage assessment submitted", disaster: "Helene", status: { label: "Logged", tone: "yellow" }, date: "2024-10-18", link: { caseId: "U-204" } },
    ],
  },
  {
    id: "james-okafor",
    name: "James Okafor",
    org: { id: "emergency-rv", name: "Emergency RV" },
    role: "Operations Lead",
    sosScore: 84,
    scoreBreakdown: { community: 34, impact: 36, readiness: 14 },
    county: "Buncombe",
    phoneMask: "(828) ***-7782",
    email: "j.okafor@emergencyrv.org",
    housingStatus: "Stable",
    credentials: [
      { id: "c4", type: "FEMA ICS-200", issuer: "FEMA", status: "verified", expiry: "2028-01-01", verifiedBy: "Emergency RV", verifiedOn: "2025-01-10" },
    ],
    skills: [
      { name: "Incident Command", level: 4, source: "credential", credential: "FEMA ICS-200" },
      { name: "Fleet Management", level: 4, source: "org" },
    ],
    history: [
      { id: "h5", kind: "resource", title: "TRANSPORT.RV resource — staged 6 units", disaster: "Helene", status: { label: "Deployed", tone: "blue" }, date: "2024-10-02", link: { caseId: "C-1042" } },
      { id: "h5b", kind: "case", title: "Coordinated convoy intake — 14 RVs received", disaster: "Helene", status: { label: "Closed", tone: "green" }, date: "2024-10-15" },
      { id: "h5c", kind: "report", title: "Filed staging-lot capacity report (Ocala)", disaster: "Helene", status: { label: "Logged", tone: "yellow" }, date: "2024-10-22" },
      { id: "h5d", kind: "request", title: "Verified Janet T. HOUSING.TEMPORARY intake", disaster: "Helene", status: { label: "Fulfilled", tone: "green" }, date: "2024-11-04", link: { caseId: "C-1042" } },
    ],
  },
  {
    id: "priya-shah",
    name: "Priya Shah",
    org: { id: "blueridge-mutual", name: "Blue Ridge Mutual Aid" },
    role: "Volunteer",
    sosScore: 41,
    scoreBreakdown: { community: 18, impact: 14, readiness: 9 },
    county: "Watauga",
    phoneMask: "(828) ***-5510",
    email: "p.shah@blueridgemutual.org",
    housingStatus: "Stable",
    credentials: [
      { id: "c5", type: "Food Handler", issuer: "NC DHHS", status: "pending" },
      { id: "c5b", type: "CPR / AED", issuer: "American Red Cross", status: "verified", expiry: "2026-05-12", verifiedBy: "Blue Ridge Mutual Aid", verifiedOn: "2024-05-12" },
    ],
    skills: [
      { name: "Kitchen Ops", level: 2, source: "self" },
      { name: "Hindi (fluent)", level: 4, source: "self" },
      { name: "Intake Interviews", level: 2, source: "org" },
    ],
    history: [
      { id: "ph1", kind: "request", title: "Assisted intake — Linda P.", disaster: "Helene", status: { label: "In Progress", tone: "blue" }, date: "2026-03-10", link: { caseId: "C-1040" } },
      { id: "ph2", kind: "resource", title: "Volunteered hot-meal shift (8 hrs)", disaster: "Burke flooding", status: { label: "Logged", tone: "yellow" }, date: "2026-03-06" },
      { id: "ph3", kind: "report", title: "Reported road washout — Watauga", disaster: "Helene", status: { label: "Verified", tone: "green" }, date: "2024-10-01" },
    ],
  },
  {
    id: "tom-walker",
    name: "Tom Walker",
    org: { id: "wnc-foodbank", name: "WNC Food Bank" },
    role: "Driver",
    sosScore: 58,
    scoreBreakdown: { community: 22, impact: 24, readiness: 12 },
    county: "Henderson",
    phoneMask: "(828) ***-9904",
    email: "t.walker@wncfoodbank.org",
    housingStatus: "At Risk",
    credentials: [
      { id: "c6", type: "CDL Class A", issuer: "NCDMV", status: "verified", expiry: "2029-05-22", verifiedBy: "WNC Food Bank", verifiedOn: "2024-05-22" },
      { id: "c6b", type: "HAZMAT Endorsement", issuer: "NCDMV", status: "verified", expiry: "2027-05-22", verifiedBy: "WNC Food Bank", verifiedOn: "2024-05-22" },
      { id: "c6c", type: "Defensive Driving", issuer: "NSC", status: "expired", expiry: "2024-01-10" },
    ],
    skills: [
      { name: "Logistics", level: 3, source: "org" },
      { name: "Long-haul Driving", level: 4, source: "credential", credential: "CDL Class A" },
      { name: "Forklift", level: 2, source: "self" },
    ],
    history: [
      { id: "th1", kind: "resource", title: "Delivered 412 food boxes — Hickory → Asheville", disaster: "Helene", status: { label: "Deployed", tone: "blue" }, date: "2026-03-09" },
      { id: "th2", kind: "resource", title: "Transported hot meals — Burke pop-up", disaster: "Burke flooding", status: { label: "Completed", tone: "green" }, date: "2026-03-12" },
      { id: "th3", kind: "request", title: "Backup driver — Maria Rodriguez convoy", disaster: "Helene", status: { label: "Fulfilled", tone: "green" }, date: "2024-10-17", link: { caseId: "C-1043" } },
    ],
  },
  {
    id: "alex-chen",
    name: "Alex Chen",
    org: { id: "blueridge-mutual", name: "Blue Ridge Mutual Aid" },
    role: "Director",
    sosScore: 91,
    scoreBreakdown: { community: 36, impact: 40, readiness: 15 },
    county: "Watauga",
    phoneMask: "(828) ***-3321",
    email: "alex@blueridgemutual.org",
    housingStatus: "Stable",
    credentials: [
      { id: "c7", type: "FEMA ICS-300", issuer: "FEMA", status: "verified", expiry: "2027-11-04", verifiedBy: "FEMA", verifiedOn: "2024-11-04" },
      { id: "c8", type: "Nonprofit Mgmt Cert", issuer: "Duke", status: "expired", expiry: "2023-06-01" },
      { id: "c8b", type: "FEMA IS-700", issuer: "FEMA", status: "verified", expiry: "2028-02-12", verifiedBy: "FEMA", verifiedOn: "2025-02-12" },
    ],
    skills: [
      { name: "Strategy", level: 4, source: "self" },
      { name: "Incident Command", level: 4, source: "credential", credential: "FEMA ICS-300" },
      { name: "Grant Writing", level: 3, source: "org" },
      { name: "Public Speaking", level: 4, source: "self" },
    ],
    history: [
      { id: "ah1", kind: "case", title: "Authorized SOS Case participation — U-204", disaster: "Helene", status: { label: "Active", tone: "blue" }, date: "2026-03-12", link: { caseId: "U-204" } },
      { id: "ah2", kind: "report", title: "Quarterly board impact report", disaster: "Helene", status: { label: "Logged", tone: "yellow" }, date: "2026-02-28" },
      { id: "ah3", kind: "resource", title: "Secured $80K rapid-response grant", disaster: "Helene", status: { label: "Closed", tone: "green" }, date: "2024-11-22" },
    ],
  },
  {
    id: "sara-lopez",
    name: "Sara Lopez",
    org: { id: "blueridge-mutual", name: "Blue Ridge Mutual Aid" },
    role: "Outreach Coordinator",
    sosScore: 67,
    scoreBreakdown: { community: 28, impact: 28, readiness: 11 },
    county: "Avery",
    phoneMask: "(828) ***-4488",
    email: "s.lopez@blueridgemutual.org",
    housingStatus: "Stable",
    credentials: [
      { id: "sc1", type: "Mental Health First Aid", issuer: "MHFA USA", status: "verified", expiry: "2026-09-30", verifiedBy: "Mountain Medics", verifiedOn: "2023-09-30" },
      { id: "sc2", type: "Spanish/English Interpreter", issuer: "CCHI", status: "pending" },
    ],
    skills: [
      { name: "Community Outreach", level: 3, source: "org" },
      { name: "Spanish (fluent)", level: 4, source: "self" },
      { name: "Conflict De-escalation", level: 3, source: "credential", credential: "Mental Health First Aid" },
    ],
    history: [
      { id: "sh1", kind: "request", title: "Door-to-door intake — Marcus H. household", disaster: "Helene", status: { label: "Fulfilled", tone: "green" }, date: "2026-03-12", link: { caseId: "U-204" } },
      { id: "sh2", kind: "resource", title: "Ran community town hall — Avery County", disaster: "Helene", status: { label: "Logged", tone: "yellow" }, date: "2026-02-18" },
    ],
  },
  {
    id: "kim-nguyen",
    name: "Kim Nguyen",
    org: { id: "wnc-foodbank", name: "WNC Food Bank" },
    role: "Warehouse Manager",
    sosScore: 76,
    scoreBreakdown: { community: 30, impact: 34, readiness: 12 },
    county: "Henderson",
    phoneMask: "(828) ***-1029",
    email: "k.nguyen@wncfoodbank.org",
    housingStatus: "Stable",
    credentials: [
      { id: "kc1", type: "OSHA 30-Hour General", issuer: "OSHA", status: "verified", expiry: "2027-04-15", verifiedBy: "WNC Food Bank", verifiedOn: "2024-04-15" },
      { id: "kc2", type: "Forklift Operator", issuer: "NSC", status: "verified", expiry: "2026-06-01", verifiedBy: "WNC Food Bank", verifiedOn: "2024-06-01" },
      { id: "kc3", type: "ServSafe Manager", issuer: "NRA", status: "verified", expiry: "2028-01-20", verifiedBy: "WNC Food Bank", verifiedOn: "2025-01-20" },
    ],
    skills: [
      { name: "Inventory", level: 4, source: "org" },
      { name: "Forklift", level: 4, source: "credential", credential: "Forklift Operator" },
      { name: "Vietnamese (fluent)", level: 4, source: "self" },
      { name: "Cold-chain Logistics", level: 3, source: "org" },
    ],
    history: [
      { id: "kh1", kind: "resource", title: "Restocked 412 food boxes", disaster: "Helene", status: { label: "Deployed", tone: "blue" }, date: "2026-03-09" },
      { id: "kh2", kind: "report", title: "Hickory hub capacity report", disaster: "Helene", status: { label: "Logged", tone: "yellow" }, date: "2026-03-05" },
      { id: "kh3", kind: "resource", title: "Staged 18 pallets bottled water", disaster: "Burke flooding", status: { label: "Available", tone: "green" }, date: "2026-03-07" },
    ],
  },
];

export const allCredentials: (Credential & { person: string; personId: string })[] = people.flatMap((p) =>
  p.credentials.map((c) => ({ ...c, person: p.name, personId: p.id }))
);

export function avatarColor(name: string): string {
  const palette = ["#EF4E4B", "#89CFF0", "#89CFF0", "#89CFF0", "#34D399", "#EF4E4B", "#89CFF0"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % palette.length;
  return palette[h];
}

export function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}
