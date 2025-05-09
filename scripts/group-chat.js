document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.getElementById('chatContainer'); 
    const messageInput = document.getElementById('chatInput');       // Input field for typing new messages.
    const sendButton = document.getElementById('sendButton');        // Button to send the typed message.

    // Placeholder for the current logged-in user's ID.
    // In a real application, this ID would be obtained from the server-side authentication system
    // (e.g., after user login, stored in a session or a secure cookie).
    const currentUserId = 'currentUserPlaceholderId'; 

    // Fetch initial messages when the DOM is fully loaded and parsed.
    fetchMessages();

    if (sendButton && messageInput) {
        // Send message when the send button is clicked.
        sendButton.addEventListener('click', sendMessage);
        // Send message when the 'Enter' key is pressed in the input field.
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }

    /**
     * Fetches existing chat messages from the backend API.
     * Assumes the API endpoint '/api/group-chat/messages' returns a JSON array of message objects.
     */

    async function fetchMessages() {
        try {
            // API call to the backend to get messages.
            // Replace with backend endpoint.
            const response = await fetch('/api/group-chat/messages'); 
            if (!response.ok) {
                // If the server response is not OK throw an error.
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const messages = await response.json(); // Parse the JSON response from the server.
   
            // Once messages are fetched, display them in the UI.
            renderMessages(messages);
        } catch (error) {
            console.error("Failed to fetch messages:", error);
            // Display an error message in the chat container if fetching fails.
            if (chatContainer) {
                chatContainer.innerHTML = '<p>Error loading messages. Please try again later.</p>';
            }
        }
    }

    /**
     * Renders an array of message objects to the chat container in the UI.
     */
    function renderMessages(messages) {
        if (!chatContainer) return; // Exit if the chat container element doesn't exist.

        chatContainer.innerHTML = ''; // Clear any existing messages from the container.

        messages.forEach(msg => {
            // Create the main div for the message.
            const messageElement = document.createElement('div');
            messageElement.classList.add('message'); // Apply general message styling.

            // If the message's userId matches the currentUserId, align it to the right.
            // This is a common UI pattern to distinguish the current user's messages.
            if (msg.userId === currentUserId) {
                messageElement.classList.add('right');
            }

            // Create the header for the message (username and timestamp).
            const messageHeader = document.createElement('div');
            messageHeader.classList.add('message-header');

            const userSpan = document.createElement('span');
            userSpan.classList.add('user');
            userSpan.textContent = msg.username || 'Anonymous'; // Display username or 'Anonymous' if not available.

            const timeSpan = document.createElement('span');
            timeSpan.classList.add('time');
            // Format the timestamp to a more readable local time (e.g., "10:30 AM").
            timeSpan.textContent = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            messageHeader.appendChild(userSpan);
            messageHeader.appendChild(timeSpan);

            // Create the div for the actual message content.
            const messageContent = document.createElement('div');
            messageContent.classList.add('message-content');
            messageContent.textContent = msg.content;

            // Append elements to the messageElement.
            messageElement.appendChild(messageHeader);
            messageElement.appendChild(messageContent);

            // Add the fully constructed message element to the chat container.
            chatContainer.appendChild(messageElement);
        });

        // Scroll the chat container to the bottom to show the latest messages.
        chatContainer.scrollTop = chatContainer.scrollHeight; 
    }

    async function sendMessage() {
        // Check if the message input field exists and if it has non-whitespace content.
        if (!messageInput || !messageInput.value.trim()) {
            return; // Don't send empty messages.
        }

        const messageData = {
            content: messageInput.value.trim(),
        };

        try {
            // API call to the backend to send/save the new message.
            // Replace '/api/group-chat/send' with your actual backend endpoint.
            const response = await fetch('/api/group-chat/send', {
                method: 'POST', // Use POST method for creating new resources.
                headers: {
                    'Content-Type': 'application/json', // Indicate that the request body is JSON.
                },
                body: JSON.stringify(messageData), // Convert the JavaScript object to a JSON string.
            });

            if (!response.ok) {
                // If the server response is not OK, throw an error.
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            fetchMessages(); 
            
            messageInput.value = ''; // Clear the input field after sending.
        } catch (error) {
            console.error("Failed to send message:", error);
        }
    }
});