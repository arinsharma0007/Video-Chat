import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import { log } from "node:console";
import { connectToSocket } from "./controllers/socketManager.js";
import userRoutes from "./routes/users.routes.js";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 8000;

const app = express();
const server = createServer(app);
const io = connectToSocket(server);

app.set("port", PORT);
app.use(cors()); // Cross Origin Resource sharing ...(To accept req from diff origin or domain)
app.use(express.json({ limit: "40kb" })); //Parse the req.body to readable obj.
app.use(express.urlencoded({ limit: "40kb", extended: true })); // Parses URL-encoded form data ( e.g. HTML forms with POST)
app.use("/api/v1/users", userRoutes);

const start = async () => {
  const connectionDb = await mongoose.connect(process.env.MONGO_URI);
  console.log(`Mongo DB connection host ${connectionDb.connection.host}`);

  server.listen(8000, () => {
    console.log(`App is listening at port ${PORT}`);
  });
};

start();
