document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const chatContainer = document.getElementById('chatContainer');
    const messageInput = document.getElementById('chatInput');
    const sendButton = document.getElementById('sendButton');
    const toggleSidebarButton = document.getElementById('toggleSidebar');
    const leaveGroupButton = document.getElementById('leaveGroup');
    const chatSidebar = document.querySelector('.chat-sidebar');
    
    // Current user ID (this would normally come from authentication)
    const currentUserId = 'currentUser';
    
    // Initialize
    fetchMessages();
    
    // Event listeners
    if (sendButton && messageInput) {
        sendButton.addEventListener('click', sendMessage);
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
    
    if (toggleSidebarButton) {
        toggleSidebarButton.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                chatSidebar.classList.toggle('open');
            }
        });
    }
    
    if (leaveGroupButton) {
        leaveGroupButton.addEventListener('click', () => {
            if (confirm('Are you sure you want to leave this group?')) {
                window.location.href = '/groups';
            }
        });
    }
    
    // Fetch messages from the API
    async function fetchMessages() {
        try {
            const response = await fetch('/api/group-chat/messages');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const messages = await response.json();
            renderMessages(messages);
            
        } catch (error) {
            console.error("Failed to fetch messages:", error);
            if (chatContainer) {
                chatContainer.innerHTML = '<p class="error-message">Error loading messages. Please try again later.</p>';
            }
        }
    }
    
    // Render messages to the chat container
    function renderMessages(messages) {
        if (!chatContainer) return;
        
        // Remove loading indicator
        chatContainer.innerHTML = '';
        
        messages.forEach(msg => {
            const messageElement = document.createElement('div');
            messageElement.classList.add('message');
            
            // Determine if the message is sent by the current user
            if (msg.userId === currentUserId) {
                messageElement.classList.add('sent');
            } else {
                messageElement.classList.add('received');
            }
            
            // Create message header with username
            const messageHeader = document.createElement('div');
            messageHeader.classList.add('message-header');
            
            const username = document.createElement('span');
            username.classList.add('username');
            username.textContent = msg.username;
            
            messageHeader.appendChild(username);
            
            // Create message content
            const messageContent = document.createElement('div');
            messageContent.classList.add('message-content');
            messageContent.textContent = msg.content;
            
            // Create timestamp
            const timestamp = document.createElement('div');
            timestamp.classList.add('message-timestamp');
            timestamp.textContent = formatTimestamp(msg.timestamp);
            
            // Assemble message
            messageElement.appendChild(messageHeader);
            messageElement.appendChild(messageContent);
            messageElement.appendChild(timestamp);
            
            // Add to chat container
            chatContainer.appendChild(messageElement);
        });
        
        // Scroll to bottom
        scrollToBottom();
    }
    
    // Send a new message
    async function sendMessage() {
        if (!messageInput || !messageInput.value.trim()) {
            return;
        }
        
        const content = messageInput.value.trim();
        messageInput.value = ''; // Clear input
        
        try {
            const response = await fetch('/api/group-chat/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // Refresh messages
            fetchMessages();
            
        } catch (error) {
            console.error("Failed to send message:", error);
            alert("Failed to send message. Please try again.");
        }
    }
    
    // Format timestamp
    function formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Scroll chat to bottom
    function scrollToBottom() {
        if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && chatSidebar) {
            chatSidebar.classList.remove('open');
        }
    });
});