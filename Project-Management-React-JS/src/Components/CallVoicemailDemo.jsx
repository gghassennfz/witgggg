import React, { useEffect, useRef, useState } from 'react';
import socket from '../socket';

export default function CallVoicemailDemo({ currentUserId, users }) {
  const [callState, setCallState] = useState('idle'); // idle | calling | receiving | in-call
  const [targetUser, setTargetUser] = useState('');
  const [voicemails, setVoicemails] = useState([]);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  // Call signaling events (WebRTC not fully implemented here)
  useEffect(() => {
    socket.on('call_signal', (data) => {
      if (data.to === currentUserId) {
        setCallState('receiving');
      }
    });
    socket.on('receive_voicemail', (data) => {
      if (data.to === currentUserId) {
        setVoicemails((prev) => [data, ...prev]);
      }
    });
    return () => {
      socket.off('call_signal');
      socket.off('receive_voicemail');
    };
  }, [currentUserId]);

  // Start a call (signaling only)
  const startCall = () => {
    if (!targetUser) return;
    socket.emit('call_signal', { to: targetUser, from: currentUserId, signal: 'call-offer' });
    setCallState('calling');
  };

  // Record and send a voicemail (audio blob upload not implemented)
  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new window.MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const audioUrl = URL.createObjectURL(blob);
      socket.emit('send_voicemail', { to: targetUser, from: currentUserId, audioUrl, duration: blob.size });
      // In production, upload blob to Supabase Storage and send the URL instead
    };
    mediaRecorder.start();
    setTimeout(() => mediaRecorder.stop(), 5000); // Record 5 seconds
  };

  return (
    <div style={{ margin: 20, padding: 16, border: '1px solid #bbb', borderRadius: 8, background: '#f3f9ff' }}>
      <h3>Call & Voicemail Demo</h3>
      <div>
        <select value={targetUser} onChange={e => setTargetUser(e.target.value)}>
          <option value="">Select user...</option>
          {users.filter(u => u.id !== currentUserId).map(u => (
            <option key={u.id} value={u.id}>{u.username || u.email || u.id}</option>
          ))}
        </select>
        <button onClick={startCall} disabled={!targetUser}>Call</button>
        <button onClick={startRecording} disabled={!targetUser}>Send Voicemail</button>
      </div>
      <div style={{ marginTop: 12 }}>
        <b>Voicemails:</b>
        <ul>
          {voicemails.map((v, i) => (
            <li key={i}>
              From: {v.from} <audio src={v.audioUrl} controls />
            </li>
          ))}
          {voicemails.length === 0 && <li>No voicemails</li>}
        </ul>
      </div>
      <div>Call state: {callState}</div>
    </div>
  );
}
