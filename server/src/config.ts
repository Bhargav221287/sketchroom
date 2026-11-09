import dotenv from "dotenv";
dotenv.config();

export const PORT = parseInt(process.env.PORT || "3001", 10);
export const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(",").map((s) => s.trim())
  : ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"];

