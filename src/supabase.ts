import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://drjrbssoupkaeadzdvlr.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyanJic3NvdXBrYWVhZHpkdmxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MzA1MzgsImV4cCI6MjA4ODEwNjUzOH0.fjsTLHUzPLd28zIWLdjDlgqeyzbn11008daOB6izsOE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
