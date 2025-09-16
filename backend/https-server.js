const https = require('https');
const fs = require('fs');
const express = require('express');
const path = require('path');
const WebSocket = require('ws');
const socketio = require('socket.io');

const app = express();

// Sirva arquivos estáticos do Next.js
app.use('/_next', express.static(path.join(__dirname, '../front-end/.next')));
app.use('/static', express.static(path.join(__dirname, '../front-end/public')));

// Fallback para página principal exportada
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../front-end/out/index.html'));
});

const options = {
    key: fs.readFileSync(path.join(__dirname, 'certs', 'server.key')),
    cert: fs.readFileSync(path.join(__dirname, 'certs', 'server.crt'))
};

// Servidor HTTPS principal
const httpsServer = https.createServer(options, app);
httpsServer.listen(3002, () => {
    console.log('Servidor HTTPS rodando na porta 3002');
});

// Servidor de sinalização WebSocket puro
const wss = new WebSocket.Server({ port: 8080 });
let clients = [];
wss.on('connection', function connection(ws) {
    clients.push(ws);
    console.log('Novo cliente WebSocket conectado');
    ws.on('message', function incoming(message) {
        clients.forEach(function (client) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });
    ws.on('close', function () {
        clients = clients.filter(client => client !== ws);
        console.log('Cliente WebSocket desconectado');
    });
});


// Servidor de sinalização socket.io sobre HTTPS
const io = socketio(httpsServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

io.on('connection', (socket) => {
    console.log('Novo cliente socket.io conectado:', socket.id);
    // Envia lista de usuários conectados para o novo cliente
    const users = Array.from(io.sockets.sockets.keys()).filter(id => id !== socket.id);
    socket.emit('users', users);

    // Notifica todos os outros sobre o novo usuário
    socket.broadcast.emit('new-user', socket.id);

    // Permite que clientes solicitem lista de usuários a qualquer momento
    socket.on('get-users', () => {
        const users = Array.from(io.sockets.sockets.keys()).filter(id => id !== socket.id);
        socket.emit('users', users);
    });

    // Sinalização mesh: inclui o id do destino
    socket.on('signal', (data) => {
        if (data.to) {
            // Sinalização direta para um usuário
            io.to(data.to).emit('signal', { ...data, from: socket.id });
        } else {
            // Repasse para todos os outros clientes (fallback)
            socket.broadcast.emit('signal', { ...data, from: socket.id });
        }
    });

    socket.on('disconnect', () => {
        console.log('Cliente socket.io desconectado:', socket.id);
        socket.broadcast.emit('user-disconnected', socket.id);
    });
});

console.log('Servidor socket.io de sinalização rodando na porta 3002 (HTTPS)');

console.log('Servidor WebSocket puro rodando na porta 8080');
