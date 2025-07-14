import React, { useRef, useEffect, useState } from 'react';
import socket from '../socket';

export default function GroupCallModal({
  isOpen,
  onClose,
  targetUser,
  currentUserId,
  video,
  groupId
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [callState, setCallState] = useState('idle'); // idle, calling, receiving, in-call
  const [pc, setPc] = useState(null);
  const [localStream, setLocalStream] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    // Set up WebRTC peer connection
    const peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    setPc(peer);
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice_candidate', {
          to: targetUser,
          from: currentUserId,
          candidate: event.candidate,
          groupId
        });
      }
    };
    peer.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };
    return () => {
      peer.close();
      setPc(null);
      setLocalStream(null);
    };
    // eslint-disable-next-line
  }, [isOpen]);

  // Get user media and add tracks
  const startCall = async () => {
    setCallState('calling');
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video
    });
    setLocalStream(stream);
    if (localVideoRef.current && video) {
      localVideoRef.current.srcObject = stream;
    }
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('call_offer', {
      to: targetUser,
      from: currentUserId,
      offer,
      video,
      groupId
    });
  };

  // Accept incoming call
  const acceptCall = async (offer) => {
    setCallState('in-call');
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video
    });
    setLocalStream(stream);
    if (localVideoRef.current && video) {
      localVideoRef.current.srcObject = stream;
    }
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('call_answer', {
      to: targetUser,
      from: currentUserId,
      answer,
      groupId
    });
  };

  // Handle incoming signaling
  useEffect(() => {
    if (!isOpen) return;
    socket.on('call_offer', async ({ from, offer, video: isVideo }) => {
      if (from !== targetUser) return;
      setCallState('receiving');
      window.callOffer = { offer, isVideo };
    });
    socket.on('call_answer', async ({ from, answer }) => {
      if (from !== targetUser) return;
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      setCallState('in-call');
    });
    socket.on('ice_candidate', async ({ from, candidate }) => {
      if (from !== targetUser) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) { /* ignore */ }
    });
    return () => {
      socket.off('call_offer');
      socket.off('call_answer');
      socket.off('ice_candidate');
    };
    // eslint-disable-next-line
  }, [isOpen, pc]);

  const handleAccept = () => {
    if (window.callOffer) {
      acceptCall(window.callOffer.offer);
      window.callOffer = null;
    }
  };

  const handleEnd = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (pc) pc.close();
    setCallState('idle');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="call-modal" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(30,40,60,0.66)', zIndex: 99, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, minWidth: 320, boxShadow: '0 2px 16px rgba(0,0,0,0.16)' }}>
        <h2 style={{ marginBottom: 16 }}>{video ? 'Video Call' : 'Audio Call'}</h2>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 18 }}>
          {video && <video ref={localVideoRef} autoPlay muted playsInline style={{ width: 120, borderRadius: 10, background: '#222' }} />}
          {video && <video ref={remoteVideoRef} autoPlay playsInline style={{ width: 120, borderRadius: 10, background: '#222' }} />}
        </div>
        {callState === 'idle' && <button onClick={startCall} className="btn btn-primary">Start Call</button>}
        {callState === 'calling' && <span>Calling...</span>}
        {callState === 'receiving' && <button onClick={handleAccept} className="btn btn-primary">Accept Call</button>}
        {callState === 'in-call' && <span>In Call</span>}
        <button onClick={handleEnd} className="btn btn-danger" style={{ marginLeft: 20 }}>End</button>
      </div>
    </div>
  );
}
