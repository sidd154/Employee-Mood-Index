const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('Error: DATABASE_URL is not set in environment.');
  process.exit(1);
}

async function run() {
  console.log('Connecting to database to run migrations...');
  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    console.log('Connected successfully. Initializing database schema...');

    // 1. Read and run schema.sql
    const schemaPath = path.join(__dirname, '../supabase/migrations/20260610000000_schema.sql');
    console.log(`Executing schema: ${schemaPath}`);
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await client.query(schemaSql);
    console.log('Schema created successfully.');

    // 2. Read and run seed.sql
    const seedPath = path.join(__dirname, '../supabase/seed.sql');
    console.log(`Executing base seeds: ${seedPath}`);
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    await client.query(seedSql);
    console.log('Base configurations seeded successfully.');

    // 3. Read and run demo_seed.sql
    const demoSeedPath = path.join(__dirname, '../supabase/demo_seed.sql');
    console.log(`Executing demo timeline seeds: ${demoSeedPath}`);
    const demoSeedSql = fs.readFileSync(demoSeedPath, 'utf8');
    await client.query(demoSeedSql);
    console.log('30-day wellbeing histories seeded successfully.');

    console.log('\nMigration and seeding completed successfully!');
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('\nMigration failed with error:', err.message);
    await client.end();
    process.exit(1);
  }
}

run();
