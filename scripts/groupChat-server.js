// Connect to Socket.IO server
const socket = io();

// DOM Elements
const chatContainer = document.getElementById('chatContainer');
const chatInput = document.getElementById('chatInput');
const sendButton = document.getElementById('sendButton');

// Get group ID from page 
const groupId = document.querySelector('meta[name="group-id"]').getAttribute('content');
const userId = document.querySelector('meta[name="user-id"]').getAttribute('content');

// Join the group chat room when page loads
socket.emit('join-group', groupId, userId);

// Attach messages to the chat container
function appendMessage(message, isOwnMessage = false) {
  const messageElement = document.createElement('div');
  messageElement.className = isOwnMessage ? 'message own-message' : 'message';
  messageElement.textContent = message;
  chatContainer.appendChild(messageElement);
  
  // Scroll 
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Send message when button is clicked
sendButton.addEventListener('click', sendMessage);

// Send message when Enter key is pressed
chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') { sendMessage();}
});

function sendMessage() {
  const message = chatInput.value.trim();
  if (message) {
    // Send message to server
    socket.emit('send-chat-message', groupId, message);
    
    // Add message to UI
    appendMessage(`${message}`, true);
    
    // Clear input
    chatInput.value = '';
  }
}

// Socket.IO event handlers
socket.on('chat-message', data => {
  appendMessage(`${data.name}: ${data.message}`);
});

socket.on('user-connected', name => {
  appendMessage(`${name} joined the group`, true);
});

socket.on('user-disconnected', name => {
  appendMessage(`${name} left the group`, true);
});

// Load past messages when joining a group
fetch(`/api/group-messages/${groupId}`)
  .then(response => response.json())
  .then(messages => {
    messages.forEach(msg => {
      appendMessage(`${msg.userName}: ${msg.message}`, msg.userId === userId);
    });
  })
  .catch(error => console.error('Error loading previous messages:', error));