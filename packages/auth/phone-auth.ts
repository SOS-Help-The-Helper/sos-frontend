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

  // Create new person record
  const { data: newPerson, error: createError } = await supabase
    .from('persons')
    .insert({
      auth_user_id: userId,
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

async function hashPhone(phone: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(phone.replace(/\D/g, ''));
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}
