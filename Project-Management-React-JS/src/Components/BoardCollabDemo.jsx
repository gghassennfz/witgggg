import React, { useEffect, useState } from 'react';
import socket from '../socket';

export default function BoardCollabDemo({ currentUserId }) {
  const [board, setBoard] = useState({ id: 'demo-board', title: 'Demo Board', items: [] });
  const [input, setInput] = useState('');

  useEffect(() => {
    // Listen for real-time board updates
    socket.on('board_update', (data) => {
      if (data.boardId === board.id) {
        setBoard((prev) => ({ ...prev, ...data.changes }));
      }
    });
    return () => {
      socket.off('board_update');
    };
  }, [board.id]);

  const addItem = () => {
    if (!input) return;
    const changes = { items: [...board.items, { text: input, userId: currentUserId }] };
    setBoard((prev) => ({ ...prev, ...changes }));
    socket.emit('board_update', { boardId: board.id, changes, userId: currentUserId });
    setInput('');
  };

  return (
    <div style={{ margin: 20, padding: 16, border: '1px solid #bbb', borderRadius: 8, background: '#f9f9f9' }}>
      <h3>{board.title}</h3>
      <ul>
        {board.items.map((item, i) => (
          <li key={i}>{item.text} <span style={{ color: '#888' }}>({item.userId})</span></li>
        ))}
      </ul>
      <input value={input} onChange={e => setInput(e.target.value)} placeholder="Add item..." />
      <button onClick={addItem} style={{ marginLeft: 8 }}>Add</button>
    </div>
  );
}
