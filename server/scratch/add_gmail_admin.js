const { Client } = require('pg');

const connectionString = 'postgresql://postgres.nkfivxdfhyvwchlzxwcu:221001154%40Siddhanth@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true';

async function run() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected to database.');

    // Get super admin role ID
    const roleRes = await client.query("SELECT id FROM roles WHERE name = 'super_admin'");
    if (roleRes.rows.length === 0) {
      throw new Error("super_admin role not found");
    }
    const superAdminRoleId = roleRes.rows[0].id;

    // Check if user exists
    const email = 'siddhanthsrinivasan@gmail.com';
    const userRes = await client.query("SELECT id FROM users WHERE LOWER(email) = $1", [email]);
    if (userRes.rows.length === 0) {
      // Create user
      await client.query(
        "INSERT INTO users (email, role_id, full_name) VALUES ($1, $2, $3)",
        [email, superAdminRoleId, 'Siddhanth Srinivasan']
      );
      console.log(`Created new super_admin user for ${email}`);
    } else {
      // Update role to super_admin
      await client.query(
        "UPDATE users SET role_id = $1, full_name = COALESCE(full_name, 'Siddhanth Srinivasan') WHERE LOWER(email) = $2",
        [superAdminRoleId, email]
      );
      console.log(`Updated user ${email} to super_admin`);
    }
  } catch (err) {
    console.error('Error running script:', err);
  } finally {
    await client.end();
  }
}

run();
