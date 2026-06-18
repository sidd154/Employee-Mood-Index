const { Client } = require('pg');

const connectionString = 'postgresql://postgres.nkfivxdfhyvwchlzxwcu:221001154%40Siddhanth@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true';

async function run() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected.');

    const timeRes = await client.query('SELECT NOW() as db_now, CURRENT_TIMESTAMP as db_ts');
    console.log('Database time:', timeRes.rows[0]);

    console.log('Server time (JS):', new Date().toISOString());

    const otpRes = await client.query('SELECT * FROM otp_codes ORDER BY created_at DESC LIMIT 5');
    console.log('Recent OTPs:');
    otpRes.rows.forEach(otp => {
      console.log(`Email: ${otp.email}, Code: ${otp.code}, Expires At: ${otp.expires_at.toISOString()}, Verified: ${otp.verified}, Created At: ${otp.created_at.toISOString()}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
