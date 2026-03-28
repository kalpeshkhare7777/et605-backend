const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args)); // Ensure node-fetch is installed
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

// --- MODELS ---
const Content = mongoose.model('Content', new mongoose.Schema({
  kc_id: String,
  title: String,
  motivation: String,
  content: String
}), 'contents');

const Question = mongoose.model('Question', new mongoose.Schema({
  id: Number,
  kc_id: String,
  difficulty: String,
  question_text: String,
  options: [String],
  answer: String,
  hints: [String]
}), 'questions');

// Expanded Learner Model Schema
const SessionLog = mongoose.model('SessionLog', new mongoose.Schema({
  session_id: String,
  roll_number: String,
  kc_id: String,
  question_id: Number,
  is_correct: Boolean,
  hints_used: Number,
  wrong_attempts: Number,
  response_time_ms: Number,
  p_l_post: Number,           // Mastery level AFTER this interaction
  click_sequence: [String],
  timestamp: { type: Date, default: Date.now }
}), 'session_logs');

// --- ROUTES ---

app.get('/api/content/:kc_id', async (req, res) => {
  try {
    const data = await Content.findOne({ kc_id: req.params.kc_id });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/questions/:kc/:diff', async (req, res) => {
  try {
    const questions = await Question.find({ kc_id: req.params.kc, difficulty: req.params.diff });
    res.json(questions);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/log-session', async (req, res) => {
  try {
    const log = new SessionLog(req.body);
    await log.save();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// SECURE BACKEND TTS PROXY
app.post('/api/tts', async (req, res) => {
  const { text } = req.body;
  const VOICE_ID = process.env.VOICE_ID || "2zRM7PkgwBPiau2jvVXc"; 
  
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg"
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.8 }
      }),
    });

    if (!response.ok) throw new Error("ElevenLabs API failure");

    const arrayBuffer = await response.arrayBuffer();
    res.set('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error("TTS Error:", err.message);
    res.status(500).json({ error: "Failed to generate audio" });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));