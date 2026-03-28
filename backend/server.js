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

/** * DOMAIN MODULE: Learning Content Collection
 * Stores parent topics (KC1, KC2...) for motivation/theory
 */
const Content = mongoose.model('Content', new mongoose.Schema({
  kc_id: String,
  title: String,
  motivation: String,
  content: String
}), 'contents');

/** * DOMAIN MODULE: Questions Collection
 * Stores questions for subtopics (KC11, KC12...)
 */
const Question = mongoose.model('Question', new mongoose.Schema({
  id: Number,         // The numeric ID from your seed (e.g., 1, 2, 3...)
  kc_id: String,      // The subtopic ID (e.g., KC11, KC23...)
  difficulty: String, // easy, medium, hard, very difficult
  question_text: String,
  options: [String],
  answer: String,
  hints: [String]
}), 'questions');

/** * LEARNER MODULE: Student Mastery Collection
 */
const Progress = mongoose.model('Progress', new mongoose.Schema({
  roll_number: String,
  subskill_id: String,
  p_l: Number,
  consecutive_correct: Number,
  updated_at: { type: Date, default: Date.now }
}), 'progresses');

/** * LEARNER MODULE: Detailed Session Logs
 */
const SessionLog = mongoose.model('SessionLog', new mongoose.Schema({
  session_id: String,
  roll_number: String,
  kc_id: String,           // Stores the specific subtopic tested
  question_id: Number,     // Numeric ID from seed
  is_correct: Boolean,
  p_l_post: Number,
  response_time_ms: Number,
  hints_used: Number,
  wrong_attempts: Number,
  click_sequence: [String],
  timestamp: { type: Date, default: Date.now }
}), 'session_logs');

// --- API ROUTES ---

app.get('/', (req, res) => res.send("ATS MongoDB Backend is Live"));

// 2. DOMAIN: Get Parent KC Content (For Theory/Motivation screens)
app.get('/api/content/:kc_id', async (req, res) => {
  try {
    const data = await Content.findOne({ kc_id: req.params.kc_id });
    if (!data) return res.status(404).json({ error: "Content not found" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. DOMAIN: Get Subtopic Questions (For Quiz screens)
// Example: /api/questions/KC11/easy
app.get('/api/questions/:kc/:diff', async (req, res) => {
  try {
    const { kc, diff } = req.params;
    const questions = await Question.find({ 
      kc_id: kc, 
      difficulty: diff 
    });
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. ADMIN: Fetch Recent Logs
app.get('/api/admin/all-logs', async (req, res) => {
  try {
    const logs = await SessionLog.find().sort({ timestamp: -1 }).limit(100);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. LEARNER: Sync Mastery
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

// 6. LEARNER: Log Interaction
app.post('/api/log-session', async (req, res) => {
  try {
    const log = new SessionLog(req.body);
    await log.save();
    res.json({ success: true, message: "Logged interaction" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Connectivity Check
app.get('/api/db-check', async (req, res) => {
  try {
    const questionsCount = await Question.countDocuments();
    const contentsCount = await Content.countDocuments();
    res.json({
      status: "Connected",
      database: mongoose.connection.name,
      questions_in_db: questionsCount,
      lessons_in_db: contentsCount,
      message: "Backend is operational"
    });
  } catch (err) {
    res.status(500).json({ status: "Error", error: err.message });
  }
});

// --- SERVER START ---
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});