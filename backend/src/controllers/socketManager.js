import { Server } from "socket.io"

// ── Video-call room state ─────────────────────────────────────────────────────
let connections = {}       // roomPath → [socketId, ...]
// ── Module-level io reference so message.controller can emit to specific users ─
let _io = null;
let messages = {}          // roomPath → [{sender, data, socket-id-sender}, ...]
let timeOnline = {}        // socketId → Date joined room
let socketToUsername = {}  // socketId → display name

// ── Presence state ────────────────────────────────────────────────────────────
// Maps authenticated user IDs to their current socket so the frontend
// can determine whether a specific NexaCall contact is reachable right now.
const onlineUserIds = {}   // userId (string) → socketId
const socketToUserId = {}  // socketId → userId (string)

// Emit an event to a specific user by their MongoDB userId.
// Called by message.controller to deliver DMs in real-time.
// Safe to call even if the user is offline — it's a no-op in that case.
export const emitToUser = (userId, event, data) => {
    if (!_io || !userId) return;
    const sid = onlineUserIds[String(userId)];
    if (sid) _io.to(sid).emit(event, data);
};

export const connectToSocket = (server) => {
    _io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
            allowedHeaders: ["*"],
            credentials: true
        }
    });
    const io = _io; // local alias so all inner io.emit / io.to calls are unchanged

    io.on("connection", (socket) => {
        console.log("Socket connected:", socket.id)

        // ── Presence: registration ─────────────────────────────────────────
        // The frontend emits this immediately after connecting, passing the
        // logged-in user's MongoDB _id so we can track them in onlineUserIds.
        socket.on("register-presence", (userId) => {
            if (!userId) return;
            const uid = String(userId);

            // If this user already has a stale socket, evict it cleanly
            const oldSid = onlineUserIds[uid];
            if (oldSid && oldSid !== socket.id) {
                delete socketToUserId[oldSid];
            }

            onlineUserIds[uid] = socket.id;
            socketToUserId[socket.id] = uid;

            // Tell every connected client that this user is now online
            io.emit("presence-update", { userId: uid, status: "online" });
        });

        // ── Presence: on-demand snapshot ──────────────────────────────────
        // Client can ask for the full list of online user IDs at any time
        // (useful when the page first loads and needs to hydrate status).
        socket.on("get-online-users", () => {
            socket.emit("online-users-list", Object.keys(onlineUserIds));
        });

        // ── Video call: join room ─────────────────────────────────────────
        socket.on("join-call", (path, username) => {
            const displayName = username && typeof username === 'string'
                ? username.trim() || 'Guest'
                : 'Guest';
            socketToUsername[socket.id] = displayName;

            if (connections[path] === undefined) {
                connections[path] = [];
            }
            if (!connections[path].includes(socket.id)) {
                connections[path].push(socket.id);
            }
            timeOnline[socket.id] = new Date();

            // Build name map so every participant can display others' names
            const roomNameMap = {};
            connections[path].forEach((sid) => {
                roomNameMap[sid] = socketToUsername[sid] || 'Guest';
            });

            for (let a = 0; a < connections[path].length; a++) {
                io.to(connections[path][a]).emit(
                    "user-joined", socket.id, connections[path], displayName, roomNameMap
                );
            }

            // Replay chat history to the new joiner
            if (messages[path] !== undefined) {
                for (let a = 0; a < messages[path].length; ++a) {
                    io.to(socket.id).emit(
                        "chat-message",
                        messages[path][a]['data'],
                        messages[path][a]['sender'],
                        messages[path][a]['socket-id-sender']
                    );
                }
            }
        })

        // ── WebRTC: peer signalling ────────────────────────────────────────
        socket.on("signal", (toId, message) => {
            io.to(toId).emit("signal", socket.id, message);
        })

        // ── Chat ──────────────────────────────────────────────────────────
        socket.on("chat-message", (data, sender) => {
            const foundEntry = Object.entries(connections)
                .find(([, roomValue]) => roomValue.includes(socket.id));

            const matchingRoom = foundEntry ? foundEntry[0] : '';
            const found = Boolean(foundEntry);

            if (found) {
                if (!messages[matchingRoom]) messages[matchingRoom] = [];

                messages[matchingRoom].push({
                    sender,
                    data,
                    "socket-id-sender": socket.id
                });

                console.log("message", matchingRoom, ":", sender, data);

                connections[matchingRoom].forEach((elem) => {
                    io.to(elem).emit("chat-message", data, sender, socket.id);
                });
            }
        });

        // ── Stickers ──────────────────────────────────────────────────────
        socket.on("sticker", (stickerId) => {
            const displayName = socketToUsername[socket.id] || 'Guest';
            const foundEntry = Object.entries(connections)
                .find(([, roomValue]) => roomValue.includes(socket.id));
            if (foundEntry) {
                const [, roomValue] = foundEntry;
                roomValue.forEach((sid) => {
                    io.to(sid).emit("sticker", socket.id, displayName, stickerId);
                });
            }
        });

        // ── Live transcription ────────────────────────────────────────────
        socket.on("transcript-update", (entry) => {
            const foundEntry = Object.entries(connections)
                .find(([, roomValue]) => roomValue.includes(socket.id));
            if (!foundEntry) return;

            const [, roomValue] = foundEntry;
            const enriched = {
                ...entry,
                socketId: socket.id,
                speaker: socketToUsername[socket.id] || entry.speaker || 'Guest',
            };

            roomValue.forEach((sid) => {
                io.to(sid).emit("transcript-update", enriched);
            });
        });

        // ── Active speaker ────────────────────────────────────────────────
        socket.on("active-speaker", (isSpeaking) => {
            const foundEntry = Object.entries(connections)
                .find(([, roomValue]) => roomValue.includes(socket.id));
            if (!foundEntry) return;

            const [, roomValue] = foundEntry;
            roomValue.forEach((sid) => {
                io.to(sid).emit("active-speaker", socket.id, Boolean(isSpeaking));
            });
        });

        // ── Media state ───────────────────────────────────────────────────
        socket.on("media-state", (audio, video) => {
            const foundEntry = Object.entries(connections)
                .find(([, roomValue]) => roomValue.includes(socket.id));
            if (foundEntry) {
                const [, roomValue] = foundEntry;
                roomValue.forEach((sid) => {
                    io.to(sid).emit("media-state", socket.id, !!audio, !!video);
                });
            }
        });

        // ── Call signaling ────────────────────────────────────────────────
        // call-invite: User A wants to call User B.
        // Server forwards the invite to B's socket so B can show the ringing UI.
        // If B is offline the server tells A immediately so A can show an error.
        socket.on("call-invite", ({ targetUserId, roomCode, callType, callerName, callerUserId }) => {
            const targetSid = onlineUserIds[String(targetUserId)];
            if (targetSid) {
                io.to(targetSid).emit("call-incoming", {
                    roomCode,
                    callType:  callType || 'video',
                    callerName,
                    callerUserId,
                });
            } else {
                // Target is offline — notify caller so they can give feedback
                socket.emit("call-failed", { reason: "offline", targetUserId });
            }
        });

        // call-accept: User B accepted the call. Notify User A so they know
        // to stay in the room and expect a peer connection.
        socket.on("call-accept", ({ roomCode, callerUserId }) => {
            const callerSid = onlineUserIds[String(callerUserId)];
            if (callerSid) io.to(callerSid).emit("call-accepted", { roomCode });
        });

        // call-reject: User B declined. Notify User A to leave the room.
        socket.on("call-reject", ({ callerUserId }) => {
            const callerSid = onlineUserIds[String(callerUserId)];
            if (callerSid) io.to(callerSid).emit("call-rejected", {});
        });

        // call-cancel: User A cancelled before B answered. Dismiss B's modal.
        socket.on("call-cancel", ({ targetUserId }) => {
            const targetSid = onlineUserIds[String(targetUserId)];
            if (targetSid) io.to(targetSid).emit("call-cancelled", {});
        });

        // ── Disconnect ────────────────────────────────────────────────────
        socket.on("disconnect", () => {
            const leftUsername = socketToUsername[socket.id] || 'Someone';
            delete socketToUsername[socket.id];
            delete timeOnline[socket.id];

            // Clean up presence tracking and notify all clients
            const uid = socketToUserId[socket.id];
            if (uid) {
                delete onlineUserIds[uid];
                delete socketToUserId[socket.id];
                io.emit("presence-update", { userId: uid, status: "offline" });
            }

            // Remove from any video room and notify room members
            for (const [k, v] of JSON.parse(JSON.stringify(Object.entries(connections)))) {
                for (let a = 0; a < v.length; ++a) {
                    if (v[a] === socket.id) {
                        connections[k].forEach((sid) => {
                            io.to(sid).emit('user-left', socket.id, leftUsername);
                        });

                        const index = connections[k].indexOf(socket.id);
                        connections[k].splice(index, 1);

                        if (connections[k].length === 0) {
                            delete connections[k];
                        }
                    }
                }
            }
        })
    })

    return io;
}
