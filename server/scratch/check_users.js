const { Client } = require('pg');

const connectionString = 'postgresql://postgres.nkfivxdfhyvwchlzxwcu:221001154%40Siddhanth@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true';

async function run() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected.');

    const res = await client.query(`
      SELECT u.id, u.email, r.name as role_name, u.full_name 
      FROM users u
      JOIN roles r ON u.role_id = r.id
      ORDER BY u.created_at DESC
    `);
    
    console.log('Registered Users:');
    res.rows.forEach(user => {
      console.log(`Email: ${user.email}, Role: ${user.role_name}, Name: ${user.full_name}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
