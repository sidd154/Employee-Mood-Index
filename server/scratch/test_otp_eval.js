const { Client } = require('pg');

const connectionString = 'postgresql://postgres.nkfivxdfhyvwchlzxwcu:221001154%40Siddhanth@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true';

async function run() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected.');

    const res = await client.query(`
      SELECT 
        id, 
        email, 
        code, 
        expires_at, 
        NOW() as db_now,
        expires_at > NOW() as is_not_expired,
        verified
      FROM otp_codes 
      WHERE code = '721885'
    `);
    
    console.log(res.rows[0]);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
