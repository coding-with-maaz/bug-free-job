const sequelize = require('../config/database');

async function dropAllTables() {
  try {
    console.log('Dropping and recreating all tables...');
    
    // Disable foreign key checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    
    // Start transaction
    await sequelize.transaction(async (transaction) => {
      // Drop tables in correct order (child tables first)
      const tables = [
        'saved_jobs',
        'applications',
        'jobs',
        'categories',
        'users',
        'SequelizeMeta'
      ];

      for (const table of tables) {
        console.log(`Dropping table: ${table}`);
        await sequelize.query(`DROP TABLE IF EXISTS \`${table}\``, { transaction });
      }
    });

    // Re-enable foreign key checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log('All tables dropped successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error dropping tables:', error);
    // Try to re-enable foreign key checks even if there was an error
    try {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    } catch (e) {
      console.error('Error re-enabling foreign key checks:', e);
    }
    process.exit(1);
  }
}

// Handle any uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

dropAllTables(); 