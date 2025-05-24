// public/scripts/group_chat.js
document.addEventListener("DOMContentLoaded", () => {
  const socket       = io();
  const groupId      = document.querySelector('meta[name="group-id"]').content;
  const currentUser  = document.querySelector('meta[name="user-id"]').content;
  const chatContainer = document.getElementById("chatContainer");
  const chatInput     = document.getElementById("chatInput");
  const sendButton    = document.getElementById("sendButton");

  // join socket room
  socket.emit("join-group", groupId, currentUser);

  // load history
  fetch(`/api/group-chat/messages/${groupId}`)
    .then((r) => r.json())
    .then(renderMessages)
    .catch(console.error);

  // on new incoming
  socket.on("chat-message", (data) => {
    appendMessage(data, data.userId === currentUser);
  });
  socket.on("user-connected",   (u) => appendSystem(`${u} joined`)  );
  socket.on("user-disconnected",(u) => appendSystem(`${u} left`)    );

  // send
  sendButton.addEventListener("click", sendMessage);
  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;
    fetch(`/api/group-chat/send/${groupId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    });
    chatInput.value = "";
  }

  function renderMessages(msgs) {
    chatContainer.innerHTML = "";
    msgs.forEach((m) => appendMessage(m, m.userId === currentUser));
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  function appendMessage({ username, message }, isOwn) {
    const d = document.createElement("div");
    d.className = isOwn ? "message own" : "message";
    d.innerHTML = `<strong>${username}:</strong> ${message}`;
    chatContainer.appendChild(d);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  function appendSystem(text) {
    const d = document.createElement("div");
    d.className = "system-message";
    d.textContent = text;
    chatContainer.appendChild(d);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
});
