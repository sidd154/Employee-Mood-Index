const { Client } = require('pg');

const regions = [
  'ap-south-1',
  'ap-southeast-1',
  'us-east-1',
  'us-east-2',
  'us-west-2',
  'eu-central-1',
  'eu-west-2'
];

async function testRegion(region) {
  const connectionString = `postgresql://postgres.nkfivxdfhyvwchlzxwcu:221001154%40Siddhanth@aws-1-${region}.pooler.supabase.com:6543/postgres?pgbouncer=true`;
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 4000,
  });

  try {
    await client.connect();
    console.log(`SUCCESS: Connected to region [${region}] on aws-1`);
    await client.end();
    return true;
  } catch (err) {
    console.log(`FAILED: Region [${region}] on aws-1 - Error: ${err.message}`);
    return false;
  }
}

async function run() {
  console.log('Testing aws-1 poolers...');
  for (const region of regions) {
    const ok = await testRegion(region);
    if (ok) {
      console.log(`\nFound correct pooler: aws-1-${region}`);
      process.exit(0);
    }
  }
  process.exit(1);
}

run();
