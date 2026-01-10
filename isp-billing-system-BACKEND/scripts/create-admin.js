const { Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('../models/user');

async function createAdmin() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();
        console.log('Database connected.');

        const adminData = {
            firstName: 'Warren',
            lastName: 'Chris',
            email: 'warrenchris745@gmail.com',
            password: 'R@ycee_11',
            role: 'admin',
            phoneNumber: '+254700000000', // Dummy number, required by model
            isActive: true,
            isVerified: true
        };

        // check if user exists
        const existingUser = await User.findOne({ where: { email: adminData.email } });
        if (existingUser) {
            console.log('User already exists. Updating role and password...');
            existingUser.role = 'admin';
            existingUser.password = adminData.password; // Hook will re-hash
            await existingUser.save();
            console.log('User updated successfully.');
        } else {
            console.log('Creating new admin user...');
            await User.create(adminData);
            console.log('Admin user created successfully.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error creating admin user:', error);
        process.exit(1);
    }
}

createAdmin();
