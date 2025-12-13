import { Server } from "socket.io";

let connections = {};
let messages = {};
let timeOnLine = {};

export const connectToSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      allowedHeaders: ["*"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("SOMEHTING connect");
    socket.on("join-call", (path) => {
      if (connections[path] === undefined) {
        connections[path] = [];
      }
      connections[path].push(socket.id);
      timeOnLine[socket.id] = new Date();

      // connections[path].forEach((element) => {
      //   io.to(element);
      // });

      for (let i = 0; i < connections[path].length; i++) {
        io.to(connections[path][i]).emit(
          "user-joined",
          socket.id,
          connections[path]
        );
      }
      if (!messages[path]) messages[path] = [];
      if (messages[path] === undefined) {
        for (let i = 0; i < messages[path].length; i++) {
          io.to(socket.id).emit(
            "chat-message",
            messages[path][i]["data"],
            messages[path][i]["sender"],
            messages[path][i]["socket-id-sender"]
          );
        }
      }
    });

    socket.on("signal", (toId, message) => {
      io.to(toId).emit("signal", socket.id, message);
    });

    socket.on("chat-message", (data, sender) => {
      const [matchingRoom, found] = Object.entries(connections).reduce(
        ([room, isFound], [roomKey, roomValue]) => {
          if (!isFound && roomValue.includes(socket.id)) {
            return [roomKey, true];
          }
          return [room, isFound];
        },
        ["", false]
      );

      if (found === true) {
        if (messages[matchingRoom] === undefined) {
          messages[matchingRoom] = [];
        }
        messages[matchingRoom].push({
          sender: sender,
          data: data,
          "socket-id-sender": socket.id,
        });
        console.log("messsage", matchingRoom, ":", sender, data);

        connections[matchingRoom].forEach((elem) => {
          io.to(elem).emit("chat-message", data, sender, socket.id);
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);

      const diffTime = Math.abs(timeOnLine[socket.id] - new Date());

      for (const [roomKey, userList] of Object.entries(connections)) {
        if (userList.includes(socket.id)) {
          // Notify everyone else in the room
          userList.forEach((connId) => {
            io.to(connId).emit("user-left", socket.id);
          });

          // Remove this socket from the room
          connections[roomKey] = userList.filter((id) => id !== socket.id);

          // Clean up if the room is empty
          if (connections[roomKey].length === 0) {
            delete connections[roomKey];
          }
        }
      }

      delete timeOnLine[socket.id];
    });
  });
};
