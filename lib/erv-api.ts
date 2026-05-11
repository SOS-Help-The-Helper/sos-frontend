export const ERV_URL = process.env.NEXT_PUBLIC_ERV_SUPABASE_URL || '';
export const ERV_HEADERS = {
  'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ERV_ANON_KEY || ''}`,
  'x-partner-key': process.env.NEXT_PUBLIC_ERV_PARTNER_KEY || '',
  'Content-Type': 'application/json',
};
