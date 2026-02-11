import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import { connectToSocket } from "./controllers/socketManager.js";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import meetingRoutes from "./routes/meeting.routes.js";
import invitationRoutes from "./routes/invitation.routes.js";
import 'dotenv/config';
import { MongoMemoryServer } from 'mongodb-memory-server';

const app = express();
const server = createServer(app);
const io = connectToSocket(server);


app.set("port", (process.env.PORT || 8000))
app.use(cors());
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));


app.use("/api/health", (req, res) => {
    res.json({ status: "ok" });
});

app.get("/api/health/db", (req, res) => {
    const connected = mongoose.connection.readyState === 1;
    res.json({
        status: connected ? "ok" : "disconnected",
        database: dbMode,
        message: dbMode === 'memory'
            ? "Using in-memory DB — data is not saved to Atlas. Set MONGODB_URI and fix Atlas IP whitelist to use Atlas."
            : dbMode === 'atlas'
                ? "Connected to MongoDB Atlas."
                : "Connected to database.",
    });
});

// Log all incoming requests for debugging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/meetings", meetingRoutes);
app.use("/api/v1/invitations", invitationRoutes);

// 404 handler for API routes
app.use("/api/*", (req, res) => {
    console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

let dbMode = 'unknown'; // 'atlas' | 'memory' | 'local'

const start = async () => {
    const isProd = process.env.NODE_ENV === 'production';
    const uri = process.env.MONGODB_URI || (isProd ? null : 'mongodb://127.0.0.1:27017/livelink_dev');

    if (!process.env.MONGODB_URI && !isProd) {
        console.warn('MONGODB_URI is not set in .env — create backend/.env with MONGODB_URI=your_atlas_connection_string so register/login save to Atlas.');
    }

    try {
        if (uri) {
            await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
            const host = mongoose.connection.host || '';
            if (host.includes('mongodb.net') || host.includes('atlas')) {
                dbMode = 'atlas';
                console.log('MongoDB Atlas connected. Host:', host);
            } else {
                dbMode = 'local';
                console.log('MongoDB connected (local). Host:', host);
            }
        } else {
            throw new Error('MONGODB_URI is required in production');
        }
    } catch (err) {
        if (!isProd) {
            console.warn('MongoDB connection failed:', err.message);
            console.warn('Falling back to in-memory DB. Register/login will work but data will NOT appear in Atlas and is lost on restart.');
            const mongod = await MongoMemoryServer.create();
            const memUri = mongod.getUri();
            await mongoose.connect(memUri);
            dbMode = 'memory';
            console.log('Using in-memory MongoDB. To use Atlas: set MONGODB_URI in .env and whitelist your IP in Atlas Network Access.');
        } else {
            throw err;
        }
    }
    server.listen(app.get("port"), () => {
        console.log("Listening on port", app.get("port"));
    });
}



start();