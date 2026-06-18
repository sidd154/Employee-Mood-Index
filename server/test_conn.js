const { Client } = require('pg');

const regions = [
  'ap-south-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-northeast-3',
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'eu-central-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-north-1',
  'sa-east-1',
  'ca-central-1',
  'me-central-1',
  'af-south-1'
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
  console.log('Starting comprehensive Supabase region test...');
  for (const region of regions) {
    const ok = await testRegion(region);
    if (ok) {
      console.log(`\nFound correct region: ${region}`);
      process.exit(0);
    }
  }
  console.log('\nCould not connect to any tested region.');
  process.exit(1);
}

run();
