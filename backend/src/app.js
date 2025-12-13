import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import { log } from "node:console";
import { connectToSocket } from "./controllers/socketManager.js";
import userRoutes from "./routes/users.routes.js";

const app = express();
const server = createServer(app);
const io = connectToSocket(server);

app.set("port", process.env.PORT || 8000);
app.use(cors()); // Cross Origin Resource sharing ...(To accept req from diff origin or domain)
app.use(express.json({ limit: "40kb" })); //Parse the req.body to readable obj.
app.use(express.urlencoded({ limit: "40kb", extended: true })); // Parses URL-encoded form data ( e.g. HTML forms with POST)
app.use("/api/v1/users", userRoutes);

const start = async () => {
  const connectionDb = await mongoose.connect(
    "mongodb+srv://arinsharma:manu0004@cluster0.ytueflu.mongodb.net/"
  );
  console.log(`Mongo DB connection host ${connectionDb.connection.host}`);

  server.listen(8000, () => {
    console.log("App is listening at port", 8000);
  });
};

start();
