const { Client } = require('pg');

const regions = [
  'ap-south-2',
  'ap-southeast-3',
  'eu-central-2'
];

async function testRegion(region) {
  const connectionString = `postgresql://postgres.nkfivxdfhyvwchlzxwcu:221001154%40Siddhanth@aws-0-${region}.pooler.supabase.com:6543/postgres?pgbouncer=true`;
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 4000,
  });

  try {
    await client.connect();
    console.log(`SUCCESS: Connected to region [${region}]`);
    await client.end();
    return true;
  } catch (err) {
    console.log(`FAILED: Region [${region}] - Error: ${err.message}`);
    return false;
  }
}

async function run() {
  for (const region of regions) {
    const ok = await testRegion(region);
    if (ok) {
      console.log(`\nFound correct region: ${region}`);
      process.exit(0);
    }
  }
  process.exit(1);
}

run();
