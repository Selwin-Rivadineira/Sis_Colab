const socket = new WebSocket('ws://localhost:8080');
const messagesDiv = document.getElementById('messages');
const input = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');

const sendMessage = () => {
    const message = input.value.trim();
    if (message && socket.readyState === WebSocket.OPEN) {
        socket.send(message);
        input.value = '';
    }
};

sendButton.addEventListener('click', sendMessage);
input.addEventListener('keypress', (e) => e.key === 'Enter' && sendMessage());

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    const msgElement = document.createElement('div');
    msgElement.classList.add('message');

    if (data.type === 'system') {
        msgElement.classList.add('system');
        msgElement.textContent = data.message;
    } else if (data.type === 'self') {
        msgElement.classList.add('own');
        msgElement.innerHTML = `
            <div class="bubble">${escapeHtml(data.message)}</div>
            <div class="avatar own-avatar">Yo</div>
        `;
    } else {
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#a29bfe'];
        const color = colors[Math.abs(hashCode(data.user)) % colors.length];
        msgElement.innerHTML = `
            <div class="avatar" style="background: ${color}">${data.user.charAt(0).toUpperCase()}</div>
            <div class="bubble" style="background: ${color}20; border: 1px solid ${color}40;">
                <div class="username">${escapeHtml(data.user)}</div>
                ${escapeHtml(data.message)}
            </div>
        `;
    }

    messagesDiv.appendChild(msgElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
};

// Funciones auxiliares
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
}