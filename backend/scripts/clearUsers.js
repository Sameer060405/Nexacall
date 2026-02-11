#!/usr/bin/env node

import mongoose from 'mongoose';
import User from '../src/models/user.model.js';
import { MongoMemoryServer } from 'mongodb-memory-server';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './.env' });

async function clearUsers() {
    try {
        // Connect to MongoDB using the same logic as app.js
        const isProd = process.env.NODE_ENV === 'production';
        const uri = process.env.MONGODB_URI || (isProd ? null : (process.env.MONGODB_URI_LOCAL || 'mongodb://127.0.0.1:27017/nexacall_dev'));

        console.log('Connecting to database...');

        try {
            await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
            console.log(`ENV: ${process.env.NODE_ENV || 'development'} | Mongo connected.`);
        } catch (err) {
            if (!isProd) {
                console.warn(`Local MongoDB not available at ${localUri}. Starting in-memory MongoDB...`);
                const mongod = await MongoMemoryServer.create();
                const memUri = mongod.getUri();
                await mongoose.connect(memUri);
                console.log('In-memory Mongo started.');
            } else {
                throw err;
            }
        }

        const result = await User.deleteMany({});
        const deletedCount = result.deletedCount;

        console.log(`\nDeleted ${deletedCount} user(s) from the database.`);
        if (deletedCount > 0) {
            console.log('You can now register again with any email/username without "account already exists".');
        }
        console.log('\nTo fully reset the app, log out (or clear site data / localStorage) in the browser.');

    } catch (error) {
        console.error('Error clearing users:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\nDatabase connection closed.');
    }
}

clearUsers();
