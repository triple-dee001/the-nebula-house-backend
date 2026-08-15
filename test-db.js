require('dotenv').config();
const { Client } = require('pg');

async function main() {
  console.log('Testing connection to:', process.env.DATABASE_URL);
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Successfully connected directly with pg driver!');
    const res = await client.query('SELECT NOW()');
    console.log('Result:', res.rows[0]);
  } catch (err) {
    console.error('Direct connection failed:', err);
  } finally {
    await client.end();
  }
}

main();
