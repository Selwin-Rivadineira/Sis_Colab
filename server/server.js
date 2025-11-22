// Importa el módulo "ws" para crear un servidor WebSocket
const WebSocket = require('ws');
// Importa la librería de Google para validar el token de inicio de sesión
const { OAuth2Client } = require('google-auth-library');
// Permite leer parámetros en la URL (por ejemplo: ?token=123)
const { URL } = require('url');
// ID del cliente autorizado en Google Cloud Platform
const CLIENT_ID = '907364529014-u93kqtnn9u7025qu6otfk91h9j0v1qmg.apps.googleusercontent.com';
// Crea el cliente de Google para validar tokens
const client = new OAuth2Client(CLIENT_ID);
// Dominio permitido (solo correos que terminen en @gmail.com)
const CORPORATE_DOMAIN = 'gmail.com';
// Crea el servidor WebSocket en el puerto 8080
const wss = new WebSocket.Server({ port: 8080 });
// Evento cuando un cliente se conecta
wss.on('connection', async (ws, req) => {

    let username;   // Nombre del usuario
    let userColor;  // Color asignado al usuario
    try {
        // Obtiene el token de la URL del cliente
        const url = new URL(`http://localhost:8080${req.url}`);
        const token = url.searchParams.get('token');
        // Si no envía token, se rechaza la conexión
        if (!token) {
            ws.close(1008, 'Authentication token missing');
            return;
        }
        // Verifica el token con Google
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID
        });
        // Obtiene los datos del usuario verificado
        const payload = ticket.getPayload();
        // Extrae el email del usuario
        const userEmail = payload.email;
        // Verifica si el email pertenece al dominio permitido
        const isCorporateUser = userEmail.endsWith(`@${CORPORATE_DOMAIN}`);
        // Si el usuario no pertenece al dominio, se desconecta
        if (!isCorporateUser) {
            ws.close(1008, 'User not authorized by corporate IAM');
            return;
        }
        // Si pasa todo, obtiene el nombre
        username = payload.name || userEmail;
        // Colores para identificar usuarios
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'];
        // Calcula un color basado en el email
        const hash = userEmail
            .split('')
            .reduce((acc, char) => acc + char.charCodeAt(0), 0);

        userColor = colors[hash % colors.length];

    } catch (error) {
        // Si algo falla en la autenticación, se corta la conexión
        ws.close(1008, 'Invalid authentication token');
        return;
    }
    // Aviso para todos los usuarios cuando alguien entra
    broadcast({
        type: 'system',
        message: `${username} se ha unido al chat`,
        color: '#888'
    });
    // Manejo de mensajes enviados por el usuario
    ws.on('message', (message) => {
        // Envía el mensaje de vuelta solo al remitente
        ws.send(JSON.stringify({
            type: 'self',
            message: message.toString()
        }));
        // Envía el mensaje a los demás usuarios
        broadcast({
            type: 'chat',
            user: username,
            message: message.toString(),
            color: userColor
        }, ws);
    });
    // Evento cuando el usuario se desconecta
    ws.on('close', () => {
        broadcast({
            type: 'system',
            message: `${username} ha salido del chat`,
            color: '#888'
        });
    });
    // Función para enviar mensajes a todos los clientes
    function broadcast(data, excludeWs = null) {
        wss.clients.forEach(client => {
            // Envía solo a clientes conectados y distintos del remitente
            if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
            }
        });
    }
});
// Mensajes en consola para verificar que el servidor está activo
console.log('Servidor WebSocket activo en ws://localhost:8080');
console.log('Servidor HTTP activo en http://localhost:8081');
