const mongoose = require('mongoose');
require('dotenv').config();

// 1. Define the Schema (Must match your server.js)
const Question = mongoose.model('Question', new mongoose.Schema({
  kc_id: String,
  difficulty: String,
  question_text: String,
  options: [String],
  answer: String,
  hints: [String]
}));

// 2. Your Data Array (Add your 85 questions here)
const questionsToSeed = [
  {
    kc_id: "KC11",
    difficulty: "easy",
    question_text: "In the expression 5^3, what is the base?",
    options: ["5", "3", "15", "125"],
    answer: "5",
    hints: ["The base is the large number at the bottom.", "What is being multiplied?", "The answer is 5."]
  },
  {
    kc_id: "KC11",
    difficulty: "medium",
    question_text: "Express 7 * 7 * 7 * 7 in exponential form.",
    options: ["7^4", "4^7", "28", "74"],
    answer: "7^4",
    hints: ["Count how many times 7 is repeated.", "The count becomes the exponent.", "It is 7 raised to the power of 4."]
  }
  // ... Add more questions here
];

// 3. The Seeding Function
const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB for seeding...");

    // Optional: Clear existing questions so you don't get duplicates
    await Question.deleteMany({});
    console.log("🗑️  Old questions cleared.");

    await Question.insertMany(questionsToSeed);
    console.log(`🚀 Successfully seeded ${questionsToSeed.length} questions!`);

    process.exit();
  } catch (err) {
    console.error("❌ Seeding error:", err);
    process.exit(1);
  }
};

seedDB();