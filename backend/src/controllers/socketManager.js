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
                connections[path] = []
            }
            connections[path].push(socket.id);
            timeOnline[socket.id] = new Date();

            for (let a = 0; a < connections[path].length; a++) {
                io.to(connections[path][a]).emit("user-joined", socket.id, connections[path], displayName);
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

        socket.on("disconnect", () => {

            var diffTime = Math.abs(timeOnline[socket.id] - new Date())

            var key

            for (const [k, v] of JSON.parse(JSON.stringify(Object.entries(connections)))) {

                for (let a = 0; a < v.length; ++a) {
                    if (v[a] === socket.id) {
                        key = k

                        const leftUsername = socketToUsername[socket.id] || 'Someone';
                        for (let a = 0; a < connections[key].length; ++a) {
                            io.to(connections[key][a]).emit('user-left', socket.id, leftUsername)
                        }
                        delete socketToUsername[socket.id];

                        var index = connections[key].indexOf(socket.id)

                        connections[key].splice(index, 1)


                        if (connections[key].length === 0) {
                            delete connections[key]
                        }
                    }
                }

            }


        })


    })


    return io;
}

