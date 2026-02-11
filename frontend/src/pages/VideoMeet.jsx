import React, { useEffect, useRef, useState } from 'react'
import io from "socket.io-client";
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
import recordingService from '../services/recording.service';
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
    const [participantMediaState, setParticipantMediaState] = useState({});
    const [notifications, setNotifications] = useState([]);
    const [stickers, setStickers] = useState([]);
    const [showStickerPicker, setShowStickerPicker] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const recordingStreamRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const recordingChunksRef = useRef([]);
    const recordingStartTimeRef = useRef(0);
    const mediaStateRef = useRef({ audio: true, video: true });

    const STICKERS = ['👍', '👏', '❤️', '😂', '😮', '🔥', '🎉', '👋'];

    useEffect(() => {
        mediaStateRef.current = {
            audio: audio !== undefined ? audio : audioAvailable,
            video: video !== undefined ? video : videoAvailable,
        };
    }, [audio, video, audioAvailable, videoAvailable]);

    useEffect(() => {
        const t = setInterval(() => {
            setNotifications((n) => n.filter((x) => Date.now() - (x.at || 0) < 5000));
        }, 2000);
        return () => clearInterval(t);
    }, []);

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
                try {
                    if (connections[id]) {
                        connections[id].close();
                        delete connections[id];
                    }
                } catch (_) {}
                setVideos((v) => v.filter((video) => video.socketId !== id));
                setParticipantNames((p) => {
                    const next = { ...p };
                    delete next[id];
                    return next;
                });
                setParticipantMediaState((m) => {
                    const next = { ...m };
                    delete next[id];
                    return next;
                });
                setNotifications((n) => [...n.filter((x) => Date.now() - (x.at || 0) < 4000), { id: Date.now() + Math.random(), msg: `${leftName || 'Someone'} left the meeting`, type: 'leave', at: Date.now() }]);
            });

            socketRef.current.on('media-state', (fromId, audioOn, videoOn) => {
                setParticipantMediaState((m) => ({ ...m, [fromId]: { audio: audioOn, video: videoOn } }));
            });

            socketRef.current.on('user-joined', (id, clients, joinedName) => {
                if (joinedName) {
                    setParticipantNames((p) => ({ ...p, [id]: joinedName }));
                    if (id !== socketIdRef.current) {
                        setNotifications((n) => [...n.filter((x) => Date.now() - (x.at || 0) < 4000), { id: Date.now() + Math.random(), msg: `${joinedName} joined the meeting`, type: 'join', at: Date.now() }]);
                    }
                }
                clients.forEach((socketListId) => {
                    if (socketListId === socketIdRef.current) return;
                    if (connections[socketListId]) return;

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
                                if (videos.some((v) => v.socketId === socketListId)) {
                                    return videos.map((v) => (v.socketId === socketListId ? { ...v, stream: event.stream } : v));
                                }
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
                    setTimeout(() => {
                        if (socketRef.current?.connected && mediaStateRef.current) {
                            const { audio: a, video: v } = mediaStateRef.current;
                            socketRef.current.emit('media-state', !!a, !!v);
                        }
                    }, 200);
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
        const next = !video;
        setVideo(next);
        if (socketRef.current?.connected) {
            socketRef.current.emit('media-state', audio !== undefined ? audio : audioAvailable, next);
        }
    };
    let handleAudio = () => {
        const next = !audio;
        setAudio(next);
        if (socketRef.current?.connected) {
            socketRef.current.emit('media-state', next, video !== undefined ? video : videoAvailable);
        }
    };

    useEffect(() => {
        if (screen !== undefined) {
            getDislayMedia();
        }
    }, [screen])
    let handleScreen = () => {
        setScreen(!screen);
    }

    const startRecording = async () => {
        if (typeof MediaRecorder === 'undefined') {
            alert('Recording is not supported in this browser. Use Chrome or Edge.');
            return;
        }
        const localStream = window.localStream;
        if (!localStream || localStream.getTracks().length === 0) {
            alert('Camera or microphone is not available. Turn on your camera/mic and try again.');
            return;
        }
        try {
            const stream = localStream.clone();
            recordingStreamRef.current = stream;
            recordingChunksRef.current = [];
            recordingStartTimeRef.current = Date.now();

            const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
                ? 'video/webm;codecs=vp9,opus'
                : 'video/webm';
            const recorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = recorder;
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) recordingChunksRef.current.push(e.data);
            };
            recorder.onstop = async () => {
                try {
                    stream.getTracks().forEach((t) => t.stop());
                } catch (_) {}
                recordingStreamRef.current = null;
                const durationSeconds = Math.round((Date.now() - recordingStartTimeRef.current) / 1000);
                const blob = new Blob(recordingChunksRef.current, { type: 'video/webm' });
                const token = localStorage.getItem('jwt_token');
                if (token && blob.size > 0) {
                    try {
                        await recordingService.uploadRecording(blob, {
                            meetingCode: meetingCode || '',
                            title: `Meeting ${meetingCode || 'call'} – ${new Date().toLocaleDateString()}`,
                            durationSeconds,
                        });
                        alert('Recording saved. You can find it in the Recordings section.');
                    } catch (err) {
                        console.error(err);
                        triggerDownload(blob);
                        alert('Upload failed. Recording downloaded to your device.');
                    }
                } else if (blob.size > 0) {
                    triggerDownload(blob);
                    alert('Sign in to save recordings to Nexa Call. Recording downloaded to your device.');
                }
                setIsRecording(false);
            };
            recorder.start(2000);
            setIsRecording(true);
        } catch (err) {
            console.error(err);
            alert('Recording could not start. Please try again.');
        }
    };

    const triggerDownload = (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nexacall-recording-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
    };

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
        <div className={`min-h-screen bg-gray-900 text-white flex flex-col ${showCall ? 'h-screen overflow-hidden' : ''}`}> {/* Main container - fixed height in call so chat is full height */}

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
                <div className="flex flex-1 flex-row min-h-0 bg-[#0a0a12] overflow-hidden">
                    {/* Main area: resizes when chat opens/closes */}
                    <div className={`flex flex-1 flex-col min-w-0 min-h-0 transition-[width] duration-300 ease-out relative ${showModal ? 'mr-0' : ''}`}>
                        {/* Top bar */}
                        <header className="flex items-center justify-between px-5 py-3 shrink-0 bg-gradient-to-r from-black/50 to-transparent border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-sm font-semibold text-white tracking-tight">
                                    {meetingCode ? meetingCode : 'In call'}
                                </span>
                                <span className="text-xs text-gray-500 font-medium">
                                    {1 + new Set(videos.map((v) => v.socketId)).size} participant{videos.length !== 0 ? 's' : ''}
                                </span>
                            </div>
                        </header>

                        {/* Notifications */}
                        <div className="absolute top-14 left-4 z-40 flex flex-col gap-1.5 max-w-xs pointer-events-none">
                            {notifications
                                .filter((n) => Date.now() - (n.at || 0) < 4000)
                                .slice(-3)
                                .map((n) => (
                                    <div
                                        key={n.id}
                                        className={`px-3 py-2 rounded-xl text-sm shadow-xl backdrop-blur-sm ${
                                            n.type === 'join' ? 'bg-emerald-600/95 text-white' : 'bg-gray-800/95 text-gray-200'
                                        }`}
                                    >
                                        {n.msg}
                                    </div>
                                ))}
                        </div>

                        {/* Sticker overlay */}
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

                        {/* Video grid - fills all available space; when solo, cap size so face isn't huge */}
                        <div className={`flex-1 min-h-0 p-4 flex flex-col ${videos.length === 0 ? 'items-center justify-center' : ''}`}>
                            <div
                                className={`min-h-0 grid gap-3 ${videos.length === 0 ? 'w-full max-w-3xl max-h-[70vh] h-full' : 'flex-1 w-full h-full'}`}
                                style={{
                                    gridTemplateColumns: `repeat(${Math.min(videos.length + 1, 3)}, minmax(0, 1fr))`,
                                    gridAutoRows: 'minmax(0, 1fr)',
                                }}
                            >
                                <div className="relative rounded-2xl overflow-hidden bg-gray-900/80 ring-1 ring-white/10 shadow-2xl min-h-0 flex flex-col">
                                    <video
                                        className="flex-1 min-h-0 w-full object-cover"
                                        ref={localVideoref}
                                        autoPlay
                                        muted
                                        playsInline
                                    />
                                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                                        <span className="px-2.5 py-1 rounded-lg bg-black/70 text-xs font-medium text-white backdrop-blur-sm">
                                            You {!video && '(camera off)'}
                                        </span>
                                        {!audio && (
                                            <span className="px-2 py-0.5 rounded-lg bg-red-500/90 text-xs text-white font-medium">Muted</span>
                                        )}
                                    </div>
                                </div>
                                {videos.map((vid) => {
                                    const media = participantMediaState[vid.socketId];
                                    const remoteAudio = media?.audio !== false;
                                    const remoteVideo = media?.video !== false;
                                    return (
                                        <div
                                            key={vid.socketId}
                                            className="relative rounded-2xl overflow-hidden bg-gray-900/80 ring-1 ring-white/10 shadow-2xl min-h-0 flex flex-col"
                                        >
                                            <div className="flex-1 min-h-0 w-full h-full">
                                                <Video stream={vid.stream} />
                                            </div>
                                            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                                                <span className="px-2.5 py-1 rounded-lg bg-black/70 text-xs font-medium text-white backdrop-blur-sm">
                                                    {participantNames[vid.socketId] || 'Participant'}
                                                    {!remoteVideo && ' (camera off)'}
                                                </span>
                                                {!remoteAudio && (
                                                    <span className="px-2 py-0.5 rounded-lg bg-red-500/90 text-xs text-white font-medium">Muted</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Controls bar */}
                        <div className="shrink-0 flex items-center justify-center gap-3 py-4 px-4 bg-black/30 backdrop-blur-md border-t border-white/5">
                        <button
                            onClick={handleVideo}
                            className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-105"
                            title={video ? 'Turn off camera' : 'Turn on camera'}
                        >
                            {video ? <VideoCameraIcon className="w-6 h-6" /> : <VideoCameraSlashIcon className="w-6 h-6" />}
                        </button>
                        <button
                            onClick={handleAudio}
                            className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-105"
                            title={audio ? 'Mute' : 'Unmute'}
                        >
                            {audio ? <MicrophoneIcon className="w-6 h-6" /> : <NoSymbolIcon className="w-6 h-6" />}
                        </button>
                        {screenAvailable && (
                            <button
                                onClick={handleScreen}
                                className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-105"
                                title={screen ? 'Stop share' : 'Share screen'}
                            >
                                {screen ? <StopCircleIcon className="w-6 h-6" /> : <ComputerDesktopIcon className="w-6 h-6" />}
                            </button>
                        )}

                        <button
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`flex items-center justify-center w-12 h-12 rounded-xl text-white transition-all hover:scale-105 ${isRecording ? 'bg-red-600 hover:bg-red-500' : 'bg-white/10 hover:bg-white/20'}`}
                            title={isRecording ? 'Stop recording' : 'Record meeting'}
                        >
                            {isRecording ? (
                                <StopCircleIcon className="w-6 h-6" />
                            ) : (
                                <span className="w-4 h-4 rounded-full bg-red-500" aria-hidden />
                            )}
                        </button>

                        <div className="relative">
                            <button
                                onClick={() => setShowStickerPicker((v) => !v)}
                                className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-105"
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
                                className={`flex items-center justify-center w-12 h-12 rounded-xl text-white transition-all hover:scale-105 relative ${showModal ? 'bg-blue-600/80 hover:bg-blue-600' : 'bg-white/10 hover:bg-white/20'}`}
                                title="Chat"
                            >
                                <ChatBubbleLeftRightIcon className="w-6 h-6" />
                                {newMessages > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-xs flex items-center justify-center font-medium">
                                        {newMessages > 9 ? '9+' : newMessages}
                                    </span>
                                )}
                            </button>
                        </div>

                        <button
                            onClick={handleEndCall}
                            className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-600 hover:bg-red-500 text-white transition-all hover:scale-105"
                            title="Leave call"
                        >
                            <PhoneXMarkIcon className="w-6 h-6" />
                        </button>
                    </div>
                    </div>

                    {/* Chat panel - full height, in layout flow so video area resizes */}
                    <div
                        className={`flex flex-col flex-shrink-0 overflow-hidden transition-[width] duration-300 ease-out border-l border-white/10 bg-[#14141f] ${
                            showModal ? 'w-80 sm:w-96 h-full min-h-0 self-stretch' : 'w-0'
                        }`}
                    >
                        {showModal && (
                            <>
                                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
                                    <h2 className="font-semibold text-white">Chat</h2>
                                    <button
                                        type="button"
                                        onClick={() => { setModal(false); setNewMessages(0); }}
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                                        aria-label="Close chat"
                                    >
                                        <span className="text-xl leading-none">×</span>
                                    </button>
                                </div>
                                <div className="flex-1 min-h-0 flex flex-col overflow-hidden min-w-0 w-full basis-0">
                                    <Chat
                                        messages={messages}
                                        message={message}
                                        setMessage={setMessage}
                                        sendMessage={sendMessage}
                                        currentUsername={username}
                                        hideHeader
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
}