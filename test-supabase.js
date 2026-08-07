const { createServerClient } = require('@supabase/ssr');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
env.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    process.env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

async function test() {
  try {
    console.log('Testing Supabase Client Creation...');
    console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    
    const stubCookies = {
      getAll: () => [],
      setAll: () => {}
    };

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: stubCookies }
    );

    console.log('Attempting to query table info...');
    // We can run an RPC or raw query, but wait, raw select from information_schema is restricted unless using service role.
    // Let's try selecting a non-existent column to see if it lists columns in the error, or query an insert with all columns.
    // Or we can try to query a RPC or just look at the error of a bad select.
    const { data, error } = await supabase.from('scans').select('non_existent_column');
    console.log('Error from bad select:', error);

    process.exit(0);
  } catch (err) {
    console.error('TEST FAILED:', err);
    process.exit(1);
  }
}

test();
