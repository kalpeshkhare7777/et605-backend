const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// --- MONGODB CONNECTION ---
const mongoURI = process.env.MONGO_URI;

mongoose.connect(mongoURI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

// --- DATA MODELS (SCHEMAS) ---

// Question Schema
const Question = mongoose.model('Question', new mongoose.Schema({
  kc_id: String,        // e.g., "KC11"
  difficulty: String,   // "easy", "medium", "hard"
  question_text: String,
  options: [String],
  answer: String,
  hints: [String]
}));

// Student Progress Schema
const Progress = mongoose.model('Progress', new mongoose.Schema({
  roll_number: String,
  subskill_id: String,
  p_l: Number,          // BKT Mastery Probability
  consecutive_correct: Number,
  updated_at: { type: Date, default: Date.now }
}));

// --- API ROUTES ---

// 1. Get Questions from DB
app.get('/api/questions/:kc/:diff', async (req, res) => {
  try {
    const questions = await Question.find({ 
      kc_id: req.params.kc, 
      difficulty: req.params.diff 
    });
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Sync Mastery to DB (Upsert)
app.post('/api/sync-mastery', async (req, res) => {
  const { roll_number, subskill_id, p_l, consecutive_correct } = req.body;
  try {
    const result = await Progress.findOneAndUpdate(
      { roll_number, subskill_id },
      { p_l, consecutive_correct, updated_at: Date.now() },
      { upsert: true, new: true }
    );
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 3. Health Check
app.get('/', (req, res) => res.send("ATS MongoDB Backend is Live"));

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});