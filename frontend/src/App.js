import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';

// Constants
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const INITIAL_MESSAGE = 'Hello!';

const SUBJECTS = {
  math: {
    name: 'Mathematics',
    description: 'Algebra, Calculus, Geometry, and more',
    icon: '📐'
  },
  science: {
    name: 'Science',
    description: 'Physics, Chemistry, Biology',
    icon: '🔬'
  },
  history: {
    name: 'History',
    description: 'World History, US History, Ancient Civilizations',
    icon: '📜'
  },
  english: {
    name: 'English',
    description: 'Literature, Writing, Grammar',
    icon: '📚'
  },
  programming: {
    name: 'Programming',
    description: 'Coding, Algorithms, Computer Science',
    icon: '💻'
  }
};

// Helper function to convert markdown-like formatting to HTML
const formatMessage = (content) => {
  if (!content) return '';
  
  // Split content into lines
  const lines = content.split('\n');
  let formattedContent = '';
  let currentList = '';
  let inList = false;
  let isFirstParagraph = true;
  let listType = '';
  let listLevel = 0;

  lines.forEach((line) => {
    // Handle bold text first (before other formatting)
    line = line.replace(/\*\*(.*?)\*\*/g, (match, text) => {
      return `<strong>${text}</strong>`;
    });

    // Handle headings
    if (line.startsWith('# ')) {
      formattedContent += `<h2>${line.substring(2)}</h2>`;
      return;
    }
    if (line.startsWith('## ')) {
      formattedContent += `<h3>${line.substring(3)}</h3>`;
      return;
    }

    // Handle italic text
    line = line.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Handle lists
    if (line.trim().startsWith('* ')) {
      if (!inList) {
        inList = true;
        // Determine list type based on content
        if (line.includes(':')) {
          listType = 'category-list';
        } else if (line.includes('?')) {
          listType = 'question-list';
        } else {
          listType = 'topic-list';
        }
        currentList = `<ul class="${listType}">`;
      }
      currentList += `<li>${line.substring(2).trim()}</li>`;
      return;
    } else if (inList) {
      inList = false;
      formattedContent += currentList + '</ul>';
      currentList = '';
      listType = '';
    }

    // Handle example blocks
    if (line.startsWith('Example:')) {
      formattedContent += `<div class="example">${line.substring(8).trim()}</div>`;
      return;
    }

    // Handle notes
    if (line.startsWith('Note:')) {
      formattedContent += `<div class="note">${line.substring(5).trim()}</div>`;
      return;
    }

    // Handle regular paragraphs
    if (line.trim()) {
      if (isFirstParagraph) {
        formattedContent += `<p class="intro">${line}</p>`;
        isFirstParagraph = false;
      } else {
        formattedContent += `<p>${line}</p>`;
      }
    }
  });

  // Close any open list
  if (inList) {
    formattedContent += currentList + '</ul>';
  }

  return formattedContent;
};

function App() {
  // State management
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [showSubjectSelector, setShowSubjectSelector] = useState(true);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Error handling helper
  const handleError = useCallback((err) => {
    console.error('Error in API call:', err.response?.data || err);
    const errorDetails = err.response?.data || {};
    setError(
      `Error: ${errorDetails.error || 'Failed to send message'}\n` +
      `Details: ${errorDetails.details || 'Please try again'}\n` +
      (errorDetails.code ? `Code: ${errorDetails.code}\n` : '') +
      (errorDetails.type ? `Type: ${errorDetails.type}` : '')
    );
  }, []);

  // Message sending logic
  const sendMessage = useCallback(async (messageContent = null) => {
    const content = messageContent || input.trim();
    if (!content) return;
    
    const userMsg = { 
      role: 'user', 
      content,
      subject: selectedSubject
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    if (!messageContent) setInput('');
    setError(null);
    setIsLoading(true);

    try {
      console.log('Sending request to server:', { messages: newMessages, subject: selectedSubject });
      const res = await axios.post(`${API_URL}/chat`, { 
        messages: newMessages,
        subject: selectedSubject
      });
      console.log('Received response from server:', res.data);
      
      // Extract the message from the nested structure
      const botMessage = res.data.message || res.data;
      console.log('Processed bot message:', botMessage);
      
      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      console.error('Error in sendMessage:', err);
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  }, [input, messages, handleError, selectedSubject]);

  // Keyboard event handler
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  // Send initial message
  useEffect(() => {
    if (messages.length === 0 && selectedSubject) {
      sendMessage(`I need help with ${SUBJECTS[selectedSubject].name}`);
    }
  }, [messages.length, sendMessage, selectedSubject]);

  const handleSubjectSelect = (subject) => {
    setSelectedSubject(subject);
    setShowSubjectSelector(false);
    setMessages([]); // Clear previous messages when changing subjects
  };

  return (
    <div className="app-container">
      <h1 className="app-title">Student Assist Bot</h1>
      
      {showSubjectSelector ? (
        <div className="subject-selector">
          <h2>Select a Subject</h2>
          <div className="subject-grid">
            {Object.entries(SUBJECTS).map(([key, subject]) => (
              <button
                key={key}
                className="subject-card"
                onClick={() => handleSubjectSelect(key)}
              >
                <span className="subject-icon">{subject.icon}</span>
                <span className="subject-name">{subject.name}</span>
                <span className="subject-description">{subject.description}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="subject-header">
            <button 
              className="change-subject-btn"
              onClick={() => setShowSubjectSelector(true)}
            >
              Change Subject
            </button>
            <h2 className="current-subject">
              {SUBJECTS[selectedSubject].icon} {SUBJECTS[selectedSubject].name}
            </h2>
          </div>

          <div className="chat-container">
            {messages.map((msg, i) => {
              console.log('Rendering message:', msg);
              return (
                <div key={i} className={`message ${msg.role}`}>
                  <div 
                    className={`message-content ${msg.format === 'formatted' ? 'formatted' : ''}`}
                    dangerouslySetInnerHTML={{ 
                      __html: msg.format === 'formatted' ? (msg.content || '') : formatMessage(msg.content || '')
                    }}
                  />
                </div>
              );
            })}
            {isLoading && (
              <div className="message assistant">
                <div className="typing-indicator">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {error && (
            <div className="error-message" role="alert">
              <ExclamationCircleIcon aria-hidden="true" />
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{error}</pre>
            </div>
          )}

          <div className="input-container">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Ask a question about ${SUBJECTS[selectedSubject].name}... (Press Enter to send)`}
              rows="2"
              disabled={isLoading}
              aria-label="Message input"
            />
            <button
              onClick={() => sendMessage()}
              disabled={isLoading || !input.trim()}
              aria-label="Send message"
            >
              Send
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
