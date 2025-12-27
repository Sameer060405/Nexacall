import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import { connectToSocket } from "./controllers/socketManager.js";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
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
app.use("/api/v1/auth", authRoutes);

const start = async () => {
    const isProd = process.env.NODE_ENV === 'production';
    const uri = isProd ? process.env.MONGODB_URI : 'mongodb://127.0.0.1:27017/livelink_dev';
    try {
        const connectionDb = await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
        console.log(`ENV: ${process.env.NODE_ENV || 'development'} | Mongo Host: ${connectionDb.connection.host}`)
    } catch (err) {
        if (!isProd) {
            console.warn(`Local MongoDB not available at mongodb://127.0.0.1:27017/livelink_dev. Starting in-memory MongoDB...`);
            const mongod = await MongoMemoryServer.create();
            const memUri = mongod.getUri();
            const connectionDb = await mongoose.connect(memUri);
            console.log(`In-memory Mongo started. Host: ${connectionDb.connection.host}`);
        } else {
            throw err;
        }
    }
    server.listen(app.get("port"), () => {
        console.log("LISTENIN ON PORT 8000")
    });



}



start();