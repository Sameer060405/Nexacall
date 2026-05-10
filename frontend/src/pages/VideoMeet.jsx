/**
 * VideoMeet — Main video conferencing page
 *
 * Integrates:
 *  • WebRTC peer-to-peer video/audio (existing)
 *  • Socket.IO signalling (existing)
 *  • Live transcription via Web Speech API         (NEW)
 *  • Active-speaker detection via AudioContext     (NEW)
 *  • Live caption overlays on video tiles          (NEW)
 *  • Tabbed right sidebar: Chat | Transcript | AI  (NEW)
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';
import { motion } from 'framer-motion';
import {
    VideoCameraIcon,
    VideoCameraSlashIcon,
    PhoneXMarkIcon,
    MicrophoneIcon,
    NoSymbolIcon,
    ComputerDesktopIcon,
    ChatBubbleLeftRightIcon,
    StopCircleIcon,
    DocumentTextIcon,
    SparklesIcon,
    XMarkIcon,
} from '@heroicons/react/24/solid';

import server from '../environment';
import Chat from './Chat';
import Video from './Video';
import Lobby from './Lobby';
import TranscriptPanel from '../components/TranscriptPanel';
import MeetingAssistantPanel from '../components/MeetingAssistantPanel';
import { useTranscription } from '../hooks/useTranscription';

const server_url = server;

// Module-level map of RTCPeerConnections (keyed by remote socket ID).
// Kept outside React state to avoid render overhead on every ICE event.
var connections = {};

const peerConfigConnections = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject',
        },
        {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject',
        },
        {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject',
        },
    ],
};

// ─── Speaker detection constants ──────────────────────────────────────────
const SPEAKING_THRESHOLD = 12;  // RMS volume level (0-255) to be "speaking"
const SILENCE_HOLD_MS = 1500;   // Stay "speaking" for this long after silence
const SPEAKER_EMIT_THROTTLE_MS = 400; // Minimum ms between socket emits

export default function VideoMeetComponent() {
    // ─── Refs (never trigger re-renders) ────────────────────────────────
    const socketRef = useRef();
    const socketIdRef = useRef();
    const localVideoref = useRef();
    const videoRef = useRef([]);

    // Speaker detection refs
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const volumeDataRef = useRef(null); // pre-allocated once to avoid 60fps GC pressure
    const animFrameRef = useRef(null);
    const silenceTimerRef = useRef(null);
    const lastSpeakerEmitRef = useRef(0); // timestamp of last emit
    const isSpeakingLocalRef = useRef(false);
    const captionTimersRef = useRef({});    // per-participant caption hide timers
    const reactionTimersRef = useRef({});  // per-participant reaction hide timers

    // ─── Core media/meeting state ────────────────────────────────────────
    const [videoAvailable, setVideoAvailable] = useState(true);
    const [audioAvailable, setAudioAvailable] = useState(true);
    const [video, setVideo] = useState(true);
    const [audio, setAudio] = useState(true);
    const [screen, setScreen] = useState();
    const [screenAvailable, setScreenAvailable] = useState();
    const [askForUsername, setAskForUsername] = useState(true);
    const [username, setUsername] = useState('');
    const [videos, setVideos] = useState([]);

    // ─── Chat state ──────────────────────────────────────────────────────
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');
    const [newMessages, setNewMessages] = useState(0);

    // ─── Sidebar / panel state ───────────────────────────────────────────
    // activePanel: 'chat' | 'transcript' | 'assistant'
    const [showSidebar, setShowSidebar] = useState(false);
    const [activePanel, setActivePanel] = useState('chat');

    // ─── AI / transcription state ────────────────────────────────────────
    const [participantMediaState, setParticipantMediaState] = useState({}); // socketId → {audio, video}
    const [transcript, setTranscript] = useState([]);
    const [activeSpeaker, setActiveSpeaker] = useState(null); // socket ID of current speaker
    const [participantNames, setParticipantNames] = useState({}); // socketId → display name
    const [captions, setCaptions] = useState({}); // socketId → latest finalized text
    const [transcriptionEnabled, setTranscriptionEnabled] = useState(true);
    const [localStream, setLocalStream] = useState(null); // tracked for speaker detection
    const [reactions, setReactions] = useState({}); // socketId → { emoji, id }
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    // ─── Transcription hook ──────────────────────────────────────────────
    // Called once for each finalized speech segment from the local user.
    const handleLocalTranscript = useCallback(
        (entry) => {
            // Emit to socket so all participants receive this entry
            socketRef.current?.emit('transcript-update', entry);
        },
        []
    );

    const { currentCaption: localCaption } = useTranscription({
        username,
        enabled: transcriptionEnabled && !askForUsername,
        onTranscript: handleLocalTranscript,
    });

    // ─── Permission check on mount ───────────────────────────────────────
    useEffect(() => {
        getPermissions();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const getPermissions = async () => {
        try {
            if (!navigator.mediaDevices?.getUserMedia) {
                setVideoAvailable(false);
                setAudioAvailable(false);
                return;
            }
            const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    // AEC/NS prevents the local mic from picking up remote audio through
                    // speakers, which would cause the wrong speaker to appear in the transcript.
                    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                });
            if (stream) {
                setVideoAvailable(true);
                setAudioAvailable(true);
                if (localVideoref.current) localVideoref.current.srcObject = stream;
                window.localStream = stream;
            }
            setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);
        } catch {
            setVideoAvailable(false);
            setAudioAvailable(false);
        }
    };

    // NOTE: We intentionally do NOT re-run getUserMedia on video/audio toggle.
    // Toggling calls track.enabled = true/false directly (see handleVideo/handleAudio).
    // getUserMedia is called exactly once: when the user clicks "Join".

    // ─── Screen share on toggle ──────────────────────────────────────────
    useEffect(() => {
        if (screen !== undefined) getDisplayMedia();
    }, [screen]); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── Speaker detection — starts when local stream is available ────────
    useEffect(() => {
        if (!localStream || !transcriptionEnabled) return;
        startSpeakerDetection(localStream);
        return () => stopSpeakerDetection();
    }, [localStream, transcriptionEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── Media helpers ────────────────────────────────────────────────────
    const silence = () => {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const dst = osc.connect(ctx.createMediaStreamDestination());
        osc.start();
        ctx.resume();
        const track = Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
        // Close the AudioContext once the track ends to prevent leaks
        track.addEventListener('ended', () => ctx.close().catch(() => {}));
        return track;
    };

    const black = ({ width = 640, height = 480 } = {}) => {
        const canvas = Object.assign(document.createElement('canvas'), { width, height });
        canvas.getContext('2d').fillRect(0, 0, width, height);
        const stream = canvas.captureStream();
        return Object.assign(stream.getVideoTracks()[0], { enabled: false });
    };

    const blackSilence = (...args) => new MediaStream([black(...args), silence()]);

    // ─── getUserMedia ─────────────────────────────────────────────────────
    const getUserMediaSuccess = (stream) => {
        try { window.localStream.getTracks().forEach((t) => t.stop()); } catch (_) {}
        window.localStream = stream;
        setLocalStream(stream); // triggers speaker detection
        if (localVideoref.current) localVideoref.current.srcObject = stream;

        // Send the new stream to all existing peers (initial join only — not on toggle).
        // Guard on signalingState to avoid the "called in wrong state" SDP errors.
        for (const id in connections) {
            if (id === socketIdRef.current) continue;
            const conn = connections[id];
            // addTrack replaces deprecated addStream
            stream.getTracks().forEach((track) => {
                if (!conn.getSenders().some((s) => s.track === track)) {
                    conn.addTrack(track, stream);
                }
            });
            if (conn.signalingState === 'stable') {
                conn.createOffer()
                    .then((desc) => {
                        if (conn.signalingState !== 'stable') return;
                        return conn.setLocalDescription(desc);
                    })
                    .then(() => {
                        socketRef.current?.emit('signal', id, JSON.stringify({ sdp: conn.localDescription }));
                    })
                    .catch((e) => console.warn('[WebRTC] offer error:', e));
            }
        }

        // When a hardware track ends (e.g. user unplugs camera), reflect it in UI state.
        // We do NOT renegotiate here — just disable the track in the existing stream.
        stream.getTracks().forEach((track) => {
            track.onended = () => {
                if (track.kind === 'video') setVideo(false);
                if (track.kind === 'audio') setAudio(false);
            };
        });
    };

    // Called ONCE when the user clicks Join. Never called again for toggles.
    const getUserMedia = (withVideo, withAudio) => {
        if (!navigator.mediaDevices?.getUserMedia) return;
        if (withVideo || withAudio) {
            navigator.mediaDevices
                .getUserMedia({
                    video: withVideo,
                    audio: withAudio
                        ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
                        : false,
                })
                .then(getUserMediaSuccess)
                .catch((e) => console.warn('[getUserMedia]', e));
        }
    };

    const getDislayMediaSuccess = (stream) => {
        try { window.localStream.getTracks().forEach((t) => t.stop()); } catch (_) {}
        window.localStream = stream;
        if (localVideoref.current) localVideoref.current.srcObject = stream;

        for (const id in connections) {
            if (id === socketIdRef.current) continue;
            const conn = connections[id];
            const screenVideoTrack = stream.getVideoTracks()[0];
            // Replace existing video sender track so the remote side updates seamlessly
            const videoSender = conn.getSenders().find((s) => s.track?.kind === 'video');
            if (videoSender && screenVideoTrack) {
                videoSender.replaceTrack(screenVideoTrack).catch(() => {});
            } else if (screenVideoTrack) {
                conn.addTrack(screenVideoTrack, stream);
            }
            // Add audio track from screen capture if present
            const screenAudioTrack = stream.getAudioTracks()[0];
            if (screenAudioTrack) {
                const audioSender = conn.getSenders().find((s) => s.track?.kind === 'audio');
                if (audioSender) {
                    audioSender.replaceTrack(screenAudioTrack).catch(() => {});
                } else {
                    conn.addTrack(screenAudioTrack, stream);
                }
            }
            if (conn.signalingState === 'stable') {
                conn.createOffer()
                    .then((desc) => {
                        if (conn.signalingState !== 'stable') return;
                        return conn.setLocalDescription(desc);
                    })
                    .then(() => {
                        socketRef.current?.emit('signal', id, JSON.stringify({ sdp: conn.localDescription }));
                    })
                    .catch((e) => console.warn('[WebRTC] screen offer error:', e));
            }
        }

        stream.getTracks().forEach((track) => {
            track.onended = () => {
                setScreen(false);
                // Restore the original camera/mic stream when screen share stops
                getUserMedia(video, audio);
            };
        });
    };

    const getDisplayMedia = () => {
        if (screen && navigator.mediaDevices.getDisplayMedia) {
            navigator.mediaDevices
                .getDisplayMedia({ video: true, audio: true })
                .then(getDislayMediaSuccess)
                .catch((e) => console.warn(e));
        }
    };

    // ─── Speaker detection helpers ────────────────────────────────────────
    const startSpeakerDetection = (stream) => {
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) return;
        try {
            const AudioCtx = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
            audioContextRef.current = new AudioCtx();
            // Resume the context — Chrome starts AudioContexts in "suspended" state
            // due to autoplay policy, which causes getByteFrequencyData to misbehave.
            audioContextRef.current.resume().catch(() => {});
            const source = audioContextRef.current.createMediaStreamSource(stream);
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 256;
            analyserRef.current.smoothingTimeConstant = 0.8;
            source.connect(analyserRef.current);
            volumeDataRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
            // Run at ~15 fps via setInterval instead of requestAnimationFrame (60 fps).
            // WebRTC + SpeechRecognition already consume significant resources; 60 fps
            // volume polling adds unnecessary CPU load that can freeze the tab after ~25s.
            animFrameRef.current = setInterval(analyzeVolume, 66);
        } catch (e) {
            console.warn('[SpeakerDetection] Setup error:', e);
        }
    };

    const stopSpeakerDetection = () => {
        clearInterval(animFrameRef.current);
        clearTimeout(silenceTimerRef.current);
        try { audioContextRef.current?.close(); } catch (_) {}
        audioContextRef.current = null;
        analyserRef.current = null;
    };

    const analyzeVolume = () => {
        if (!analyserRef.current || !volumeDataRef.current) return;
        const data = volumeDataRef.current;
        try {
            analyserRef.current.getByteFrequencyData(data);
        } catch (e) {
            return; // AudioContext may have been closed concurrently
        }

        // Root-mean-square of frequency bins
        const rms = Math.sqrt(data.reduce((s, v) => s + v * v, 0) / data.length);
        const speaking = rms > SPEAKING_THRESHOLD;

        if (speaking) {
            clearTimeout(silenceTimerRef.current);
            if (!isSpeakingLocalRef.current) {
                isSpeakingLocalRef.current = true;
                emitSpeakerState(true);
            }
        } else if (isSpeakingLocalRef.current) {
            // Keep "speaking" state for SILENCE_HOLD_MS before clearing
            silenceTimerRef.current = setTimeout(() => {
                isSpeakingLocalRef.current = false;
                emitSpeakerState(false);
            }, SILENCE_HOLD_MS);
        }
        // No requestAnimationFrame here — setInterval in startSpeakerDetection handles scheduling
    };

    // Throttled emit so we don't flood the server
    const emitSpeakerState = (isSpeaking) => {
        const now = Date.now();
        if (now - lastSpeakerEmitRef.current < SPEAKER_EMIT_THROTTLE_MS) return;
        lastSpeakerEmitRef.current = now;
        socketRef.current?.emit('active-speaker', isSpeaking);
    };

    // ─── Socket.IO connection ─────────────────────────────────────────────
    const gotMessageFromServer = (fromId, message) => {
        const signal = JSON.parse(message);
        if (fromId === socketIdRef.current) return;

        const conn = connections[fromId];
        if (!conn) return;

        if (signal.sdp) {
            if (signal.sdp.type === 'offer') {
                // Only accept a remote offer when we're in stable state.
                // Ignore if we're already negotiating — this prevents the
                // "called in wrong state" and SDP glare errors.
                if (conn.signalingState !== 'stable') {
                    console.warn('[WebRTC] Ignoring offer in state:', conn.signalingState);
                    return;
                }
                conn.setRemoteDescription(new RTCSessionDescription(signal.sdp))
                    .then(() => conn.createAnswer())
                    .then((desc) => conn.setLocalDescription(desc))
                    .then(() => {
                        socketRef.current.emit('signal', fromId, JSON.stringify({ sdp: conn.localDescription }));
                    })
                    .catch((e) => console.warn('[WebRTC] answer error:', e));

            } else if (signal.sdp.type === 'answer') {
                // Only apply a remote answer when we sent an offer (have-local-offer).
                if (conn.signalingState !== 'have-local-offer') {
                    console.warn('[WebRTC] Ignoring answer in state:', conn.signalingState);
                    return;
                }
                conn.setRemoteDescription(new RTCSessionDescription(signal.sdp))
                    .catch((e) => console.warn('[WebRTC] setRemoteDescription answer error:', e));
            }
        }

        if (signal.ice) {
            conn.addIceCandidate(new RTCIceCandidate(signal.ice)).catch((e) => console.warn(e));
        }
    };

    const connectToSocketServer = () => {
        socketRef.current = io.connect(server_url, { secure: false });

        // ── Register all event handlers ONCE here, outside the connect callback.
        // If they were inside connect, Socket.IO auto-reconnects would add a
        // duplicate copy of every handler each time, causing exponential state
        // updates and eventual crash.

        socketRef.current.on('signal', gotMessageFromServer);

        socketRef.current.on('chat-message', addMessage);

        socketRef.current.on('user-left', (id) => {
            if (connections[id]) {
                try { connections[id].close(); } catch (_) {}
                delete connections[id];
            }
            setVideos((prev) => prev.filter((v) => v.socketId !== id));
            setCaptions((prev) => { const n = { ...prev }; delete n[id]; return n; });
            setParticipantNames((prev) => { const n = { ...prev }; delete n[id]; return n; });
            setActiveSpeaker((prev) => (prev === id ? null : prev));
        });

        // Clean up completely when server drops the connection so that on
        // reconnect the UI and peer connections start from a clean state.
        socketRef.current.on('disconnect', (reason) => {
            console.warn('[Socket] Disconnected:', reason);
            Object.values(connections).forEach((pc) => { try { pc.close(); } catch (_) {} });
            connections = {};
            setVideos([]);
            videoRef.current = [];
            setParticipantNames({});
            setCaptions({});
            setActiveSpeaker(null);
            setParticipantMediaState({});
        });

        socketRef.current.on('user-joined', (id, clients, displayName, namesMap) => {
            if (namesMap) {
                setParticipantNames((prev) => ({ ...prev, ...namesMap }));
            } else if (displayName) {
                setParticipantNames((prev) => ({ ...prev, [id]: displayName }));
            }

            // When a new participant joins, re-broadcast our current mic/camera state so
            // they immediately see correct mute badges without needing a toggle first.
            if (id !== socketIdRef.current && socketRef.current?.connected) {
                const aTrack = window.localStream?.getAudioTracks()[0];
                const vTrack = window.localStream?.getVideoTracks()[0];
                socketRef.current.emit('media-state', aTrack?.enabled ?? true, vTrack?.enabled ?? true);
            }

            clients.forEach((socketListId) => {
                if (socketListId === socketIdRef.current) return; // never connect to self
                if (connections[socketListId]) return; // already have this connection

                const pc = new RTCPeerConnection(peerConfigConnections);
                connections[socketListId] = pc;

                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        socketRef.current?.emit('signal', socketListId, JSON.stringify({ ice: event.candidate }));
                    }
                };

                // When ICE fails (e.g. no TURN route), remove the dead tile so
                // the UI doesn't hang showing a frozen participant.
                pc.onconnectionstatechange = () => {
                    if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                        console.warn('[WebRTC] Connection to', socketListId, 'is', pc.connectionState);
                        try { pc.close(); } catch (_) {}
                        delete connections[socketListId];
                        setVideos((prev) => prev.filter((v) => v.socketId !== socketListId));
                    }
                };

                const remoteStream = new MediaStream();
                pc.ontrack = (event) => {
                    const streams = event.streams;
                    (streams.length > 0 ? streams[0].getTracks() : [event.track]).forEach((track) => {
                        if (!remoteStream.getTracks().find((t) => t.id === track.id)) {
                            remoteStream.addTrack(track);
                        }
                    });
                    const videoExists = videoRef.current.find((v) => v.socketId === socketListId);
                    if (videoExists) {
                        setVideos((prev) => {
                            const updated = prev.map((v) =>
                                v.socketId === socketListId ? { ...v, stream: remoteStream } : v
                            );
                            videoRef.current = updated;
                            return updated;
                        });
                    } else {
                        const newVideo = {
                            socketId: socketListId,
                            stream: remoteStream,
                            autoplay: true,
                            playsinline: true,
                        };
                        setVideos((prev) => {
                            const updated = [...prev, newVideo];
                            videoRef.current = updated;
                            return updated;
                        });
                    }
                };

                const streamToAdd = window.localStream || (() => {
                    const bs = blackSilence();
                    window.localStream = bs;
                    return bs;
                })();
                streamToAdd.getTracks().forEach((track) => pc.addTrack(track, streamToAdd));
            });

            if (id === socketIdRef.current) {
                for (const id2 in connections) {
                    if (id2 === socketIdRef.current) continue;
                    const conn2 = connections[id2];
                    const stream = window.localStream;
                    if (stream) {
                        stream.getTracks().forEach((track) => {
                            if (!conn2.getSenders().some((s) => s.track === track)) {
                                conn2.addTrack(track, stream);
                            }
                        });
                    }
                    if (conn2.signalingState === 'stable') {
                        conn2.createOffer()
                            .then((desc) => {
                                if (conn2.signalingState !== 'stable') return;
                                return conn2.setLocalDescription(desc);
                            })
                            .then(() => {
                                socketRef.current?.emit('signal', id2, JSON.stringify({ sdp: conn2.localDescription }));
                            })
                            .catch((e) => console.warn('[WebRTC] join offer error:', e));
                    }
                }
            }
        });

        socketRef.current.on('transcript-update', (entry) => {
            // Cap at 100 entries — unbounded growth causes heap exhaustion over long calls
            setTranscript((prev) => {
                const next = [...prev, entry];
                return next.length > 100 ? next.slice(-100) : next;
            });

            setCaptions((prev) => ({ ...prev, [entry.socketId]: entry.text }));

            // One timer per participant. Without clearing the old one first, every new
            // entry creates an orphaned timer — after 60 entries, 60 timers fire
            // setCaptions simultaneously, causing a cascade of re-renders.
            clearTimeout(captionTimersRef.current[entry.socketId]);
            captionTimersRef.current[entry.socketId] = setTimeout(() => {
                delete captionTimersRef.current[entry.socketId];
                setCaptions((prev) => {
                    if (prev[entry.socketId] !== entry.text) return prev; // already changed
                    const n = { ...prev };
                    delete n[entry.socketId];
                    return n;
                });
            }, 5000);
        });

        socketRef.current.on('active-speaker', (socketId, isSpeaking) => {
            setActiveSpeaker(isSpeaking ? socketId : (prev) => (prev === socketId ? null : prev));
        });

        socketRef.current.on('media-state', (socketId, audioOn, videoOn) => {
            setParticipantMediaState((prev) => ({
                ...prev,
                [socketId]: { audio: !!audioOn, video: !!videoOn },
            }));
        });

        // Server emits: (socketId, displayName, stickerId)
        socketRef.current.on('sticker', (socketId, _displayName, emoji) => {
            showReaction(socketId, emoji);
        });

        // join-call must be emitted after the socket is connected (and again on
        // every reconnect so the server re-registers us in the room).
        socketRef.current.on('connect', () => {
            socketRef.current.emit('join-call', window.location.href, username);
            socketIdRef.current = socketRef.current.id;
            // Broadcast initial mic/camera state immediately after joining so existing
            // participants know our status without needing us to toggle anything first.
            const aTrack = window.localStream?.getAudioTracks()[0];
            const vTrack = window.localStream?.getVideoTracks()[0];
            socketRef.current.emit('media-state', aTrack?.enabled ?? true, vTrack?.enabled ?? true);
        });
    };

    // ─── UI handlers ──────────────────────────────────────────────────────
    // Toggle by flipping track.enabled on the live stream — zero renegotiation needed.
    const handleVideo = () => {
        const vTrack = window.localStream?.getVideoTracks()[0];
        if (vTrack) {
            const newVal = !vTrack.enabled;
            vTrack.enabled = newVal;
            setVideo(newVal);
            // Read audio state from the track (ground truth) — never stale unlike React state
            const audioEnabled = window.localStream?.getAudioTracks()[0]?.enabled ?? true;
            socketRef.current?.emit('media-state', audioEnabled, newVal);
        }
    };

    const handleAudio = () => {
        const aTrack = window.localStream?.getAudioTracks()[0];
        if (aTrack) {
            const newVal = !aTrack.enabled;
            aTrack.enabled = newVal;
            setAudio(newVal);
            // Read video state from the track (ground truth) — never stale unlike React state
            const videoEnabled = window.localStream?.getVideoTracks()[0]?.enabled ?? true;
            socketRef.current?.emit('media-state', newVal, videoEnabled);
        }
    };

    const handleScreen = () => setScreen((s) => !s);

    // ─── Reactions ────────────────────────────────────────────────────────
    const REACTION_EMOJIS = ['👍', '😂', '🔥', '❤️', '👏', '😮'];

    // Show an emoji reaction floating on a participant tile for 3 seconds.
    // Uses a stable ID so re-firing the same emoji clears the old timer.
    const showReaction = (socketId, emoji) => {
        const id = Date.now();
        setReactions((prev) => ({ ...prev, [socketId]: { emoji, id } }));
        clearTimeout(reactionTimersRef.current[socketId]);
        reactionTimersRef.current[socketId] = setTimeout(() => {
            setReactions((prev) => {
                if (prev[socketId]?.id !== id) return prev; // already replaced
                const next = { ...prev };
                delete next[socketId];
                return next;
            });
            delete reactionTimersRef.current[socketId];
        }, 3000);
    };

    const sendReaction = (emoji) => {
        setShowEmojiPicker(false);
        socketRef.current?.emit('sticker', emoji);
        // Show locally too (server echoes back to all including sender)
    };

    const handleEndCall = () => {
        stopSpeakerDetection();
        try { localVideoref.current.srcObject.getTracks().forEach((t) => t.stop()); } catch (_) {}
        window.location.href = '/home';
    };

    const addMessage = (data, sender, socketIdSender) => {
        setMessages((prev) => [...prev, { sender, data }]);
        if (socketIdSender !== socketIdRef.current) {
            setNewMessages((n) => n + 1);
        }
    };

    const sendMessage = () => {
        socketRef.current.emit('chat-message', message, username);
        setMessage('');
    };

    const connect = ({ video: withVideo = true, audio: withAudio = true } = {}) => {
        const useVideo = withVideo && videoAvailable;
        const useAudio = withAudio && audioAvailable;
        setAskForUsername(false);
        setVideo(useVideo);
        setAudio(useAudio);

        // IMPORTANT: connect to socket AFTER getUserMedia resolves so that
        // window.localStream is guaranteed to be set before any peer connections
        // are established. If we connect first, remote peers get a black-silence
        // placeholder stream instead of the real camera feed.
        const startSocket = () => connectToSocketServer();

        if (navigator.mediaDevices?.getUserMedia && (useVideo || useAudio)) {
            navigator.mediaDevices
                .getUserMedia({
                    video: useVideo,
                    audio: useAudio
                        ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
                        : false,
                })
                .then((stream) => {
                    getUserMediaSuccess(stream);
                    startSocket();
                })
                .catch((e) => {
                    console.warn('[getUserMedia]', e);
                    startSocket(); // still join even if camera/mic denied
                });
        } else {
            startSocket();
        }
    };

    // ─── Cleanup on unmount ───────────────────────────────────────────────
    useEffect(() => {
        return () => {
            stopSpeakerDetection();
            // Cancel all pending caption and reaction hide-timers
            Object.values(captionTimersRef.current).forEach(clearTimeout);
            captionTimersRef.current = {};
            Object.values(reactionTimersRef.current).forEach(clearTimeout);
            reactionTimersRef.current = {};
            // Close all peer connections
            Object.values(connections).forEach((pc) => {
                try { pc.close(); } catch (_) {}
            });
            connections = {};
            // Stop local media tracks
            try { window.localStream?.getTracks().forEach((t) => t.stop()); } catch (_) {}
            // Disconnect socket
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Open a panel and show the sidebar (also clears the chat badge when opening chat)
    const openPanel = (panel) => {
        if (panel === 'chat') setNewMessages(0);
        setActivePanel(panel);
        setShowSidebar(true);
    };

    const togglePanel = (panel) => {
        if (showSidebar && activePanel === panel) {
            setShowSidebar(false);
        } else {
            openPanel(panel);
        }
    };

    // ─── Render ───────────────────────────────────────────────────────────
    return (
        <div className="h-screen w-screen overflow-hidden bg-[#1C1E2B] text-white flex flex-col">

            {askForUsername ? (
                <Lobby
                    username={username}
                    localVideoref={localVideoref}
                    setUsername={setUsername}
                    connect={connect}
                />
            ) : (
                <div className="flex-1 relative flex overflow-hidden">

                    {/* ── Main video area — shrinks horizontally when sidebar opens ── */}
                    <div
                        className="flex-1 relative flex flex-col overflow-hidden transition-all duration-300"
                        style={{ marginRight: showSidebar ? '360px' : '0' }}
                    >
                        {/* Top status bar */}
                        <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-5 py-4 pointer-events-none">
                            <div className="pointer-events-auto flex items-center gap-2.5 bg-black/40 backdrop-blur-md rounded-2xl px-3.5 py-2 border border-white/[0.06]">
                                <span className="flex items-center gap-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                                    <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Live</span>
                                </span>
                                <span className="text-white/20">·</span>
                                <MeetingClock />
                            </div>

                            <div className="pointer-events-auto flex items-center gap-2 bg-black/40 backdrop-blur-md rounded-2xl px-3.5 py-2 border border-white/[0.06]">
                                <svg className="h-3.5 w-3.5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round"
                                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className="text-xs font-medium text-white/70">
                                    {videos.length + 1} participant{videos.length !== 0 ? 's' : ''}
                                </span>
                            </div>
                        </div>

                        {/* ── Video grid ── */}
                        <VideoGrid
                            localVideoref={localVideoref}
                            localName={username || 'You'}
                            isLocalActive={activeSpeaker === socketIdRef.current}
                            localCaption={localCaption}
                            localReaction={reactions[socketIdRef.current]?.emoji || ''}
                            videos={videos}
                            participantNames={participantNames}
                            activeSpeaker={activeSpeaker}
                            captions={captions}
                            reactions={reactions}
                            participantMediaState={participantMediaState}
                        />
                    </div>

                    {/* ── Floating controls pill ── */}
                    <div className="absolute bottom-6 inset-x-0 flex justify-center z-40 pointer-events-none"
                        style={{ paddingRight: showSidebar ? '360px' : '0', transition: 'padding 0.3s' }}>
                        <div className="pointer-events-auto bg-[#252637]/95 backdrop-blur-xl border border-white/[0.07] rounded-2xl px-3 py-2.5 flex items-center gap-1 shadow-[0_8px_40px_rgba(0,0,0,0.6)]">

                            {/* Mic */}
                            <MeetBtn
                                onClick={handleAudio}
                                isOff={!audio}
                                label={audio ? 'Mute mic' : 'Unmute mic'}
                            >
                                {audio
                                    ? <MicrophoneIcon className="h-[18px] w-[18px]" />
                                    : <NoSymbolIcon className="h-[18px] w-[18px]" />}
                            </MeetBtn>

                            {/* Camera */}
                            <MeetBtn
                                onClick={handleVideo}
                                isOff={!video}
                                label={video ? 'Turn off camera' : 'Turn on camera'}
                            >
                                {video
                                    ? <VideoCameraIcon className="h-[18px] w-[18px]" />
                                    : <VideoCameraSlashIcon className="h-[18px] w-[18px]" />}
                            </MeetBtn>

                            <PillDivider />

                            {/* Screen share */}
                            {screenAvailable && (
                                <MeetBtn
                                    onClick={handleScreen}
                                    isOn={screen}
                                    label={screen ? 'Stop presenting' : 'Present screen'}
                                >
                                    {screen
                                        ? <StopCircleIcon className="h-[18px] w-[18px]" />
                                        : <ComputerDesktopIcon className="h-[18px] w-[18px]" />}
                                </MeetBtn>
                            )}

                            {/* Live captions toggle */}
                            <MeetBtn
                                onClick={() => setTranscriptionEnabled((t) => !t)}
                                isOn={transcriptionEnabled}
                                label={transcriptionEnabled ? 'Captions on' : 'Captions off'}
                            >
                                {/* CC icon */}
                                <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round"
                                        d="M7 8h10M7 12h6m-6 4h10M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
                                </svg>
                            </MeetBtn>

                            <PillDivider />

                            {/* Chat */}
                            <MeetBtn
                                onClick={() => togglePanel('chat')}
                                isOn={showSidebar && activePanel === 'chat'}
                                badge={newMessages}
                                label="In-call messages"
                            >
                                <ChatBubbleLeftRightIcon className="h-[18px] w-[18px]" />
                            </MeetBtn>

                            {/* Transcript */}
                            <MeetBtn
                                onClick={() => togglePanel('transcript')}
                                isOn={showSidebar && activePanel === 'transcript'}
                                label="Transcript"
                            >
                                <DocumentTextIcon className="h-[18px] w-[18px]" />
                            </MeetBtn>

                            {/* AI Assistant */}
                            <MeetBtn
                                onClick={() => togglePanel('assistant')}
                                isOn={showSidebar && activePanel === 'assistant'}
                                label="AI Assistant"
                            >
                                <SparklesIcon className="h-[18px] w-[18px]" />
                            </MeetBtn>

                            <PillDivider />

                            {/* Reactions picker */}
                            <div className="relative">
                                <MeetBtn
                                    onClick={() => setShowEmojiPicker((v) => !v)}
                                    isOn={showEmojiPicker}
                                    label="Reactions"
                                >
                                    <span className="text-base leading-none">😊</span>
                                </MeetBtn>
                                {showEmojiPicker && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-[#252637] border border-white/[0.08] rounded-2xl p-2 flex gap-1.5 shadow-2xl z-50">
                                        {REACTION_EMOJIS.map((emoji) => (
                                            <button
                                                key={emoji}
                                                onClick={() => sendReaction(emoji)}
                                                className="text-xl w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 active:scale-75 transition-all duration-100"
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <PillDivider />

                            {/* End call — wider pill button */}
                            <div className="relative group">
                                <button
                                    onClick={handleEndCall}
                                    className="flex items-center gap-2 bg-red-600 hover:bg-red-500 active:scale-95 transition-all duration-150 rounded-xl px-5 h-11 text-sm font-semibold text-white shadow-lg"
                                >
                                    <PhoneXMarkIcon className="h-5 w-5" />
                                    <span>Leave</span>
                                </button>
                                <BtnTooltip label="Leave call" />
                            </div>
                        </div>
                    </div>

                    {/* ── Sidebar ── */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: showSidebar ? '0%' : '100%' }}
                        transition={{ type: 'spring', stiffness: 380, damping: 38 }}
                        className="absolute top-0 right-0 h-full w-[360px] flex flex-col bg-[#1F2130] border-l border-white/[0.06] shadow-2xl z-50"
                        style={{ paddingBottom: '92px' }}
                    >
                        {/* Sidebar header: tabs + close */}
                        <div className="flex items-stretch border-b border-white/[0.07] flex-shrink-0">
                            {[
                                { id: 'chat',       label: 'Chat',       Icon: ChatBubbleLeftRightIcon },
                                { id: 'transcript', label: 'Transcript', Icon: DocumentTextIcon },
                                { id: 'assistant',  label: 'AI',         Icon: SparklesIcon },
                            ].map(({ id, label, Icon }) => (
                                <button
                                    key={id}
                                    onClick={() => setActivePanel(id)}
                                    className={`flex-1 flex flex-col items-center gap-1 py-3 text-[11px] font-medium transition-all border-b-2 ${
                                        activePanel === id
                                            ? 'text-blue-400 border-blue-500 bg-blue-500/5'
                                            : 'text-gray-400 hover:text-gray-200 border-transparent hover:bg-white/5'
                                    }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    {label}
                                </button>
                            ))}

                            {/* Close button */}
                            <button
                                onClick={() => setShowSidebar(false)}
                                className="px-3 text-gray-500 hover:text-white transition-colors hover:bg-white/5"
                                title="Close panel"
                            >
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Panel content */}
                        <div className="flex-1 overflow-hidden">
                            {activePanel === 'chat' && (
                                <Chat
                                    messages={messages}
                                    message={message}
                                    setMessage={setMessage}
                                    sendMessage={sendMessage}
                                />
                            )}
                            {activePanel === 'transcript' && (
                                <TranscriptPanel
                                    transcript={transcript}
                                    localSocketId={socketIdRef.current}
                                />
                            )}
                            {activePanel === 'assistant' && (
                                <MeetingAssistantPanel transcript={transcript} />
                            )}
                        </div>
                    </motion.div>

                </div>
            )}
        </div>
    );
}

// ─── MeetingClock ─────────────────────────────────────────────────────────────
// Shows elapsed meeting time as MM:SS (or H:MM:SS after one hour).
function MeetingClock() {
    const [secs, setSecs] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setSecs((s) => s + 1), 1000);
        return () => clearInterval(id);
    }, []);
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const p = (n) => String(n).padStart(2, '0');
    return (
        <span className="text-xs font-mono text-white/60">
            {h > 0 ? `${h}:` : ''}{p(m)}:{p(s)}
        </span>
    );
}

// ─── VideoGrid ────────────────────────────────────────────────────────────────
function VideoGrid({ localVideoref, localName, isLocalActive, localCaption, localReaction, videos, participantNames, activeSpeaker, captions, reactions, participantMediaState }) {
    const total = videos.length + 1;
    const cols = total === 1 ? 1 : total <= 4 ? 2 : total <= 9 ? 3 : 4;

    return (
        <div className="w-full h-full flex items-center justify-center p-4 pb-28 pt-16">
            <div
                className="grid gap-3 w-full h-full"
                style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
            >
                <VideoTile
                    isLocal
                    name={`${localName} (You)`}
                    isActive={isLocalActive}
                    caption={localCaption}
                    reaction={localReaction}
                >
                    <video
                        ref={localVideoref}
                        autoPlay
                        muted
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                </VideoTile>

                {videos.map((vid) => {
                    const media = participantMediaState[vid.socketId];
                    return (
                        <VideoTile
                            key={vid.socketId}
                            name={participantNames[vid.socketId] || 'Participant'}
                            isActive={activeSpeaker === vid.socketId}
                            caption={captions[vid.socketId] || ''}
                            reaction={reactions?.[vid.socketId]?.emoji || ''}
                            audioMuted={media ? !media.audio : false}
                            videoOff={media ? !media.video : false}
                        >
                            <Video stream={vid.stream} />
                        </VideoTile>
                    );
                })}
            </div>
        </div>
    );
}

// ─── VideoTile ────────────────────────────────────────────────────────────────
function VideoTile({ children, name, isActive, caption, reaction, audioMuted, videoOff }) {
    return (
        <div
            className={`relative bg-[#2A2D40] rounded-2xl overflow-hidden transition-all duration-300 ${
                isActive
                    ? 'ring-[3px] ring-blue-400 shadow-[0_0_28px_rgba(96,165,250,0.4)]'
                    : 'ring-1 ring-white/[0.07]'
            }`}
        >
            <div className="absolute inset-0">{children}</div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent pointer-events-none" />

            {/* Top-right: mic / cam off badges */}
            {(audioMuted || videoOff) && (
                <div className="absolute top-2 right-2 flex gap-1 z-10">
                    {audioMuted && (
                        <span className="bg-black/60 backdrop-blur-sm rounded-lg p-1" title="Muted">
                            <svg className="h-3.5 w-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                        </span>
                    )}
                    {videoOff && (
                        <span className="bg-black/60 backdrop-blur-sm rounded-lg p-1" title="Camera off">
                            <svg className="h-3.5 w-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                                <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={2} />
                            </svg>
                        </span>
                    )}
                </div>
            )}

            {/* Bottom-left: speaking bars + name */}
            <div className="absolute bottom-3 left-3 flex items-center gap-2 z-10">
                {isActive && (
                    <span className="flex items-end gap-[2px] h-4">
                        {[3, 5, 3.5, 5, 3].map((h, i) => (
                            <span
                                key={i}
                                className="w-[3px] bg-blue-400 rounded-full"
                                style={{
                                    height: `${h}px`,
                                    animation: `speakPulse 0.8s ease-in-out ${i * 0.12}s infinite alternate`,
                                }}
                            />
                        ))}
                    </span>
                )}
                <span className="text-white text-[13px] font-medium drop-shadow-md">{name}</span>
            </div>

            {caption && (
                <div className="absolute bottom-10 inset-x-3 flex justify-center z-10">
                    <p className="bg-black/75 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-xl text-center leading-snug max-w-full">
                        {caption}
                    </p>
                </div>
            )}

            {/* Reaction overlay — floats in centre, auto-dismissed by timer */}
            {reaction && (
                <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                    <span
                        className="text-5xl drop-shadow-lg"
                        style={{ animation: 'reactionPop 0.3s cubic-bezier(0.34,1.56,0.64,1) both' }}
                    >
                        {reaction}
                    </span>
                </div>
            )}
        </div>
    );
}

// ─── MeetBtn ──────────────────────────────────────────────────────────────────
// Pill-bar button with tooltip, active/off state colouring, and badge.
function MeetBtn({ onClick, children, label, isOff, isOn, badge }) {
    const cls = isOff
        ? 'bg-red-500/20 text-red-300 ring-1 ring-red-500/30 hover:bg-red-500/30'
        : isOn
            ? 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30 hover:bg-blue-500/30'
            : 'text-white/75 hover:bg-white/10 hover:text-white';

    return (
        <div className="relative group">
            <button
                onClick={onClick}
                className={`relative h-11 w-11 rounded-xl flex items-center justify-center transition-all duration-150 active:scale-90 ${cls}`}
            >
                {children}
                {badge > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[9px] font-bold flex items-center justify-center text-white leading-none">
                        {badge > 9 ? '9+' : badge}
                    </span>
                )}
            </button>
            <BtnTooltip label={label} />
        </div>
    );
}

// ─── BtnTooltip ───────────────────────────────────────────────────────────────
function BtnTooltip({ label }) {
    return (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
            <div className="bg-[#3A3C52] text-white/90 text-[11px] font-medium px-2.5 py-1 rounded-lg whitespace-nowrap shadow-xl border border-white/[0.08]">
                {label}
            </div>
            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#3A3C52]" />
        </div>
    );
}

// ─── PillDivider ──────────────────────────────────────────────────────────────
function PillDivider() {
    return <div className="w-px h-7 bg-white/10 mx-1.5 flex-shrink-0" />;
}

// Speaking-bars keyframe — injected once into <head>
if (typeof document !== 'undefined' && !document.getElementById('speak-pulse-style')) {
    const style = document.createElement('style');
    style.id = 'speak-pulse-style';
    style.textContent = `
        @keyframes speakPulse { from { transform: scaleY(0.5); opacity:0.7 } to { transform: scaleY(1.8); opacity:1 } }
        @keyframes reactionPop { 0% { transform: scale(0); opacity:0 } 60% { transform: scale(1.2); opacity:1 } 100% { transform: scale(1); opacity:1 } }
    `;
    document.head.appendChild(style);
}
