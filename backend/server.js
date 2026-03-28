const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error(err));

// --- MODELS ---
const Content = mongoose.model('Content', new mongoose.Schema({ kc_id: String, title: String, motivation: String, content: String }), 'contents');
const Question = mongoose.model('Question', new mongoose.Schema({ id: Number, kc_id: String, difficulty: String, question_text: String, options: [String], answer: String, hints: [String] }), 'questions');

const SessionLog = mongoose.model('SessionLog', new mongoose.Schema({
  roll_number: String,
  kc_id: String,
  is_correct: Boolean,
  hints_used: Number,
  wrong_attempts: Number,
  rt_norm: Number,
  is_guess: Boolean,
  p_l_post: Number,
  timestamp: { type: Date, default: Date.now }
}), 'session_logs');

// --- ROUTES ---

// CRITICAL: This route makes the advanced pedagogy work
app.get('/api/history/:roll/:kc', async (req, res) => {
  try {
    const history = await SessionLog.find({ roll_number: req.params.roll, kc_id: req.params.kc })
      .sort({ timestamp: -1 })
      .limit(5);
    res.json(history);
  } catch (err) { res.status(500).json([]); }
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
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${process.env.VOICE_ID || '2zRM7PkgwBPiau2jvVXc'}`, {
      method: "POST",
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY, "Content-Type": "application/json", "Accept": "audio/mpeg" },
      body: JSON.stringify({ text: req.body.text, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.5, similarity_boost: 0.8 } }),
    });
    const buffer = await response.arrayBuffer();
    res.set('Content-Type', 'audio/mpeg').send(Buffer.from(buffer));
  } catch (err) { res.status(500).send("TTS Error"); }
});
// Final Session Close API
app.post('/api/session-close', async (req, res) => {
  const { session_id, student_id, chapter_id, final_mastery } = req.body;
  
  try {
    // 1. Mark the session as completed in SessionLogs
    await SessionLog.updateMany(
      { session_id },
      { $set: { session_status: 'completed' } }
    );

    // 2. (Optional) Update a global 'StudentProgress' table for the Bigger Project
    // This makes it easy for the main portal to see "Grade 7: Exponents" is 100%
    console.log(`User ${student_id} finished ${chapter_id} with ${final_mastery}%`);

    res.json({ success: true, message: "Final payload received and session closed." });
  } catch (err) {
    res.status(500).json({ error: "Failed to close session." });
  }
});

app.listen(5001, () => console.log("Server running on 5001"));