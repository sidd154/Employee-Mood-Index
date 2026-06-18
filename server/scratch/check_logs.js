const { Client } = require('pg');

const connectionString = 'postgresql://postgres.nkfivxdfhyvwchlzxwcu:221001154%40Siddhanth@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true';

async function run() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected.');

    const emailLogs = await client.query('SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 10');
    console.log('\n--- EMAIL LOGS ---');
    emailLogs.rows.forEach(log => {
      console.log(`Recipient: ${log.recipient}, Type: ${log.email_type}, Status: ${log.status}, Error: ${log.error}, Sent At: ${log.sent_at.toISOString()}`);
    });

    const auditLogs = await client.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 15');
    console.log('\n--- AUDIT LOGS ---');
    auditLogs.rows.forEach(log => {
      console.log(`Action: ${log.action}, Details: ${JSON.stringify(log.details)}, Created At: ${log.created_at.toISOString()}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
