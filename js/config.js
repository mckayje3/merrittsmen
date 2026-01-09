// Supabase Configuration
const SUPABASE_URL = 'https://uhxadmflnvigbbbiysef.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoeGFkbWZsbnZpZ2JiYml5c2VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4ODc0NzYsImV4cCI6MjA4MzQ2MzQ3Nn0.H7fu-CwzwJXVxtgu4dAkdAlG6jLUl7IDZxl10zkItAs';

// Initialize Supabase client
if (typeof window.supabase === 'undefined') {
    console.error('Supabase library not loaded. Check your internet connection.');
    alert('Failed to load required libraries. Please refresh the page.');
} else {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
