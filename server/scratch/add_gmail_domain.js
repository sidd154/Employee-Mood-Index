const { Client } = require('pg');

const connectionString = 'postgresql://postgres.nkfivxdfhyvwchlzxwcu:221001154%40Siddhanth@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true';

async function run() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected to database.');

    // Check if domain exists
    const checkRes = await client.query("SELECT 1 FROM allowed_domains WHERE domain = 'gmail.com'");
    if (checkRes.rows.length === 0) {
      await client.query("INSERT INTO allowed_domains (domain) VALUES ('gmail.com')");
      console.log("Successfully inserted 'gmail.com' into allowed_domains.");
    } else {
      console.log("'gmail.com' is already in allowed_domains.");
    }
  } catch (err) {
    console.error('Error running query:', err);
  } finally {
    await client.end();
  }
}

run();
