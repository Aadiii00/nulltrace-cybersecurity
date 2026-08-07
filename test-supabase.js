const { createServerClient } = require('@supabase/ssr');
require('dotenv').config({ path: '.env.local' });

async function test() {
  try {
    console.log('Testing Supabase Client Creation...');
    console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    
    // Stub cookies for test
    const stubCookies = {
      getAll: () => [],
      setAll: () => {}
    };

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: stubCookies }
    );

    console.log('Attempting to fetch session...');
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    console.log('Session fetched successfully (or empty if no session).');

    console.log('Attempting to query scans table...');
    const { data: scans, error: scansError } = await supabase.from('scans').select('*').limit(1);
    if (scansError) throw scansError;
    console.log('Successfully queried scans table. Data:', scans);

    process.exit(0);
  } catch (err) {
    console.error('TEST FAILED:', err);
    process.exit(1);
  }
}

test();
