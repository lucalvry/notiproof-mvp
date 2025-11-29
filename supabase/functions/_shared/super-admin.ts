import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

export async function isSuperAdmin(userId: string): Promise<boolean> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { data, error } = await supabase
    .rpc('is_superadmin', { _user_id: userId });

  if (error) {
    console.error('Error checking superadmin status:', error);
    return false;
  }

  return !!data;
}
