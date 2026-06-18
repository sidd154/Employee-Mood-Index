const { Client } = require('pg');

async function run() {
  console.log('Testing direct connection via IPv6 IP address...');
  const connectionString = 'postgresql://postgres:221001154%40Siddhanth@[2406:da12:1f1:f802:b585:5548:484d:7dad]:5432/postgres';
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    console.log('SUCCESS: Connected directly via IPv6 IP!');
    const res = await client.query('SELECT now()');
    console.log('Server time:', res.rows[0].now);
    await client.end();
  } catch (err) {
    console.log('FAILED to connect directly:', err.message);
  }
}

run();
