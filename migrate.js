const pool = require('./db');

async function renameAdminColumn() {
  try {
    const result = await pool.query(`ALTER TABLE admins RENAME COLUMN username TO email`);
    console.log('✅ Renamed "username" to "email" in admins table');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await pool.end(); // close connection
  }
}

renameAdminColumn();
