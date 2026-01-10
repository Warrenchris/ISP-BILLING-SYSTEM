const { sequelize } = require('../config/database');
const User = require('../models/user');

async function checkPassword() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        const email = 'warrenchris745@gmail.com';
        const password = 'R@ycee_11';

        const user = await User.findOne({ where: { email } });
        if (!user) {
            console.log('User not found!');
            return;
        }

        console.log('User found. Checking password...');
        const isValid = await user.comparePassword(password);
        console.log(`Password match result: ${isValid}`);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkPassword();
