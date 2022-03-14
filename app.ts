import dotenv from "dotenv";
import Server from "./models/server.model";

// Confidurar dot.env
dotenv.config();

const server = new Server();

server.listen();
