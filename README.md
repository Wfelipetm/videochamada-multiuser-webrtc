# Projeto: Video Chamada WebRTC Mesh

## Visão Geral

Este projeto implementa uma aplicação de videochamada em grupo baseada em WebRTC, com sinalização via **Socket.io** e **WebSocket** puro, interface responsiva e controles modernos de mídia. Suporta múltiplos participantes simultâneos (mesh), cada um com seu próprio vídeo e áudio, e oferece uma experiência de usuário intuitiva.

---

## Estrutura do Projeto

```
webrtc.js-master/
├── backend/
│   └── https-server.js      # Servidor HTTPS + Socket.io + WebSocket puro
├── front-end/
│   ├── src/
│   │   └── app/
│   │       └── VideoCall.js # Componente principal da chamada de vídeo
│   ├── public/              # Arquivos estáticos
│   └── .next/               # Build do Next.js
├── certs/
│   ├── server.key           # Chave privada SSL
│   └── server.crt           # Certificado SSL
├── package.json
├── README.md
└── test/
    └── basic.js
```

---

## Backend

### Arquivo: `backend/https-server.js`

- **Servidor HTTPS**: Utiliza certificados SSL para comunicação segura.
- **Express**: Serve arquivos estáticos do front-end exportado pelo Next.js.
- **Socket.io**: Gerencia sinalização WebRTC para múltiplos usuários, permitindo conexões mesh.
- **WebSocket Puro**: Alternativa para sinalização direta entre clientes.
- **Gerenciamento de Usuários**: Mantém lista de usuários conectados, notifica entradas/saídas e repassa mensagens de sinalização.

#### Principais Endpoints/Portas

- HTTPS + Socket.io: `https://<host>:3002`
- WebSocket puro: `ws://<host>:8080`

#### Certificados

- Os arquivos `server.key` e `server.crt` devem estar em `backend/certs/`.

---

## Front-End

### Arquivo: `front-end/src/app/VideoCall.js`

- **React**: Componente principal gerencia estado da chamada, streams locais/remotos e controles de mídia.
- **WebRTC**: Cria múltiplos `RTCPeerConnection` para cada participante (mesh).
- **Socket.io**: Sinalização para troca de ofertas, respostas e candidatos ICE.
- **Layout Responsivo**: Grid dinâmico que se adapta ao número de participantes.
- **Controles Modernos**: Botões de microfone, câmera e reconexão com design intuitivo e feedback visual.
- **Tela Cheia**: Permite ampliar qualquer vídeo (local ou remoto).

#### Principais Funções

- `createPeerConnection(userId)`: Cria conexão WebRTC para cada usuário.
- `toggleAudio()`, `toggleVideo()`: Ativa/desativa microfone e câmera.
- `getGridLayout(remoteCount)`: Calcula layout ideal para vídeos.
- `solicitarCamera()`: Solicita permissão de mídia ao usuário.

---

## Como Executar

1. **Gerar Certificados SSL**  
   Coloque `server.key` e `server.crt` em `backend/certs/`.

2. **Instalar Dependências**  
   No diretório raiz:
   ```sh
   npm install
   ```

3. **Build do Front-End**  
   ```sh
   cd front-end
   npm run build
   ```

4. **Iniciar Backend**  
   ```sh
   cd ../backend
   node https-server.js
   ```

5. **Acessar Aplicação**  
   Abra `https://localhost:3002` no navegador.

---

## Funcionalidades

- **Chamada em Grupo Mesh**: Todos os participantes conectam-se entre si.
- **Interface Responsiva**: Grid de vídeos se adapta ao número de usuários.
- **Controles de Mídia**: Microfone, câmera e reconexão com feedback visual.
- **Tela Cheia**: Qualquer vídeo pode ser ampliado.
- **Sinalização Segura**: Comunicação via HTTPS e WebSocket.

---

## Requisitos

- Node.js >= 14
- Certificados SSL válidos
- Navegador compatível com WebRTC (Chrome, Firefox, Edge)

---

## Observações

- O backend serve tanto a página principal quanto arquivos estáticos do Next.js.
- O sistema de sinalização mesh permite escalabilidade para múltiplos participantes.
- O layout e controles foram otimizados para usabilidade e acessibilidade.

---

## Créditos

Desenvolvido por Wallace Moreira e colaboradores.  
Baseado em tecnologias open-source: WebRTC, Socket.io, React, Express.
