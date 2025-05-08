const sequelize = require('../config/database');

async function showTables() {
  try {
    const [results] = await sequelize.query(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'jobs_app_db'"
    );
    console.log('Tables in database:');
    results.forEach(result => {
      console.log(result.TABLE_NAME);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

showTables(); 