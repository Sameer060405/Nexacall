import { Server } from "socket.io"


let connections = {}
let messages = {}
let timeOnline = {}
let socketToUsername = {}

export const connectToSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
            allowedHeaders: ["*"],
            credentials: true
        }
    });


    io.on("connection", (socket) => {

        console.log("SOMETHING CONNECTED")

        socket.on("join-call", (path, username) => {
            const displayName = username && typeof username === 'string' ? username.trim() || 'Guest' : 'Guest';
            socketToUsername[socket.id] = displayName;

            if (connections[path] === undefined) {
                connections[path] = [];
            }
            if (!connections[path].includes(socket.id)) {
                connections[path].push(socket.id);
            }
            timeOnline[socket.id] = new Date();

            // Build a name map of ALL participants in the room so new joiners
            // can display names for participants who joined before them.
            const roomNameMap = {};
            connections[path].forEach((sid) => {
                roomNameMap[sid] = socketToUsername[sid] || 'Guest';
            });

            for (let a = 0; a < connections[path].length; a++) {
                // Send the full name map so every participant can hydrate participantNames state
                io.to(connections[path][a]).emit("user-joined", socket.id, connections[path], displayName, roomNameMap);
            }

            if (messages[path] !== undefined) {
                for (let a = 0; a < messages[path].length; ++a) {
                    io.to(socket.id).emit("chat-message", messages[path][a]['data'],
                        messages[path][a]['sender'], messages[path][a]['socket-id-sender']);
                }
            }
        })

        socket.on("signal", (toId, message) => {
            io.to(toId).emit("signal", socket.id, message);
        })

        socket.on("chat-message", (data, sender) => {

                
                const foundEntry = Object.entries(connections)
                    .find(([roomKey, roomValue]) => roomValue.includes(socket.id));

                const matchingRoom = foundEntry ? foundEntry[0] : '';
                const found = Boolean(foundEntry);

                if (found) {
                    if (!messages[matchingRoom]) {
                        messages[matchingRoom] = [];
                    }

                    messages[matchingRoom].push({
                        sender: sender,
                        data: data,
                        "socket-id-sender": socket.id
                    });

                    console.log("message", matchingRoom, ":", sender, data);

                    connections[matchingRoom].forEach((elem) => {
                        io.to(elem).emit("chat-message", data, sender, socket.id);
                    });
                }
                });

        socket.on("sticker", (stickerId) => {
            const displayName = socketToUsername[socket.id] || 'Guest';
            const foundEntry = Object.entries(connections)
                .find(([_, roomValue]) => roomValue.includes(socket.id));
            if (foundEntry) {
                const [, roomValue] = foundEntry;
                roomValue.forEach((sid) => {
                    io.to(sid).emit("sticker", socket.id, displayName, stickerId);
                });
            }
        });

        // ------------------------------------------------------------------
        // Live transcription: a participant emits a finalized speech entry.
        // Broadcast it to all room members (including the sender so their
        // own transcript state stays in sync with the server fan-out).
        // ------------------------------------------------------------------
        socket.on("transcript-update", (entry) => {
            const foundEntry = Object.entries(connections)
                .find(([_, roomValue]) => roomValue.includes(socket.id));
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

        // ------------------------------------------------------------------
        // Active speaker detection: a participant reports whether they are
        // currently speaking (based on local AudioContext volume analysis).
        // Broadcast to all room members so UIs can highlight the speaker.
        // ------------------------------------------------------------------
        socket.on("active-speaker", (isSpeaking) => {
            const foundEntry = Object.entries(connections)
                .find(([_, roomValue]) => roomValue.includes(socket.id));
            if (!foundEntry) return;

            const [, roomValue] = foundEntry;
            roomValue.forEach((sid) => {
                io.to(sid).emit("active-speaker", socket.id, Boolean(isSpeaking));
            });
        });

        socket.on("media-state", (audio, video) => {
            const foundEntry = Object.entries(connections)
                .find(([_, roomValue]) => roomValue.includes(socket.id));
            if (foundEntry) {
                const [, roomValue] = foundEntry;
                roomValue.forEach((sid) => {
                    io.to(sid).emit("media-state", socket.id, !!audio, !!video);
                });
            }
        });

        socket.on("disconnect", () => {
            const leftUsername = socketToUsername[socket.id] || 'Someone';
            delete socketToUsername[socket.id];
            delete timeOnline[socket.id];

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

