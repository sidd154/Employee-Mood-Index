const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;

async function clearDemoUsers() {
  console.log('Connecting to database...');
  const client = new Client({ connectionString });
  await client.connect();

  try {
    console.log('Purging all users with role "employee" (demo accounts)...');
    
    // 1. Get employee role ID
    const roleRes = await client.query("SELECT id FROM roles WHERE name = 'employee'");
    if (roleRes.rows.length === 0) {
      console.log('Employee role not found. Nothing to do.');
      return;
    }
    const employeeRoleId = roleRes.rows[0].id;

    // 2. Delete employee users
    const deleteRes = await client.query("DELETE FROM users WHERE role_id = $1", [employeeRoleId]);
    console.log(`Successfully deleted ${deleteRes.rowCount} demo employees.`);

  } catch (err) {
    console.error('Error during purge:', err);
  } finally {
    await client.end();
  }
}

clearDemoUsers();
