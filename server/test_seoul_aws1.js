const { Client } = require('pg');

async function run() {
  console.log('Testing connection to [ap-northeast-2] on aws-1...');
  const connectionString = 'postgresql://postgres.nkfivxdfhyvwchlzxwcu:221001154%40Siddhanth@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true';
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    console.log('SUCCESS: Successfully connected to Supabase in Seoul via aws-1 pooler!');
    const res = await client.query('SELECT now()');
    console.log('Database time:', res.rows[0].now);
    await client.end();
  } catch (err) {
    console.log('FAILED to connect:', err.message);
  }
}

run();
