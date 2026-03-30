/**
 * Seeded demo data for admin preview of citizen experience.
 * Used when ?admin=true is present — shows a realistic, populated state.
 */

import type { Alert, SOSScore, CommunityMessage, ExternalResource } from './citizen-api';

export const DEMO_ALERTS: Alert[] = [
  {
    id: 'demo-alert-1',
    type: 'weather',
    severity: 'moderate',
    headline: 'Flood Watch until Thursday 6pm',
    description: '3-5 inches of rain expected over the next 48 hours. River Road historically floods at 2 inches.',
    area: 'Buncombe County, NC',
    expires: new Date(Date.now() + 172800000).toISOString(),
  },
  {
    id: 'demo-alert-2',
    type: 'weather',
    severity: 'minor',
    headline: 'Wind Advisory — gusts to 45mph',
    description: 'Strong winds possible through Wednesday evening. Secure loose outdoor items.',
    area: 'Western NC Mountains',
    expires: new Date(Date.now() + 86400000).toISOString(),
  },
];

export const DEMO_SCORE: SOSScore = {
  total: 45,
  readiness: 22,
  community: 13,
  impact: 10,
  readiness_max: 40,
  community_max: 30,
  impact_max: 30,
  next_action: 'Set your evacuation route',
  next_points: 10,
  checklist: {
    contact1: true,
    contact2: true,
    location: true,
    risk: true,
    evacuation: false,
    gobag: false,
    petplan: false,
    insurance: false,
  },
};

export const DEMO_COMMUNITY: { messages: CommunityMessage[]; memberCount: number; helperCount: number } = {
  messages: [
    {
      id: 'demo-msg-1',
      person_id: 'demo-person-sarah',
      message_text: 'Flooding on 19 West! Water is about 2ft on the road. Don\'t drive through.',
      message_type: 'report',
      photo_url: null,
      created_at: new Date(Date.now() - 120000).toISOString(), // 2 min ago
    },
    {
      id: 'demo-msg-2',
      person_id: 'demo-person-mike',
      message_text: 'Anyone have sandbags? Home Depot is sold out',
      message_type: 'chat',
      photo_url: null,
      created_at: new Date(Date.now() - 480000).toISOString(), // 8 min ago
    },
  ],
  memberCount: 47,
  helperCount: 12,
};

export const DEMO_PARTNERS = [
  { id: 'demo-erv', name: 'Emergency RV', org_type: 'transport_housing', latitude: 35.601, longitude: -82.554 },
  { id: 'demo-fhm', name: 'Free Hot Meals', org_type: 'food_service', latitude: 35.588, longitude: -82.567 },
  { id: 'demo-aa', name: 'Aid Arena', org_type: 'coordination', latitude: 35.610, longitude: -82.540 },
];

export const DEMO_EXTERNAL_RESOURCES: ExternalResource[] = [
  { id: 'demo-211-1', organization_name: 'Crisis Assistance Ministry', service_name: 'Utility Assistance', description: 'Emergency utility payments for low-income households', category: 'utilities', latitude: 35.585, longitude: -82.560, address: '110 Tunnel Rd, Asheville', phone: '828-555-0101', hours_description: 'M-F 9am-4pm', distance_km: 1.2 },
  { id: 'demo-211-2', organization_name: 'ABCCM', service_name: 'Emergency Shelter', description: 'Shelter for individuals and families experiencing homelessness', category: 'shelter', latitude: 35.592, longitude: -82.548, address: '32 Patton Ave, Asheville', phone: '828-555-0102', hours_description: 'Open 24/7', distance_km: 0.8 },
  { id: 'demo-211-3', organization_name: 'MANNA FoodBank', service_name: 'Food Distribution', description: 'Weekly food distribution boxes for families in need', category: 'food', latitude: 35.578, longitude: -82.572, address: '627 Swannanoa River Rd', phone: '828-555-0103', hours_description: 'Tu-Th 10am-2pm', distance_km: 2.1 },
  { id: 'demo-211-4', organization_name: 'Homeward Bound', service_name: 'Transitional Housing', description: 'Housing assistance and case management', category: 'shelter', latitude: 35.604, longitude: -82.530, address: '100 N French Broad Ave', phone: '828-555-0104', hours_description: 'M-F 8am-5pm', distance_km: 3.4 },
];

export const DEMO_COMMUNITY_MESSAGES_FULL: Array<CommunityMessage & { flagged?: boolean; photo_analysis?: any }> = [
  { id: 'demo-full-1', person_id: 'demo-sarah', message_text: 'Flooding on 19 West! Water is about 2ft on the road. Don\'t drive through.', message_type: 'report', photo_url: null, created_at: new Date(Date.now() - 120000).toISOString() },
  { id: 'demo-full-2', person_id: 'demo-mike', message_text: 'Anyone have sandbags? Home Depot is sold out', message_type: 'chat', photo_url: null, created_at: new Date(Date.now() - 480000).toISOString() },
  { id: 'demo-full-3', person_id: 'demo-agent', message_text: 'I see flooding reports near you. 3 shelter partners are active within 5 miles. Need help? Tap "I Need Help" below.', message_type: 'agent_response', photo_url: null, created_at: new Date(Date.now() - 90000).toISOString() },
  { id: 'demo-full-4', person_id: 'demo-tom', message_text: 'I have 50 sandbags at my place near downtown. @SOS add this as a resource', message_type: 'report', photo_url: null, created_at: new Date(Date.now() - 600000).toISOString() },
  { id: 'demo-full-5', person_id: 'demo-agent', message_text: 'Added: 50 sandbags available from Tom near downtown. Matching to nearby requests.', message_type: 'agent_response', photo_url: null, created_at: new Date(Date.now() - 540000).toISOString() },
  { id: 'demo-full-6', person_id: 'demo-jane', message_text: 'Power is out on Merrimon Ave from Chestnut to Weaver. Duke says 4 hours.', message_type: 'chat', photo_url: null, created_at: new Date(Date.now() - 1800000).toISOString() },
  { id: 'demo-full-7', person_id: 'demo-carlos', message_text: 'Community kitchen at First Baptist tonight 6pm. Hot meals for anyone who needs them 🍲', message_type: 'chat', photo_url: null, created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'demo-full-8', person_id: 'demo-lisa', message_text: 'Saw a tree down blocking Beaverdam Rd. Be careful!', message_type: 'report', photo_url: null, created_at: new Date(Date.now() - 5400000).toISOString() },
];
