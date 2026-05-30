import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
let url, key;
for(let line of env.split('\n')) {
  if(line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim().replace(/['"]/g, '');
  if(line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = line.split('=')[1].trim().replace(/['"]/g, '');
}

const supabase = createClient(url, key);
supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(1).then(({ data, error }) => {
  console.log(JSON.stringify(data, null, 2));
  console.error(error);
});
