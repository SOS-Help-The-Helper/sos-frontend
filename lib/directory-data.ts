// Directory-specific data with richer person/org shapes for the Directory module.

export type DirectoryPerson = {
  id: string;
  name: string;
  role: string;
  org: { id: string; name: string };
  county: string;
  skills: { name: string }[];
  credentials: { type: string }[];
  sosScore: number;
};

export type DirectoryOrg = {
  id: string;
  name: string;
  type: string;
  counties: string[];
  memberCount: number;
  activeCases: number;
};

export const people: DirectoryPerson[] = [
  {
    id: "maria-rodriguez",
    name: "Maria Rodriguez",
    role: "Coordinator",
    org: { id: "emergency-rv", name: "Emergency RV" },
    county: "Buncombe",
    skills: [{ name: "Case Management" }, { name: "Logistics" }],
    credentials: [{ type: "FEMA IS-100" }, { type: "Red Cross Shelter" }],
    sosScore: 92,
  },
  {
    id: "james-bell",
    name: "James Bell",
    role: "Driver",
    org: { id: "blue-ridge", name: "Blue Ridge Mutual Aid" },
    county: "Madison",
    skills: [{ name: "Logistics" }],
    credentials: [{ type: "CDL Class A" }],
    sosScore: 74,
  },
  {
    id: "alicia-ng",
    name: "Alicia Ng",
    role: "Nurse",
    org: { id: "mountain-area-aid", name: "Mountain Area Aid" },
    county: "Burke",
    skills: [{ name: "First Aid" }],
    credentials: [{ type: "Wilderness First Aid" }],
    sosScore: 88,
  },
  {
    id: "sara-whitley",
    name: "Sara Whitley",
    role: "Volunteer",
    org: { id: "wnc-food", name: "WNC Food Bank" },
    county: "Henderson",
    skills: [{ name: "Kitchen Ops" }],
    credentials: [{ type: "Food Handler" }],
    sosScore: 61,
  },
  {
    id: "derek-pope",
    name: "Derek Pope",
    role: "Director",
    org: { id: "blue-ridge", name: "Blue Ridge Mutual Aid" },
    county: "Buncombe",
    skills: [{ name: "Case Management" }, { name: "Logistics" }],
    credentials: [{ type: "FEMA IS-100" }],
    sosScore: 95,
  },
  {
    id: "elena-cho",
    name: "Elena Cho",
    role: "Case Manager",
    org: { id: "emergency-rv", name: "Emergency RV" },
    county: "Buncombe",
    skills: [{ name: "Case Management" }, { name: "Spanish" }],
    credentials: [{ type: "FEMA IS-100" }],
    sosScore: 83,
  },
  {
    id: "ben-okafor",
    name: "Ben Okafor",
    role: "Logistics",
    org: { id: "wnc-food", name: "WNC Food Bank" },
    county: "Catawba",
    skills: [{ name: "Logistics" }],
    credentials: [],
    sosScore: 70,
  },
];

export const orgs: DirectoryOrg[] = [
  {
    id: "emergency-rv",
    name: "Emergency RV",
    type: "Housing Provider",
    counties: ["Buncombe", "Henderson"],
    memberCount: 14,
    activeCases: 6,
  },
  {
    id: "blue-ridge",
    name: "Blue Ridge Mutual Aid",
    type: "Mutual Aid",
    counties: ["Buncombe", "Madison", "McDowell"],
    memberCount: 32,
    activeCases: 11,
  },
  {
    id: "wnc-food",
    name: "WNC Food Bank",
    type: "Food Distribution",
    counties: ["Buncombe", "Henderson", "Catawba", "Burke"],
    memberCount: 48,
    activeCases: 4,
  },
  {
    id: "mountain-area-aid",
    name: "Mountain Area Aid",
    type: "Multi-Service",
    counties: ["Burke", "McDowell"],
    memberCount: 9,
    activeCases: 3,
  },
];
