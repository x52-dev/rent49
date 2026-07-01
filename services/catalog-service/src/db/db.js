require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");

const app = express();
app.use(express.json());

// 1. Connect to MongoDB (Docker)
mongoose
  .connect(
    "mongodb://admin:adminpassword@localhost:27017/catalog_db?authSource=admin",
  )
  .then(() => console.log("✅ Connected to MongoDB Catalog"))
  .catch((err) => console.error("MongoDB connection error:", err));

// 2. Define the Polymorphic Schema
const gameSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, index: true },
    developerId: { type: String, required: true }, // Links to Seller CRM
    price: { type: Number, required: true },
    tags: [String], // e.g., ["RPG", "Multiplayer", "Open World"]
    metadata: { type: mongoose.Schema.Types.Mixed }, // Highly flexible field for unique game data
  },
  { timestamps: true },
);

const Game = mongoose.model("Game", gameSchema);

// 3. Simple Route to test
app.post("/api/games", async (req, res) => {
  try {
    const game = await Game.create(req.body);
    res.status(201).json(game);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.listen(3001, () => console.log("🎮 Catalog Service running on port 3001"));
