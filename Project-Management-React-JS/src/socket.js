// src/socket.js
import { io } from 'socket.io-client';

// Adjust the backend URL/port as needed
const SOCKET_URL = 'http://localhost:50001';

const socket = io(SOCKET_URL, {
  autoConnect: false // connect manually after user login
});

export default socket;
