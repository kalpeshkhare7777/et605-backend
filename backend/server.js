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

// Updated SessionLog to match Merge Team Payload
const SessionLog = mongoose.model('SessionLog', new mongoose.Schema({
  student_id: String,
  session_id: String,
  chapter_id: String,
  timestamp: { type: Date, default: Date.now },
  session_status: String, // "completed" or "exited_midway"
  correct_answers: Number,
  wrong_answers: Number,
  questions_attempted: Number,
  total_questions: Number,
  retry_count: Number,
  hints_used: Number,
  total_hints_embedded: Number,
  time_spent_seconds: Number,
  topic_completion_ratio: Number,
  p_l_post: Number // Mastery stored for internal analytics
}), 'session_logs');

// --- ROUTES ---

// 1. Merge Team Requirement: Canonical Metadata
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
      { subtopic_id: "KC2", name: "Negative Bases", difficulty: 0.45 },
      { subtopic_id: "KC3", name: "Laws of Exponents", difficulty: 0.6 },
      { subtopic_id: "KC4", name: "Different Bases", difficulty: 0.7 },
      { subtopic_id: "KC5", name: "Standard Form", difficulty: 0.55 }
    ],
    prerequisites: []
  });
});

// 2. Adaptive History for BKT
app.get('/api/history/:student_id/:kc', async (req, res) => {
  try {
    const history = await SessionLog.find({ 
        student_id: req.params.student_id, 
        kc_id: req.params.kc 
    }).sort({ timestamp: -1 }).limit(5);
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

// 3. Final Session Submission
app.post('/api/log-session', async (req, res) => {
  try {
    const log = new SessionLog(req.body);
    await log.save();
    console.log(`💾 Session ${req.body.session_id} saved for student ${req.body.student_id}`);
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