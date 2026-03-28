const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- MONGODB CONNECTION ---
const mongoURI = process.env.MONGO_URI;

mongoose.connect(mongoURI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

// --- DATA MODELS (ITS ARCHITECTURE) ---

/** * DOMAIN MODULE: Questions Collection
 * Explicitly mapped to 'questions' collection
 */
const Question = mongoose.model('Question', new mongoose.Schema({
  id: Number,
  kc_id: String,
  difficulty: String,
  question_text: String,
  options: [String],
  answer: String,
  hints: [String]
}), 'questions');

/** * DOMAIN MODULE: Learning Content Collection
 * Explicitly mapped to 'contents' collection
 */
const Content = mongoose.model('Content', new mongoose.Schema({
  kc_id: String,
  title: String,
  motivation: String,
  content: String
}), 'contents');

/** * LEARNER MODULE: Student Progress Collection
 */
const Progress = mongoose.model('Progress', new mongoose.Schema({
  roll_number: String,
  subskill_id: String,
  p_l: Number,
  consecutive_correct: Number,
  updated_at: { type: Date, default: Date.now }
}), 'progresses');

// --- API ROUTES ---

// 1. Health Check (Root)
app.get('/', (req, res) => res.send("ATS MongoDB Backend is Live"));

// 2. DOMAIN: Get Learning Content (Fixes "Connecting..." hang)
app.get('/api/content/:kc_id', async (req, res) => {
  try {
    // Looks for "KC1", "KC2", etc. in the kc_id field
    const data = await Content.findOne({ kc_id: req.params.kc_id });
    if (!data) return res.status(404).json({ error: "Content not found" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. DOMAIN: Get Adaptive Questions
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

// 4. LEARNER: Sync Mastery State (BKT Result Storage)
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

// 5. Connectivity Diagnostics
app.get('/api/db-check', async (req, res) => {
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    res.json({
      status: "Connected",
      database: mongoose.connection.name,
      collections_found: collections.map(c => c.name),
      message: "Render is successfully talking to MongoDB Atlas!"
    });
  } catch (err) {
    res.status(500).json({ status: "Error", error: err.message });
  }
});

// --- SERVER START ---
// Render uses process.env.PORT, local uses 5001
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});