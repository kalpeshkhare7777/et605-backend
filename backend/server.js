const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch(err => console.error(err));

// --- MODELS ---
const Content = mongoose.model('Content', new mongoose.Schema({ kc_id: String, title: String, motivation: String, content: String }), 'contents');
const Question = mongoose.model('Question', new mongoose.Schema({ id: Number, kc_id: String, difficulty: String, question_text: String, options: [String], answer: String, hints: [String] }), 'questions');
const SessionLog = mongoose.model('SessionLog', new mongoose.Schema({
  roll_number: String,
  session_id: String,
  kc_id: String,
  is_correct: Boolean,
  hints_used: Number,
  wrong_attempts: Number,
  p_l_post: Number,
  session_status: String,
  timestamp: { type: Date, default: Date.now }
}), 'session_logs');

// --- ROUTES ---

// Merge Team Requirement: Static Metadata
app.get('/api/chapter-metadata', (req, res) => {
  res.json({
    grade: 7,
    chapter_name: "Exponents and Powers",
    chapter_id: "grade7_exponents_powers",
    chapter_url: "https://et-expo-n-power.onrender.com/quiz",
    chapter_difficulty: 0.65,
    expected_completion_time_seconds: 1500,
    subtopics: [
      { subtopic_id: "KC1", name: "Large Numbers", difficulty: 0.3 },
      { subtopic_id: "KC2", name: "Negative Bases", difficulty: 0.45 }
    ],
    prerequisites: []
  });
});

app.get('/api/history/:roll/:kc', async (req, res) => {
  try {
    const history = await SessionLog.find({ roll_number: req.params.roll, kc_id: req.params.kc }).sort({ timestamp: -1 }).limit(5);
    res.json(history);
  } catch (err) { res.json([]); }
});

app.get('/api/content/:kc_id', async (req, res) => {
  const data = await Content.findOne({ kc_id: req.params.kc_id });
  res.json(data);
});

app.get('/api/questions/:kc/:diff', async (req, res) => {
  const questions = await Question.find({ kc_id: req.params.kc, difficulty: req.params.diff });
  res.json(questions);
});

app.post('/api/log-session', async (req, res) => {
  try {
    const log = new SessionLog(req.body);
    await log.save();
    res.json({ success: true });
  } catch (e) { res.status(500).send(e); }
});

app.post('/api/tts', async (req, res) => {
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${process.env.VOICE_ID}`, {
      method: "POST",
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ text: req.body.text, model_id: "eleven_multilingual_v2" }),
    });
    const buffer = await response.arrayBuffer();
    res.set('Content-Type', 'audio/mpeg').send(Buffer.from(buffer));
  } catch (err) { res.status(500).send("TTS Error"); }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));