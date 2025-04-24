// Helper function to format the response
const formatResponse = (content) => {
  // Split content into lines
  const lines = content.split('\n');
  let formattedContent = '';
  let currentList = '';
  let inList = false;
  let isFirstParagraph = true;

  lines.forEach((line) => {
    // Handle bold text
    line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Handle lists
    if (line.trim().startsWith('* ')) {
      if (!inList) {
        inList = true;
        currentList = '<ul>';
      }
      currentList += `<li>${line.substring(2).trim()}</li>`;
      return;
    } else if (inList) {
      inList = false;
      formattedContent += currentList + '</ul>';
      currentList = '';
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

// Update the chat endpoint
app.post('/chat', async (req, res) => {
  try {
    console.log('Received request:', req.body);
    const { messages, subject } = req.body;
    
    // Get the last message
    const lastMessage = messages[messages.length - 1];
    console.log('Last message:', lastMessage);
    
    // Generate response using Gemini
    const result = await model.generateContent(lastMessage.content);
    const response = await result.response;
    const text = response.text();
    console.log('Raw response:', text);
    
    // Format the response
    const formattedResponse = formatResponse(text);
    console.log('Formatted response:', formattedResponse);
    
    // Send the formatted response
    res.json({ 
      role: 'assistant',
      content: formattedResponse,
      format: 'formatted'
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate response',
      details: error.message
    });
  }
}); 