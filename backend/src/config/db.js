const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Create PostgreSQL Pool config
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'collaboration_db',
  password: process.env.DB_PASSWORD || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
});

pool.on('connect', () => {
  console.log('Connected to the PostgreSQL database pool successfully.');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
});

// Helper for standard query executing
const query = (text, params) => pool.query(text, params);

// Initialize DB schema & default data
async function initDatabase() {
  try {
    console.log('Initializing database tables...');
    
    // Read the schema.sql file
    const sqlPath = path.join(__dirname, '..', 'models', 'schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Run schema tables query
    await pool.query(sql);
    console.log('Database tables verified/created successfully.');

    // Seed default administrator if not present
    const checkAdminQuery = `SELECT * FROM users WHERE role = 'admin' LIMIT 1`;
    const res = await pool.query(checkAdminQuery);
    
    if (res.rowCount === 0) {
      console.log('No administrator detected. Seeding default administrator...');
      const adminEmail = 'admin@collaboration.edu';
      const adminPass = 'admin123';
      const passwordHash = await bcrypt.hash(adminPass, 10);
      
      const seedAdminQuery = `
        INSERT INTO users (email, password_hash, full_name, role, role_id, institution_id, department_id, bio)
        VALUES ($1, $2, $3, $4, (SELECT id FROM user_roles WHERE role_key = 'admin'), $5, $6, $7)
      `;
      
      // Admin doesn't need to belong to specific institution/dept initially
      await pool.query(seedAdminQuery, [
        adminEmail,
        passwordHash,
        'System Administrator',
        'admin',
        null,
        null,
        'Default system administrator account created automatically.'
      ]);
      console.log('--------------------------------------------------');
      console.log(`Default Administrator Account Seeded:`);
      console.log(`Email: ${adminEmail}`);
      console.log(`Password: ${adminPass}`);
      console.log('--------------------------------------------------');
    }
  } catch (error) {
    console.error('CRITICAL: Database initialization failed!', error);
    process.exit(1);
  }
}

module.exports = {
  pool,
  query,
  initDatabase,
};
