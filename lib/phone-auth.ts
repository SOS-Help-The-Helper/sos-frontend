/**
 * Phone authentication for citizens.
 * Uses Supabase phone OTP — no Clerk dependency.
 * Phone number = identity. SHA-256 hashed for dedup.
 */

import { supabase } from '@/lib/supabase-client';

export async function sendOTP(phone: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function verifyOTP(phone: string, token: string): Promise<{ success: boolean; personId?: string; error?: string }> {
  const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
  if (error) return { success: false, error: error.message };

  // Ensure person record exists
  const userId = data.user?.id;
  if (!userId) return { success: false, error: 'No user returned' };

  // Check for existing person record
  const { data: existing } = await supabase
    .from('persons')
    .select('id')
    .eq('auth_user_id', userId)
    .single();

  if (existing) {
    return { success: true, personId: existing.id };
  }

  // Cross-channel merge: check if person exists by phone (created via SMS/partner)
  const e164 = formatPhoneE164(phone);
  const { data: byPhone } = await supabase
    .from('persons')
    .select('id')
    .eq('phone', e164)
    .maybeSingle();

  if (byPhone) {
    // Link auth to existing person from another channel
    await supabase.from('persons').update({ auth_user_id: userId, phone_hash: await hashPhone(phone) }).eq('id', byPhone.id);
    return { success: true, personId: byPhone.id };
  }

  // Create new person record
  const { data: newPerson, error: createError } = await supabase
    .from('persons')
    .insert({
      auth_user_id: userId,
      phone: formatPhoneE164(phone),
      phone_hash: await hashPhone(phone),
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (createError) return { success: false, error: createError.message };
  return { success: true, personId: newPerson.id };
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function signOut() {
  await supabase.auth.signOut();
}

function formatPhoneE164(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.startsWith('1') && digits.length === 11) return '+' + digits;
  if (input.startsWith('+')) return input;
  return '+1' + digits;
}

async function hashPhone(phone: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(phone.replace(/\D/g, ''));
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}
