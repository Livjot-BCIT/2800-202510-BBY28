// public/scripts/group_chat.js
document.addEventListener("DOMContentLoaded", () => {
  const socket       = io();
  const groupId      = document.querySelector('meta[name="group-id"]').content;
  const userId       = document.querySelector('meta[name="user-id"]').content;
  const chatInput    = document.getElementById("chatInput");
  const sendButton   = document.getElementById("sendButton");
  const chatContainer= document.getElementById("chatContainer");
  const sidebar      = document.querySelector(".chat-sidebar");
  const toggleBtn    = document.getElementById("toggleSidebarBtn");

  // 0) Sidebar toggle setup
 toggleBtn.addEventListener("click", () => {
  const hidden = sidebar.classList.toggle("collapsed");
  // .collapsed → display:none, default → display:block
  sidebar.style.display = hidden ? "none" : "";
  toggleBtn.textContent = hidden ? "☰" : "✖";
  localStorage.setItem("sidebarCollapsed", hidden);
});

// on load, restore:
if (localStorage.getItem("sidebarCollapsed")==="true") {
  sidebar.classList.add("collapsed");
  sidebar.style.display = "none";
  toggleBtn.textContent = "☰";
}
  // 1) join room
  socket.emit("join-group", groupId, userId);

  // 2) load history
  fetch(`/api/group-chat/messages/${groupId}`)
    .then(r => r.json())
    .then(msgs => msgs.forEach(m => appendMessage(m, m.userId === userId)))
    .catch(console.error);

  // 3) real‑time events
  socket.on("chat-message", data =>
    appendMessage(data, data.userId === userId)
  );
  socket.on("user-connected",   u => appendSystem(`${u} joined`)  );
  socket.on("user-disconnected",u => appendSystem(`${u} left`)    );

  // 4) send
  sendButton.addEventListener("click",    sendMessage);
  chatInput.addEventListener("keypress", e => e.key==="Enter" && sendMessage());

  function sendMessage(){
    const text = chatInput.value.trim();
    if (!text) return;
    fetch(`/api/group-chat/send/${groupId}`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ content: text })
    });
    chatInput.value = "";
  }

  function appendMessage({ username, userId, message, timestamp, profilePictureUrl }, isOwn){
    const wrapper = document.createElement("div");
    wrapper.className = `message ${isOwn?"own":"other"}`;

    const img = document.createElement("img");
    img.src = "/images/default-avatar.png"; // or pass down real avatar URL
    img.className = "avatar";

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.innerHTML = `<strong>${username}:</strong> ${message}`;

    const ts = document.createElement("div");
    ts.className = "timestamp";
    ts.textContent = new Date(timestamp).toLocaleTimeString([],{
      hour:"2-digit",minute:"2-digit"
    });

    if (isOwn) wrapper.append(bubble, img);
    else         wrapper.append(img, bubble);

    bubble.append(ts);
    chatContainer.appendChild(wrapper);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  function appendSystem(text){
    const d = document.createElement("div");
    d.className = "system-message";
    d.textContent = text;
    chatContainer.appendChild(d);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
});
