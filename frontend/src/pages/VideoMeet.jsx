import React, { useEffect, useRef, useState } from 'react'
import io from "socket.io-client";
import { motion } from 'framer-motion'; // Import framer-motion
import {
    VideoCameraIcon,
    VideoCameraSlashIcon,
    PhoneXMarkIcon,
    MicrophoneIcon,
    NoSymbolIcon,
    ComputerDesktopIcon,
    ChatBubbleLeftRightIcon,
    StopCircleIcon,
} from '@heroicons/react/24/solid';
import { FaceSmileIcon } from '@heroicons/react/24/outline'; // Import Heroicons
import server from '../environment';
import meetingService from '../services/meeting.service';
import Chat from './Chat';
import Video from './Video';
import Lobby from './Lobby';

const server_url = server;

var connections = {};

const peerConfigConnections = {
    "iceServers": [
        { "urls": "stun:stun.l.google.com:19302" }
    ]
}

export default function VideoMeetComponent() {

    var socketRef = useRef();
    let socketIdRef = useRef();

    let localVideoref = useRef();

    let [videoAvailable, setVideoAvailable] = useState(true);

    let [audioAvailable, setAudioAvailable] = useState(true);

    let [video, setVideo] = useState();

    let [audio, setAudio] = useState();

    let [screen, setScreen] = useState();

    let [showModal, setModal] = useState(true);

    let [screenAvailable, setScreenAvailable] = useState();

    let [messages, setMessages] = useState([])

    let [message, setMessage] = useState("");

    let [newMessages, setNewMessages] = useState(3);

    let [askForUsername, setAskForUsername] = useState(true);

    let [username, setUsername] = useState("");

    // Meeting password gate (for scheduled meetings with password)
    const [meetingCode, setMeetingCode] = useState(() => {
        const path = typeof window !== 'undefined' ? window.location.pathname : '';
        return path.startsWith('/meeting/') ? (path.split('/')[2] || '') : (path.slice(1).split('/')[0] || '');
    });
    const [meetingCheckDone, setMeetingCheckDone] = useState(false);
    const [requiresPassword, setRequiresPassword] = useState(false);
    const [passwordVerified, setPasswordVerified] = useState(() => {
        if (typeof window === 'undefined') return false;
        const path = window.location.pathname;
        const code = path.startsWith('/meeting/') ? (path.split('/')[2] || '') : (path.slice(1).split('/')[0] || '');
        return code ? sessionStorage.getItem(`meeting_${code}_verified`) === 'true' : false;
    });
    const [joinPassword, setJoinPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const videoRef = useRef([]);
    const [videos, setVideos] = useState([]);
    const [participantNames, setParticipantNames] = useState({});
    const [notifications, setNotifications] = useState([]);
    const [stickers, setStickers] = useState([]);
    const [showStickerPicker, setShowStickerPicker] = useState(false);

    const STICKERS = ['👍', '👏', '❤️', '😂', '😮', '🔥', '🎉', '👋'];



    useEffect(() => {
        getPermissions();
    }, []);

    // Check if this meeting requires a password (scheduled meeting with password)
    useEffect(() => {
        if (!meetingCode) {
            setMeetingCheckDone(true);
            return;
        }
        let cancelled = false;
        (async () => {
            const result = await meetingService.getMeetingByCode(meetingCode);
            if (cancelled) return;
            setMeetingCheckDone(true);
            if (result.success && result.exists && result.requiresPassword) {
                setRequiresPassword(true);
            }
        })();
        return () => { cancelled = true; };
    }, [meetingCode]);

    let getDislayMedia = () => {
        if (screen) {
            if (navigator.mediaDevices.getDisplayMedia) {
                navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
                    .then(getDislayMediaSuccess)
                    .then((stream) => { })
                    .catch((e) => console.log(e))
            }
        }
    }

    const getPermissions = async () => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.error('getUserMedia not supported');
                setVideoAvailable(false);
                setAudioAvailable(false);
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: true 
            });
            
            if (stream) {
                setVideoAvailable(true);
                setAudioAvailable(true);
                console.log('Permissions granted');
                
                if (localVideoref.current) {
                    localVideoref.current.srcObject = stream;
                }
                window.localStream = stream;
            }

            if (navigator.mediaDevices.getDisplayMedia) {
                setScreenAvailable(true);
            } else {
                setScreenAvailable(false);
            }
        } catch (error) {
            console.log('Permission error:', error);
            setVideoAvailable(false);
            setAudioAvailable(false);
        }
    };

    useEffect(() => {
        if (video !== undefined && audio !== undefined) {
            getUserMedia();


        }


    }, [video, audio])
    let getMedia = (overrideVideo, overrideAudio) => {
        const v = overrideVideo !== undefined ? overrideVideo : (video !== undefined ? video : videoAvailable);
        const a = overrideAudio !== undefined ? overrideAudio : (audio !== undefined ? audio : audioAvailable);
        setVideo(v);
        setAudio(a);
        connectToSocketServer();
    }




    let getUserMediaSuccess = (stream) => {
        try {
            window.localStream.getTracks().forEach(track => track.stop())
        } catch (e) { console.log(e) }

        window.localStream = stream
        localVideoref.current.srcObject = stream

        for (let id in connections) {
            if (id === socketIdRef.current) continue

            connections[id].addStream(window.localStream)

            connections[id].createOffer().then((description) => {
                console.log(description)
                connections[id].setLocalDescription(description)
                    .then(() => {
                        socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                    })
                    .catch(e => console.log(e))
            })
        }

        stream.getTracks().forEach(track => track.onended = () => {
            setVideo(false);
            setAudio(false);

            try {
                let tracks = localVideoref.current.srcObject.getTracks()
                tracks.forEach(track => track.stop())
            } catch (e) { console.log(e) }

            let blackSilence = (...args) => new MediaStream([black(...args), silence()])
            window.localStream = blackSilence()
            localVideoref.current.srcObject = window.localStream

            for (let id in connections) {
                connections[id].addStream(window.localStream)

                connections[id].createOffer().then((description) => {
                    connections[id].setLocalDescription(description)
                        .then(() => {
                            socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                        })
                        .catch(e => console.log(e))
                })
            }
        })
    }

    let getUserMedia = (stream) => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.error('getUserMedia not available');
            return;
        }

        if ((video && videoAvailable) || (audio && audioAvailable)) {
            navigator.mediaDevices.getUserMedia({ video: video, audio: audio })
                .then(getUserMediaSuccess)
                .catch((e) => console.log(e))
        } else {
            try {
                let tracks = localVideoref.current.srcObject.getTracks()
                tracks.forEach(track => track.stop())
            } catch (e) { }
        }
    }





    let getDislayMediaSuccess = (stream) => {
        console.log("HERE")
        try {
            window.localStream.getTracks().forEach(track => track.stop())
        } catch (e) { console.log(e) }

        window.localStream = stream
        localVideoref.current.srcObject = stream

        for (let id in connections) {
            if (id === socketIdRef.current) continue

            connections[id].addStream(window.localStream)

            connections[id].createOffer().then((description) => {
                connections[id].setLocalDescription(description)
                    .then(() => {
                        socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                    })
                    .catch(e => console.log(e))
            })
        }

        stream.getTracks().forEach(track => track.onended = () => {
            setScreen(false)

            try {
                let tracks = localVideoref.current.srcObject.getTracks()
                tracks.forEach(track => track.stop())
            } catch (e) { console.log(e) }

            let blackSilence = (...args) => new MediaStream([black(...args), silence()])
            window.localStream = blackSilence()
            localVideoref.current.srcObject = window.localStream

            getUserMedia()

        })
    }

    let gotMessageFromServer = (fromId, message) => {
        var signal = JSON.parse(message)

        if (fromId !== socketIdRef.current) {
            if (signal.sdp) {
                connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
                    if (signal.sdp.type === 'offer') {
                        connections[fromId].createAnswer().then((description) => {
                            connections[fromId].setLocalDescription(description).then(() => {
                                socketRef.current.emit('signal', fromId, JSON.stringify({ 'sdp': connections[fromId].localDescription }))
                            }).catch(e => console.log(e))
                        }).catch(e => console.log(e))
                    }
                }).catch(e => console.log(e))
            }

            if (signal.ice) {
                connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e))
            }
        }
    }




    let connectToSocketServer = () => {
        socketRef.current = io.connect(server_url, { secure: false })

        socketRef.current.on('signal', gotMessageFromServer)

        socketRef.current.on('connect', () => {
            socketRef.current.emit('join-call', window.location.href, username);
            socketIdRef.current = socketRef.current.id;

            socketRef.current.on('chat-message', addMessage);

            socketRef.current.on('user-left', (id, leftName) => {
                setVideos((v) => v.filter((video) => video.socketId !== id));
                setParticipantNames((p) => {
                    const next = { ...p };
                    delete next[id];
                    return next;
                });
                setNotifications((n) => [...n.slice(-4), { id: Date.now(), msg: `${leftName || 'Someone'} left the meeting`, type: 'leave' }]);
            });

            socketRef.current.on('user-joined', (id, clients, joinedName) => {
                if (joinedName) {
                    setParticipantNames((p) => ({ ...p, [id]: joinedName }));
                    if (id !== socketIdRef.current) {
                        setNotifications((n) => [...n.slice(-4), { id: Date.now(), msg: `${joinedName} joined the meeting`, type: 'join' }]);
                    }
                }
                clients.forEach((socketListId) => {

                    connections[socketListId] = new RTCPeerConnection(peerConfigConnections)
                    console.log("ADDING CONNECTION FOR ", socketListId);
                    connections[socketListId].onicecandidate = function (event) {
                        if (event.candidate != null) {
                            socketRef.current.emit('signal', socketListId, JSON.stringify({ 'ice': event.candidate }))
                        }
                    }


                    connections[socketListId].onaddstream = (event) => {
                        console.log("BEFORE:", videoRef.current);
                        console.log("FINDING ID: ", socketListId);

                        let videoExists = videoRef.current.find(video => video.socketId === socketListId);

                        if (videoExists) {
                            console.log("FOUND EXISTING");


                            setVideos(videos => {
                                const updatedVideos = videos.map(video =>
                                    video.socketId === socketListId ? { ...video, stream: event.stream } : video
                                );
                                videoRef.current = updatedVideos;
                                return updatedVideos;
                            });
                        } else {
                            console.log("NOT FOUND");
                            console.log("CREATING NEW");
                            let newVideo = {
                                socketId: socketListId,
                                stream: event.stream,
                                autoplay: true,
                                playsinline: true
                            };

                            setVideos(videos => {
                                const updatedVideos = [...videos, newVideo];
                                videoRef.current = updatedVideos;
                                return updatedVideos;
                            });
                        }
                    };



                    if (window.localStream !== undefined && window.localStream !== null) {
                        connections[socketListId].addStream(window.localStream)
                    } else {
                        let blackSilence = (...args) => new MediaStream([black(...args), silence()])
                        window.localStream = blackSilence()
                        connections[socketListId].addStream(window.localStream)
                    }
                })

                if (id === socketIdRef.current) {
                    for (let id2 in connections) {
                        if (id2 === socketIdRef.current) continue

                        try {
                            connections[id2].addStream(window.localStream)
                        } catch (e) { }

                        connections[id2].createOffer().then((description) => {
                            connections[id2].setLocalDescription(description)
                                .then(() => {
                                    socketRef.current.emit('signal', id2, JSON.stringify({ 'sdp': connections[id2].localDescription }))
                                })
                                .catch(e => console.log(e))
                        })
                    }
                }
            });

            socketRef.current.on('sticker', (fromId, fromName, stickerId) => {
                const sid = Date.now() + Math.random();
                setStickers((s) => [...s.slice(-8), { id: sid, fromName, stickerId }]);
                setTimeout(() => {
                    setStickers((prev) => prev.filter((x) => x.id !== sid));
                }, 3000);
            });
        });
    }

    let silence = () => {
        let ctx = new AudioContext()
        let oscillator = ctx.createOscillator()
        let dst = oscillator.connect(ctx.createMediaStreamDestination())
        oscillator.start()
        ctx.resume()
        return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false })
    }
    let black = ({ width = 640, height = 480 } = {}) => {
        let canvas = Object.assign(document.createElement("canvas"), { width, height })
        canvas.getContext('2d').fillRect(0, 0, width, height)
        let stream = canvas.captureStream()
        return Object.assign(stream.getVideoTracks()[0], { enabled: false })
    }

    let handleVideo = () => {
        setVideo(!video);

    }
    let handleAudio = () => {
        setAudio(!audio)

    }

    useEffect(() => {
        if (screen !== undefined) {
            getDislayMedia();
        }
    }, [screen])
    let handleScreen = () => {
        setScreen(!screen);
    }

    let handleEndCall = () => {
        try {
            let tracks = localVideoref.current.srcObject.getTracks()
            tracks.forEach(track => track.stop())
        } catch (e) { }
        window.location.href = "/home"
    }

    const addMessage = (data, sender, socketIdSender) => {
        setMessages((prevMessages) => [
            ...prevMessages,
            { sender: sender, data: data }
        ]);
        if (socketIdSender !== socketIdRef.current) {
            setNewMessages((prevNewMessages) => prevNewMessages + 1);
        }
    };

    let sendMessage = () => {
        if (!message.trim()) return;
        socketRef.current.emit('chat-message', message.trim(), username);
        setMessage('');
    };

    const sendSticker = (stickerId) => {
        if (socketRef.current) {
            socketRef.current.emit('sticker', stickerId);
            setShowStickerPicker(false);
            const sid = Date.now() + Math.random();
            setStickers((s) => [...s.slice(-8), { id: sid, fromName: username, stickerId }]);
            setTimeout(() => setStickers((prev) => prev.filter((x) => x.id !== sid)), 3000);
        }
    };

    let connect = (overrides) => {
        setAskForUsername(false);
        const v = overrides?.video !== undefined ? overrides.video : videoAvailable;
        const a = overrides?.audio !== undefined ? overrides.audio : audioAvailable;
        getMedia(v, a);
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setPasswordError('');
        const result = await meetingService.verifyMeetingJoin(meetingCode, joinPassword);
        if (result.success) {
            sessionStorage.setItem(`meeting_${meetingCode}_verified`, 'true');
            setPasswordVerified(true);
            setJoinPassword('');
        } else {
            setPasswordError(result.error || 'Incorrect password');
        }
    };

    const showPasswordForm = meetingCheckDone && requiresPassword && !passwordVerified;
    const showLobby = meetingCheckDone && !showPasswordForm && askForUsername;
    const showCall = meetingCheckDone && !showPasswordForm && !askForUsername;

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col"> {/* Main container */}

            {!meetingCheckDone ? (
                <div className="flex-1 flex items-center justify-center">
                    <p className="text-gray-400">Checking meeting...</p>
                </div>
            ) : showPasswordForm ? (
                <div className="flex-1 flex items-center justify-center p-4">
                    <div className="bg-gray-800 rounded-xl shadow-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-semibold mb-2">Meeting password required</h2>
                        <p className="text-gray-400 text-sm mb-4">This meeting is protected. Enter the password to join.</p>
                        <form onSubmit={handlePasswordSubmit} className="space-y-4">
                            <input
                                type="password"
                                value={joinPassword}
                                onChange={(e) => { setJoinPassword(e.target.value); setPasswordError(''); }}
                                placeholder="Enter meeting password"
                                className="input input-bordered w-full bg-gray-700 text-white placeholder-gray-400"
                                autoFocus
                            />
                            {passwordError && <p className="text-sm text-red-400">{passwordError}</p>}
                            <button type="submit" className="btn btn-primary w-full">Join meeting</button>
                        </form>
                    </div>
                </div>
            ) : showLobby ? (
                <Lobby
                    username={username}
                    localVideoref={localVideoref}
                    setUsername={setUsername}
                    connect={connect}
                    meetingCode={meetingCode}
                    videoAvailable={videoAvailable}
                    audioAvailable={audioAvailable}
                />
            ) : showCall ? (
                <div className="flex flex-1 flex-col relative bg-[#0f0f1a] min-h-0">
                    {/* Top bar - meeting info */}
                    <header className="flex items-center justify-between px-4 py-2 bg-black/30 border-b border-white/10 shrink-0">
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-white">
                                {meetingCode ? `Meeting: ${meetingCode}` : 'In call'}
                            </span>
                            <span className="text-xs text-gray-400">
                                {videos.length + 1} participant{videos.length !== 0 ? 's' : ''}
                            </span>
                        </div>
                    </header>

                    {/* Notifications - Zoom/Teams style */}
                    <div className="absolute top-14 left-4 z-40 flex flex-col gap-1.5 max-w-xs pointer-events-none">
                        {notifications.slice(-5).map((n) => (
                            <div
                                key={n.id}
                                className={`px-3 py-2 rounded-lg text-sm shadow-lg ${
                                    n.type === 'join' ? 'bg-emerald-600/90 text-white' : 'bg-gray-700/90 text-gray-200'
                                }`}
                            >
                                {n.msg}
                            </div>
                        ))}
                    </div>

                    {/* Sticker overlay - reactions on screen (Zoom/Teams style) */}
                    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
                        {stickers.map((st, i) => {
                            const offsetX = (i % 3 - 1) * 80;
                            const offsetY = (Math.floor(i / 3) % 2) * 60 - 30;
                            return (
                                <div
                                    key={st.id}
                                    className="absolute animate-bounce"
                                    style={{
                                        top: '35%',
                                        left: '50%',
                                        transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`,
                                    }}
                                >
                                    <span className="text-5xl sm:text-6xl drop-shadow-lg" role="img" aria-label="reaction">
                                        {st.stickerId}
                                    </span>
                                    <p className="text-center text-xs text-white drop-shadow mt-0.5 truncate max-w-[80px]">
                                        {st.fromName}
                                    </p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Video grid - visible boxes like Zoom/Teams */}
                    <div className="flex-1 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-h-0 overflow-auto">
                        {/* Local video tile */}
                        <div className="relative rounded-xl overflow-hidden bg-gray-900 border-2 border-white/20 shadow-xl min-h-[180px] flex flex-col">
                            <video
                                className="w-full h-full min-h-[160px] object-cover"
                                ref={localVideoref}
                                autoPlay
                                muted
                                playsInline
                            />
                            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                                <span className="px-2 py-1 rounded-md bg-black/60 text-xs font-medium text-white">
                                    You {!video && '(camera off)'}
                                </span>
                                {!audio && (
                                    <span className="px-2 py-0.5 rounded bg-red-500/80 text-xs text-white">Muted</span>
                                )}
                            </div>
                        </div>

                        {/* Remote video tiles */}
                        {videos.map((vid) => (
                            <div
                                key={vid.socketId}
                                className="relative rounded-xl overflow-hidden bg-gray-900 border-2 border-white/20 shadow-xl min-h-[180px] flex flex-col"
                            >
                                <Video stream={vid.stream} />
                                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                                    <span className="px-2 py-1 rounded-md bg-black/60 text-xs font-medium text-white">
                                        {participantNames[vid.socketId] || `Participant`}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Controls bar - Teams/Zoom style */}
                    <div className="shrink-0 flex items-center justify-center gap-2 py-4 px-4 bg-black/40 border-t border-white/10">
                        <button
                            onClick={handleVideo}
                            className="flex flex-col items-center justify-center w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors"
                            title={video ? 'Turn off camera' : 'Turn on camera'}
                        >
                            {video ? <VideoCameraIcon className="w-6 h-6" /> : <VideoCameraSlashIcon className="w-6 h-6" />}
                        </button>
                        <button
                            onClick={handleAudio}
                            className="flex flex-col items-center justify-center w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors"
                            title={audio ? 'Mute' : 'Unmute'}
                        >
                            {audio ? <MicrophoneIcon className="w-6 h-6" /> : <NoSymbolIcon className="w-6 h-6" />}
                        </button>
                        {screenAvailable && (
                            <button
                                onClick={handleScreen}
                                className="flex flex-col items-center justify-center w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors"
                                title={screen ? 'Stop share' : 'Share screen'}
                            >
                                {screen ? <StopCircleIcon className="w-6 h-6" /> : <ComputerDesktopIcon className="w-6 h-6" />}
                            </button>
                        )}

                        {/* Reactions / Stickers */}
                        <div className="relative">
                            <button
                                onClick={() => setShowStickerPicker((v) => !v)}
                                className="flex flex-col items-center justify-center w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors"
                                title="Send a reaction"
                            >
                                <FaceSmileIcon className="w-6 h-6" />
                            </button>
                            {showStickerPicker && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 rounded-xl bg-gray-800 border border-white/20 shadow-xl flex flex-wrap gap-1 w-48 justify-center">
                                    {STICKERS.map((st) => (
                                        <button
                                            key={st}
                                            type="button"
                                            onClick={() => sendSticker(st)}
                                            className="w-9 h-9 flex items-center justify-center text-2xl hover:bg-white/20 rounded-lg transition-colors"
                                        >
                                            {st}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="relative">
                            <button
                                onClick={() => { setModal(!showModal); setNewMessages(0); }}
                                className="flex flex-col items-center justify-center w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors relative"
                                title="Chat"
                            >
                                <ChatBubbleLeftRightIcon className="w-6 h-6" />
                                {newMessages > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-xs flex items-center justify-center">
                                        {newMessages > 9 ? '9+' : newMessages}
                                    </span>
                                )}
                            </button>
                        </div>

                        <button
                            onClick={handleEndCall}
                            className="flex flex-col items-center justify-center w-12 h-12 rounded-full bg-red-600 hover:bg-red-500 text-white transition-colors"
                            title="Leave call"
                        >
                            <PhoneXMarkIcon className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Chat sidebar */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: showModal ? 0 : '100%' }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="absolute top-0 right-0 h-full w-80 sm:w-96 bg-[#1a1a2e] shadow-2xl z-50 flex flex-col border-l border-white/10"
                    >
                        <Chat
                            messages={messages}
                            message={message}
                            setMessage={setMessage}
                            sendMessage={sendMessage}
                            currentUsername={username}
                        />
                    </motion.div>
                </div>
            ) : null}
        </div>
    );
}