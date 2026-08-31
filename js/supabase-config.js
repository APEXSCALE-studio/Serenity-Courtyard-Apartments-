// Serenity Courtyard Apartments — Supabase client
// Demo project. Public anon key only — safe for client-side use (RLS enforced).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const SUPABASE_URL = 'https://cxznegvtrbeytljufycj.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4em5lZ3Z0cmJleXRsanVmeWNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzNzczMDgsImV4cCI6MjEwMDk1MzMwOH0.MsJBgP7la7blyn-aL2ppY1kGKGh87U99ZDKiHRalRgM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
