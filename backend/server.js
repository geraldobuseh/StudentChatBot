require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();

// Configure CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Subject-specific prompts
const SUBJECT_PROMPTS = {
  math: `You are a math tutor. Explain concepts clearly and show step-by-step solutions. 
  Use mathematical notation when appropriate. Break down complex problems into simpler steps.`,
  
  science: `You are a science tutor. Explain scientific concepts with real-world examples. 
  Use appropriate terminology and explain the underlying principles. Format your responses with:
  - Clear headings
  - Bullet points for key concepts
  - Numbered steps for processes
  - Examples in separate blocks
  - Important terms in bold
  - Visual descriptions where helpful`,
  
  history: `You are a history tutor. Provide historical context and explain the significance of events. 
  Connect past events to present-day situations when relevant.`,
  
  english: `You are an English tutor. Help with literature analysis, writing, and grammar. 
  Provide constructive feedback and explain literary concepts.`,
  
  programming: `You are a programming tutor. Explain coding concepts clearly and provide practical examples. 
  Use proper code formatting and explain best practices.`
};

// Test endpoint to list available models
app.get('/test-models', async (req, res) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const result = await model.generateContent("Hello");
    const response = await result.response;
    res.json({ 
      success: true,
      model: "gemini-1.5-pro",
      response: response.text()
    });
  } catch (error) {
    console.error('Model Test Error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      details: error
    });
  }
});

app.post('/chat', async (req, res) => {
  console.log('Received request:', req.body);
  const { messages, subject } = req.body;
  
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request: messages must be an array' });
  }

  try {
    // Get the generative model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    // For the first message, start a new chat
    if (messages.length === 1) {
      const chat = model.startChat({
        history: [{
          role: "user",
          parts: [{ text: SUBJECT_PROMPTS[subject] || "You are a helpful tutor." }]
        }]
      });
      const result = await chat.sendMessage(messages[0].content);
      const response = await result.response;
      const text = response.text();
      
      const reply = {
        role: 'assistant',
        content: text,
        format: subject === 'science' ? 'formatted' : 'plain'
      };
      
      res.json({ message: reply });
      return;
    }

    // For subsequent messages, build the history properly
    const history = [];
    let currentUserMessage = null;

    // Process messages in pairs (user message followed by assistant response)
    for (let i = 0; i < messages.length - 1; i++) {
      const msg = messages[i];
      const nextMsg = messages[i + 1];

      if (msg.role === 'user' && nextMsg.role === 'assistant') {
        history.push({
          role: 'user',
          parts: [{ text: msg.content }]
        });
        history.push({
          role: 'model',
          parts: [{ text: nextMsg.content }]
        });
      }
    }

    // Get the current message (last in the array)
    const currentMessage = messages[messages.length - 1].content;

    // Start a new chat with the history and subject prompt
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: SUBJECT_PROMPTS[subject] || "You are a helpful tutor." }]
        },
        ...history
      ]
    });

    // Send the current message
    const result = await chat.sendMessage(currentMessage);
    const response = await result.response;
    const text = response.text();

    const reply = {
      role: 'assistant',
      content: text,
      format: subject === 'science' ? 'formatted' : 'plain'
    };

    res.json({ message: reply });
  } catch (error) {
    console.error('Gemini Error Details:', {
      message: error.message,
      code: error.code,
      status: error.status
    });
    res.status(500).json({ 
      error: 'Gemini API error',
      details: error.message
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
