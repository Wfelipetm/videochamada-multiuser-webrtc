import React, { useRef, useEffect, useState } from 'react';
import { io } from 'socket.io-client';


const SIGNALING_IO_URL = 'https://10.200.200.22:3002'; // socket.io

export default function VideoCall() {
    const [errorMsg, setErrorMsg] = useState("");
    const localVideoRef = useRef(null);
    const [remoteStreams, setRemoteStreams] = useState([]); // [{id, stream}]
    const peerConnections = useRef({}); // {userId: RTCPeerConnection}
    const ioRef = useRef(null); // socket.io
    const localStreamRef = useRef(null);
    const [cameraReady, setCameraReady] = useState(false);
    const [users, setUsers] = useState([]); // lista de usuários conectados
    const [audioEnabled, setAudioEnabled] = useState(true);
    const [videoEnabled, setVideoEnabled] = useState(true);
    const [fullScreenId, setFullScreenId] = useState(null); // ID do vídeo em tela cheia, null = nenhum

    // Função para calcular o número ideal de colunas com base no número de participantes
    const getGridLayout = (remoteCount) => {
        const totalCount = remoteCount + 1; // incluindo vídeo local

        // Define o número de colunas com base no número total de participantes
        let columns;
        if (totalCount <= 1) {
            columns = 1;
        } else if (totalCount <= 4) {
            columns = 2;
        } else if (totalCount <= 9) {
            columns = 3;
        } else if (totalCount <= 16) {
            columns = 4;
        } else {
            columns = 5;
        }

        // Calcula aspectRatio e tamanho máximo
        let aspectRatio = '16/9';
        let maxWidth = '100%';

        if (totalCount > 4) {
            aspectRatio = '4/3';
        }

        if (totalCount > 9) {
            aspectRatio = '1/1';
        }

        return {
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: totalCount > 9 ? '5px' : '10px',
            videoStyle: {
                aspectRatio,
                maxWidth
            }
        };
    };

    // Função para criar PeerConnection para um usuário
    const createPeerConnection = (userId) => {
        if (!localStreamRef.current) {
            setErrorMsg('Stream local não disponível ao criar peer para ' + userId + '. Aguarde a liberação da câmera.');
            return null;
        }
        const pc = new window.RTCPeerConnection();
        // Adiciona as tracks apenas se o stream estiver disponível
        const tracks = localStreamRef.current.getTracks ? localStreamRef.current.getTracks() : [];
        tracks.forEach(track => pc.addTrack(track, localStreamRef.current));

        pc.onicecandidate = event => {
            if (event.candidate && ioRef.current) {
                ioRef.current.emit('signal', { type: 'candidate', candidate: event.candidate, to: userId });
            }
        };

        pc.ontrack = event => {
            setRemoteStreams(prev => {
                const already = prev.find(s => s.id === userId);
                if (already) return prev;
                return [...prev, { id: userId, stream: event.streams[0] }];
            });
        };

        peerConnections.current[userId] = pc;
        return pc;
    };

    // Função para solicitar acesso à câmera/microfone
    const solicitarCamera = () => {
        if (typeof window !== "undefined" && navigator.mediaDevices) {
            console.log('Solicitando acesso à câmera e microfone...');
            navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                .then(stream => {
                    console.log('Permissão concedida, stream obtido:', stream);
                    localStreamRef.current = stream;
                    if (localVideoRef.current) {
                        localVideoRef.current.srcObject = stream;
                    }
                    setCameraReady(true); // Isso vai disparar o useEffect que configura as conexões
                })
                .catch(err => {
                    console.error('Erro ao acessar câmera/microfone:', err);
                    setErrorMsg('Erro ao acessar câmera/microfone: ' + err.message);
                });
        }
    };

    // Toggle áudio
    const toggleAudio = () => {
        if (localStreamRef.current) {
            const audioTracks = localStreamRef.current.getAudioTracks();
            if (audioTracks.length > 0) {
                const enabled = !audioEnabled;
                audioTracks.forEach(track => {
                    track.enabled = enabled;
                });
                setAudioEnabled(enabled);
            }
        }
    };

    // Toggle vídeo
    const toggleVideo = () => {
        if (localStreamRef.current) {
            const videoTracks = localStreamRef.current.getVideoTracks();
            if (videoTracks.length > 0) {
                const enabled = !videoEnabled;
                videoTracks.forEach(track => {
                    track.enabled = enabled;
                });
                setVideoEnabled(enabled);
            }
        }
    };

    // Toggle tela cheia para um vídeo
    const toggleFullScreen = (id) => {
        setFullScreenId(currentId => currentId === id ? null : id);
    };

    // Função para calcular o número ideal de colunas com base no número de participantes
    const getGridColumns = (remoteCount) => {
        const totalCount = remoteCount + 1; // incluindo vídeo local

        if (totalCount <= 2) {
            return 'repeat(2, 1fr)'; // 2 colunas para 1-2 participantes
        } else if (totalCount <= 4) {
            return 'repeat(2, 1fr)'; // 2 colunas para 3-4 participantes
        } else if (totalCount <= 9) {
            return 'repeat(3, 1fr)'; // 3 colunas para 5-9 participantes
        } else if (totalCount <= 16) {
            return 'repeat(4, 1fr)'; // 4 colunas para 10-16 participantes
        } else {
            return 'repeat(5, 1fr)'; // 5 colunas para 17+ participantes
        }
    };

    // Calcula tamanho do vídeo com base no número de participantes
    const getVideoSize = (remoteCount) => {
        const totalCount = remoteCount + 1;

        if (totalCount <= 2) {
            return { width: '100%', aspectRatio: '16/9' };
        } else if (totalCount <= 6) {
            return { width: '100%', aspectRatio: '4/3' };
        } else {
            return { width: '100%', aspectRatio: '1/1' };
        }
    };

    // Conecta ao servidor de sinalização quando o componente monta
    useEffect(() => {
        if (typeof window !== "undefined") {
            ioRef.current = io(SIGNALING_IO_URL, { transports: ['websocket'] });
            ioRef.current.on('connect', () => {
                console.log('Conectado via socket.io:', ioRef.current.id);
            });

            // Cleanup on unmount
            return () => {
                if (ioRef.current) ioRef.current.disconnect();
                Object.values(peerConnections.current).forEach(pc => pc.close());
                if (localStreamRef.current) localStreamRef.current.getTracks().forEach(track => track.stop());
            };
        }
    }, []); // Roda apenas na montagem/desmontagem

    // Configura event listeners para sinalização WebRTC apenas quando a câmera estiver pronta
    useEffect(() => {
        // Só prossegue se a câmera estiver pronta e o socket conectado
        if (!cameraReady || !localStreamRef.current || !ioRef.current) return;

        console.log('Configurando event listeners de sinalização WebRTC com stream de câmera pronto');

        // Limpa conexões existentes
        Object.values(peerConnections.current).forEach(pc => pc.close());
        peerConnections.current = {};
        setRemoteStreams([]);

        ioRef.current.on('users', (userList) => {
            setUsers(userList);
            // Para cada usuário já presente, inicia conexão
            userList.forEach(async (userId) => {
                if (!peerConnections.current[userId]) {
                    const pc = createPeerConnection(userId);
                    if (pc) {
                        try {
                            const offer = await pc.createOffer();
                            await pc.setLocalDescription(offer);
                            ioRef.current.emit('signal', { type: 'offer', offer, to: userId });
                        } catch (err) {
                            console.error('Erro ao criar oferta para', userId, err);
                        }
                    }
                }
            });
        });

        ioRef.current.on('new-user', async (userId) => {
            setUsers(prev => [...prev, userId]);
            // Quando novo usuário entra, inicia conexão mesh
            if (!peerConnections.current[userId]) {
                const pc = createPeerConnection(userId);
                if (pc) {
                    try {
                        const offer = await pc.createOffer();
                        await pc.setLocalDescription(offer);
                        ioRef.current.emit('signal', { type: 'offer', offer, to: userId });
                    } catch (err) {
                        console.error('Erro ao criar oferta para novo usuário', userId, err);
                    }
                }
            }
        });

        ioRef.current.on('user-disconnected', (userId) => {
            setUsers(prev => prev.filter(id => id !== userId));
            setRemoteStreams(prev => prev.filter(s => s.id !== userId));
            if (peerConnections.current[userId]) {
                peerConnections.current[userId].close();
                delete peerConnections.current[userId];
            }
        });

        ioRef.current.on('signal', async (data) => {
            if (!data.from) return;

            let pc = peerConnections.current[data.from];
            if (!pc) {
                pc = createPeerConnection(data.from);
                if (!pc) return; // Se não conseguiu criar PC, aborta
            }

            if (data.type === 'offer') {
                try {
                    await pc.setRemoteDescription(new window.RTCSessionDescription(data.offer));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    ioRef.current.emit('signal', { type: 'answer', answer, to: data.from });
                } catch (err) {
                    console.error('Erro ao processar offer:', err);
                }
            } else if (data.type === 'answer') {
                // Processa resposta apenas se estamos esperando uma
                try {
                    if (pc.signalingState === 'have-local-offer') {
                        await pc.setRemoteDescription(new window.RTCSessionDescription(data.answer));
                    }
                    // Ignoramos silenciosamente outros estados
                } catch (err) {
                    console.error('Erro ao processar answer:', err);
                }
            } else if (data.type === 'candidate') {
                try {
                    await pc.addIceCandidate(new window.RTCIceCandidate(data.candidate));
                } catch (e) {
                    // Ignoramos silenciosamente erros de ICE candidates
                }
            }
        });

        // Pede lista de usuários atualizada ao servidor
        ioRef.current.emit('get-users');

        // Cleanup function para este useEffect específico
        return () => {
            if (ioRef.current) {
                ioRef.current.off('users');
                ioRef.current.off('new-user');
                ioRef.current.off('user-disconnected');
                ioRef.current.off('signal');
            }
        };
    }, [cameraReady]); // Depende apenas de cameraReady    // Botão de iniciar chamada agora só serve para garantir que câmera está pronta
    const startCall = async () => {
        if (!localStreamRef.current) {
            alert('Câmera não inicializada. Aguarde o carregamento.');
            return;
        }

        // Pede lista de usuários atualizada ao servidor
        if (ioRef.current) {
            ioRef.current.emit('get-users');
            alert('Reconectando com usuários existentes...');
        } else {
            alert('Conexão com servidor perdida. Recarregue a página.');
        }
    };

    return (
        <div style={{
            maxWidth: '100%',
            margin: '0 auto',
            padding: '20px',
            fontFamily: 'Arial, sans-serif'
        }}>
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                borderBottom: '1px solid #eee',
                paddingBottom: '10px'
            }}>
                <h1 style={{ margin: 0, fontSize: '24px' }}>WebRTC Vídeo Chamada</h1>
                <div style={{
                    background: '#f0f0f0',
                    padding: '8px 12px',
                    borderRadius: '20px',
                    fontSize: '14px',
                    color: users.length > 0 ? '#4caf50' : '#f44336'
                }}>
                    {users.length > 0 ? `${users.length} participante${users.length > 1 ? 's' : ''}` : 'Ninguém conectado'}
                </div>
            </header>

            {errorMsg && (
                <div style={{
                    background: '#ffebee',
                    color: '#c62828',
                    padding: '10px 15px',
                    borderRadius: '4px',
                    marginBottom: '15px'
                }}>
                    {errorMsg}
                </div>
            )}

            {!cameraReady && (
                <div style={{
                    background: '#e3f2fd',
                    borderRadius: '4px',
                    padding: '20px',
                    textAlign: 'center',
                    marginBottom: '20px'
                }}>
                    <p style={{ marginBottom: '15px' }}>
                        Para participar da chamada, precisamos de acesso à sua câmera e microfone.
                    </p>
                    <button
                        onClick={solicitarCamera}
                        style={{
                            background: '#2196f3',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '16px'
                        }}
                    >
                        Permitir acesso à câmera
                    </button>
                </div>
            )}

            {fullScreenId ? (
                <div style={{ position: 'relative', height: '80vh', marginBottom: '15px' }}>
                    {fullScreenId === 'local' ? (
                        <video
                            ref={localVideoRef}
                            autoPlay
                            muted
                            playsInline
                            style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
                        />
                    ) : (
                        <video
                            autoPlay
                            playsInline
                            style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
                            ref={el => {
                                const stream = remoteStreams.find(s => s.id === fullScreenId)?.stream;
                                if (el && stream) el.srcObject = stream;
                            }}
                        />
                    )}
                    <button
                        onClick={() => toggleFullScreen(null)}
                        style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            background: 'rgba(0,0,0,0.5)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '5px 10px',
                            cursor: 'pointer'
                        }}
                    >
                        Sair da tela cheia
                    </button>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    ...getGridLayout(remoteStreams.length),
                    marginBottom: '20px'
                }}>
                    <div style={{ position: 'relative' }}>
                        <video
                            ref={localVideoRef}
                            autoPlay
                            muted
                            playsInline
                            style={{
                                width: '100%',
                                borderRadius: '8px',
                                background: '#000',
                                border: '2px solid #4caf50',
                                ...getGridLayout(remoteStreams.length).videoStyle,
                                objectFit: 'cover'
                            }}
                        />
                        <div style={{
                            position: 'absolute',
                            left: '10px',
                            bottom: '10px',
                            background: 'rgba(0,0,0,0.5)',
                            color: 'white',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '12px'
                        }}>
                            Você (local)
                        </div>
                        <button
                            onClick={() => toggleFullScreen('local')}
                            style={{
                                position: 'absolute',
                                top: '10px',
                                right: '10px',
                                background: 'rgba(0,0,0,0.5)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '5px',
                                cursor: 'pointer',
                                fontSize: '12px'
                            }}
                        >
                            Ampliar
                        </button>
                    </div>

                    {remoteStreams.map(({ id, stream }) => (
                        <div key={id} style={{ position: 'relative' }}>
                            <video
                                autoPlay
                                playsInline
                                style={{
                                    width: '100%',
                                    borderRadius: '8px',
                                    background: '#000',
                                    border: '2px solid #2196f3',
                                    ...getGridLayout(remoteStreams.length).videoStyle,
                                    objectFit: 'cover'
                                }}
                                ref={el => { if (el) el.srcObject = stream; }}
                            />
                            <div style={{
                                position: 'absolute',
                                left: '10px',
                                bottom: '10px',
                                background: 'rgba(0,0,0,0.5)',
                                color: 'white',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '12px'
                            }}>
                                Participante {id.substring(0, 5)}
                            </div>
                            <button
                                onClick={() => toggleFullScreen(id)}
                                style={{
                                    position: 'absolute',
                                    top: '10px',
                                    right: '10px',
                                    background: 'rgba(0,0,0,0.5)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '5px',
                                    cursor: 'pointer',
                                    fontSize: '12px'
                                }}
                            >
                                Ampliar
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {cameraReady && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    padding: '15px',
                    gap: '15px',
                    borderTop: '1px solid #eee',
                    flexWrap: 'wrap'
                }}>
                    <button
                        onClick={toggleAudio}
                        style={{
                            background: audioEnabled ? '#4caf50' : '#f44336',
                            color: 'white',
                            border: 'none',
                            padding: '12px 20px',
                            borderRadius: '50px',
                            cursor: 'pointer',
                            minWidth: '130px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                        }}
                    >
                        <span style={{ fontSize: '18px' }}>{audioEnabled ? '🎙️' : '🔇'}</span>
                        <span>Microfone {audioEnabled ? 'ON' : 'OFF'}</span>
                    </button>

                    <button
                        onClick={toggleVideo}
                        style={{
                            background: videoEnabled ? '#4caf50' : '#f44336',
                            color: 'white',
                            border: 'none',
                            padding: '12px 20px',
                            borderRadius: '50px',
                            cursor: 'pointer',
                            minWidth: '130px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                        }}
                    >
                        <span style={{ fontSize: '18px' }}>{videoEnabled ? '📹' : '⛔'}</span>
                        <span>Câmera {videoEnabled ? 'ON' : 'OFF'}</span>
                    </button>

                    <button
                        onClick={startCall}
                        style={{
                            background: '#2196f3',
                            color: 'white',
                            border: 'none',
                            padding: '12px 20px',
                            borderRadius: '50px',
                            cursor: 'pointer',
                            minWidth: '130px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                        }}
                    >
                        <span style={{ fontSize: '18px' }}>🔄</span>
                        <span>Reconectar</span>
                    </button>
                </div>
            )}
        </div>
    );
}

