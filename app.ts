import dotenv from "dotenv";
import Server from "./src/server.model";

// Confidurar dot.env
dotenv.config();

const server = new Server();

server.listen();
