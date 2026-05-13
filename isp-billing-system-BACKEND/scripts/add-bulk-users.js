const { sequelize } = require('../src/config/database');
const User = require('../src/models/User');

async function addBulkUsers() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();
        console.log('Database connected.');

        const basePassword = 'R@ycee_11';
        const usersToCreate = [];

        // Generate 20 users with unique emails and phone numbers
        for (let i = 1; i <= 20; i++) {
            const userNum = String(i).padStart(2, '0');
            usersToCreate.push({
                firstName: `Customer`,
                lastName: `User${userNum}`,
                email: `customer.user${userNum}@ispbilling.com`,
                phoneNumber: `+254710${String(100000 + i).padStart(6, '0')}`,
                password: basePassword,
                role: 'customer',
                isActive: true,
                isVerified: true
            });
        }

        console.log(`Creating ${usersToCreate.length} users...`);
        
        let createdCount = 0;
        let skippedCount = 0;

        for (const userData of usersToCreate) {
            try {
                const existingUser = await User.findOne({ where: { email: userData.email } });
                if (existingUser) {
                    console.log(`Skipped: User with email ${userData.email} already exists`);
                    skippedCount++;
                } else {
                    await User.create(userData);
                    console.log(`Created: ${userData.firstName} ${userData.lastName} (${userData.email})`);
                    createdCount++;
                }
            } catch (error) {
                if (error.name === 'SequelizeUniqueConstraintError') {
                    console.log(`Skipped: Duplicate entry - ${error.errors[0].path}`);
                    skippedCount++;
                } else {
                    console.error(`Error creating user ${userData.email}:`, error.message);
                }
            }
        }

        console.log(`\n✓ Process completed:`);
        console.log(`  - Created: ${createdCount} users`);
        console.log(`  - Skipped: ${skippedCount} users`);
        console.log(`  - Password for all users: ${basePassword}`);

        process.exit(0);
    } catch (error) {
        console.error('Error creating bulk users:', error);
        process.exit(1);
    }
}

addBulkUsers();
