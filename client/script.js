// client/script.js
let socket = null; // Variable para almacenar la conexión WebSocket
const messagesDiv = document.getElementById('messages'); // Contenedor donde se mostrarán los mensajes
const input = document.getElementById('messageInput');   // Campo de texto donde el usuario escribe
const sendButton = document.getElementById('sendButton'); // Botón para enviar el mensaje

// Función para iniciar el chat tras recibir el ID Token de Google
const startChat = (idToken) => {

    // Construye la URL del WebSocket INCLUYENDO el token JWT como parámetro
    const url = `ws://localhost:8080?token=${idToken}`;
    socket = new WebSocket(url); // Abre la conexión WebSocket con autenticación

    // Oculta la interfaz de login de Google
    document.getElementById('g_id_onload').style.display = 'none';
    document.querySelector('.g_id_signin').style.display = 'none';

    // Muestra el área del chat para el usuario autenticado
    document.getElementById('chatWrapper').style.display = 'flex';

    // EVENTO: llega un mensaje desde el servidor
    socket.onmessage = (event) => {
        const data = JSON.parse(event.data); // Convierte el mensaje en objeto JS
        const msgElement = document.createElement('div'); // Crea un contenedor para el mensaje
        msgElement.classList.add('message'); // Clase base de mensaje

        // Mensajes del tipo "system" (ej.: "Usuario se conectó")
        if (data.type === 'system') {
            msgElement.classList.add('system');
            msgElement.textContent = data.message;

        // Mensaje enviado por el propio usuario ("self")
        } else if (data.type === 'self') {
            msgElement.classList.add('own');
            msgElement.innerHTML = `
                <div class="bubble">${escapeHtml(data.message)}</div>
                <div class="avatar own-avatar">Yo</div>
            `;

        // Mensaje enviado por otros usuarios
        } else {
            const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#a29bfe'];
            const color = colors[Math.abs(hashCode(data.user)) % colors.length]; 
            // Genera un color según el nombre del usuario (siempre igual)

            msgElement.innerHTML = `
                <div class="avatar" style="background: ${color}">
                    ${data.user.charAt(0).toUpperCase()}
                </div>
                <div class="bubble" style="background: ${color}20; border: 1px solid ${color}40;">
                    <div class="username">${escapeHtml(data.user)}</div>
                    ${escapeHtml(data.message)}
                </div>
            `;
        }

        messagesDiv.appendChild(msgElement); // Agrega el mensaje al chat
        messagesDiv.scrollTop = messagesDiv.scrollHeight; // Auto-scroll hacia abajo
    };

    // EVENTO: conexión WebSocket abierta
    socket.onopen = () => {
        console.log("Conexión WebSocket establecida con autenticación.");
    };

    // EVENTO: conexión cerrada (error o token inválido)
    socket.onclose = (event) => {
        console.error(`Conexión cerrada. Código: ${event.code}. Razón: ${event.reason}`);
        alert('La conexión fue rechazada o se perdió (posible fallo de autenticación).');
    };

    // EVENTO: error en la conexión
    socket.onerror = (error) => {
        console.error("Error WebSocket:", error);
    };
};

// Función que Google llama AUTOMÁTICAMENTE cuando el usuario inicia sesión
window.handleCredentialResponse = (response) => {
    if (response.credential) {
        // El campo 'credential' ES el JWT ID Token
        startChat(response.credential); // Inicia la conexión WebSocket autenticada
    }
};

// Función para enviar mensajes al servidor
const sendMessage = () => {
    const message = input.value.trim(); // Quita espacios a los lados

    if (message && socket && socket.readyState === WebSocket.OPEN) {
        socket.send(message); // Envia el texto al servidor
        input.value = '';     // Limpia el campo de texto
    }
};

// Evento: enviar cuando se hace clic en el botón
sendButton.addEventListener('click', sendMessage);

// Evento: enviar cuando se presiona Enter
input.addEventListener('keypress', (e) => e.key === 'Enter' && sendMessage());

// Función para evitar que HTML malicioso se renderice
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML; // Devuelve texto seguro para poner en HTML
}
// Función hash simple para asignar colores a los usuarios
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
}
