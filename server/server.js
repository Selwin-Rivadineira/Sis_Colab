// server/server.js
// Importa el modulo "ws" para el webSocket
const WebSocket = require('ws');
// Importar librerías de Google para la validación
const { OAuth2Client } = require('google-auth-library');
// URL para parsear parámetros de consulta (query params)
const { URL } = require('url'); 

// 🛑 CLIENT_ID obtenido de Google Cloud Platform (GCP)
const CLIENT_ID = '907364529014-u93kqtnn9u7025qu6otfk91h9j0v1qmg.apps.googleusercontent.com'; 
const client = new OAuth2Client(CLIENT_ID);
// 🛑 Dominio de Autorización (Configurado a gmail.com para pruebas del usuario)
const CORPORATE_DOMAIN = 'gmail.com'; 

// Crea un servidor WebSocket en el puerto 8080
const wss = new WebSocket.Server({ port: 8080 });

// Evento que se ejecuta cuando un nuevo cliente se conecta
wss.on('connection', async (ws, req) => { 
    
    let username, userColor;
    
    try {
        // 1. Obtener el token de la URL
        const url = new URL(`http://localhost:8080${req.url}`);
        const token = url.searchParams.get('token');

        if (!token) {
            console.log('❌ Conexión rechazada: Token no encontrado.');
            ws.close(1008, 'Authentication token missing'); 
            return;
        }
        
        // 2. Verificar y decodificar el ID Token de Google
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID,
        });
        const payload = ticket.getPayload();
        
        // 3. Autorización IAM: Chequeo de dominio
        const userEmail = payload.email;
        const isCorporateUser = userEmail && userEmail.endsWith(`@${CORPORATE_DOMAIN}`);

        if (!isCorporateUser) {
            console.log(`❌ Usuario no autorizado (Fuera del dominio corporativo): ${userEmail}`);
            ws.close(1008, 'User not authorized by corporate IAM');
            return;
        }

        // Usuario autenticado y autorizado
        username = payload.name || userEmail; 
        
        // Asignación de color
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'];
        const hash = userEmail.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        userColor = colors[hash % colors.length];

    } catch (error) {
        console.error('❌ Error de autenticación o validación de token:', error.message);
        ws.close(1008, 'Invalid authentication token');
        return;
    }

    // --- Lógica del Chat ---
    broadcast({
        type: 'system',
        message: `🎉 ${username} se ha unido al chat (IAM verificado)`,
        color: '#888'
    });
    
    ws.on('message', (message) => {
        ws.send(JSON.stringify({
            type: 'self',
            message: message.toString()
        }));
        
        broadcast({
            type: 'chat',
            user: username, 
            message: message.toString(),
            color: userColor
        }, ws); 
    });
    
    ws.on('close', () => {
        broadcast({
            type: 'system',
            message: `👋 ${username} ha salido del chat`,
            color: '#888'
        });
    });
    
    function broadcast(data, excludeWs = null) {
        wss.clients.forEach(client => {
            if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
            }
        });
    }
});

console.log('🚀 Servidor activo en ws://localhost:8080');
console.log('🚀 Servidor activo en http://localhost:8081');