import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables");
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Get or create a user by their Clerk ID
export async function getOrCreateUser(clerkId: string, email?: string) {
  const supabase = getSupabaseAdmin();
  const { data: existingUser } = await supabase
    .from("users")
    .select("id, clerk_id, email, phone_number")
    .eq("clerk_id", clerkId)
    .single();

  if (existingUser) {
    return existingUser;
  }

  const { data: newUser, error } = await supabase
    .from("users")
    .insert({ clerk_id: clerkId, email })
    .select("id, clerk_id, email, phone_number")
    .single();

  if (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }

  return newUser;
}

// Update user's phone number
export async function updateUserPhone(clerkId: string, phoneNumber: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("users")
    .update({ phone_number: phoneNumber })
    .eq("clerk_id", clerkId)
    .select("id, clerk_id, email, phone_number")
    .single();

  if (error) {
    throw new Error(`Failed to update phone number: ${error.message}`);
  }

  return data;
}
