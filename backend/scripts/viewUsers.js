#!/usr/bin/env node

import mongoose from 'mongoose';
import User from '../src/models/user.model.js';
import { MongoMemoryServer } from 'mongodb-memory-server';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './.env' });

async function viewUsers() {
    try {
        // Connect to MongoDB using the same logic as app.js
        const isProd = process.env.NODE_ENV === 'production';
        const localUri = process.env.MONGODB_URI_LOCAL || 'mongodb://127.0.0.1:27017/livelink_dev';
        const uri = isProd ? process.env.MONGODB_URI : localUri;
        
        console.log('Connecting to database...');
        
        let connectionDb;
        try {
            connectionDb = await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
            console.log(`ENV: ${process.env.NODE_ENV || 'development'} | Mongo Host: ${connectionDb.connection.host}`);
        } catch (err) {
            if (!isProd) {
                console.warn(`Local MongoDB not available at ${localUri}. Starting in-memory MongoDB...`);
                const mongod = await MongoMemoryServer.create();
                const memUri = mongod.getUri();
                connectionDb = await mongoose.connect(memUri);
                console.log(`In-memory Mongo started. Host: ${connectionDb.connection.host}`);
            } else {
                throw err;
            }
        }

        // Fetch all users
        const users = await User.find({}).select('-password').sort({ createdAt: -1 });
        
        console.log('\n=== USER DATA PRESENT IN DATABASE ===');
        console.log(`Total users: ${users.length}\n`);
        
        if (users.length === 0) {
            console.log('No users found in the database.');
            console.log('\nNote: This appears to be a fresh in-memory database.');
            console.log('To add users, you can:');
            console.log('1. Register new users through the frontend at http://localhost:3000');
            console.log('2. Use the /api/v1/auth/register endpoint');
            console.log('3. Use the /api/v1/auth/login endpoint');
        } else {
            users.forEach((user, index) => {
                console.log(`User ${index + 1}:`);
                console.log(`  ID: ${user._id}`);
                console.log(`  Username: ${user.username}`);
                console.log(`  Email: ${user.email}`);
                console.log(`  Role: ${user.role}`);
                console.log(`  Created: ${user.createdAt}`);
                console.log(`  Updated: ${user.updatedAt}`);
                console.log('  ---');
            });
        }

        // Display summary statistics
        const userCount = await User.countDocuments();
        const adminCount = await User.countDocuments({ role: 'admin' });
        const regularUserCount = await User.countDocuments({ role: 'user' });

        console.log('\n=== SUMMARY ===');
        console.log(`Total Users: ${userCount}`);
        console.log(`Admin Users: ${adminCount}`);
        console.log(`Regular Users: ${regularUserCount}`);

    } catch (error) {
        console.error('Error accessing database:', error.message);
    } finally {
        // Close the connection
        await mongoose.disconnect();
        console.log('\nDatabase connection closed.');
    }
}

// Run the script
viewUsers();
