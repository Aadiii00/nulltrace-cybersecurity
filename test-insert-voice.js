const { createServerClient } = require('@supabase/ssr');
const fs = require('fs');

if (fs.existsSync('.env.local')) {
  const env = fs.readFileSync('.env.local', 'utf8');
  env.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      process.env[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
  });
}

async function checkTable() {
  const stubCookies = {
    getAll: () => [],
    setAll: () => {}
  };

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: stubCookies }
  );

  console.log('Testing inserting into voice_detector_scans...');
  const { data, error } = await supabase.from('voice_detector_scans').insert({
    voice_type: 'Human Voice',
    confidence: 99.9,
    spoof_probability: 0.001,
    risk_level: 'LOW',
    summary: 'Test insert',
    file_name: 'test.wav'
  });

  if (error) {
    console.log('Error inserting:', error.message, 'Code:', error.code);
  } else {
    console.log('Insert succeeded! Table exists.');
  }
}

checkTable();
