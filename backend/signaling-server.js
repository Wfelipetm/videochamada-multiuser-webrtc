
// Servidor de sinalização WebSocket puro
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

let clients = [];
wss.on('connection', function connection(ws) {
  clients.push(ws);
  ws.on('message', function incoming(message) {
    clients.forEach(function (client) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });
  ws.on('close', function () {
    clients = clients.filter(client => client !== ws);
  });
});

// Servidor de sinalização socket.io
const http = require('http');
const socketio = require('socket.io');
const server = http.createServer();
const io = socketio(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('Novo cliente socket.io conectado:', socket.id);
  socket.on('signal', (data) => {
    // Repasse para todos os outros clientes
    socket.broadcast.emit('signal', data);
  });
  socket.on('disconnect', () => {
    console.log('Cliente socket.io desconectado:', socket.id);
  });
});

server.listen(3003, () => {
  console.log('Servidor socket.io de sinalização rodando na porta 3003');
});

console.log('Servidor WebSocket puro rodando na porta 8080');
