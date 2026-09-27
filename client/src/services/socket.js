import { io } from 'socket.io-client';

let socketInstance = null;
let currentToken = null;

/**
 * Get or initialize the Socket.io client connection
 * @returns {import('socket.io-client').Socket | null}
 */
export function getSocket() {
  const token =
    localStorage.getItem('craftloopToken') ||
    localStorage.getItem('craftloop_token');

  // If no token exists, disconnect existing socket if any and return null
  if (!token) {
    if (socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
      currentToken = null;
    }
    return null;
  }

  // If socket already exists and token is unchanged, return existing connected/connecting socket
  if (socketInstance && currentToken === token) {
    if (!socketInstance.connected && !socketInstance.connecting) {
      socketInstance.connect();
    }
    return socketInstance;
  }

  // If token changed or socket doesn't exist, create a new connection
  if (socketInstance) {
    socketInstance.disconnect();
  }

  currentToken = token;

  const serverUrl =
    import.meta.env.VITE_SOCKET_URL ||
    (typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:5000'
      : typeof window !== 'undefined' &&
        (window.location.hostname.endsWith('.vercel.app') ||
          window.location.hostname.endsWith('.netlify.app') ||
          window.location.hostname.endsWith('.github.io'))
        ? 'https://craftloopp.onrender.com'
        : undefined); // undefined uses window.location.origin

  socketInstance = io(serverUrl, {
    auth: {
      token,
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    autoConnect: true,
  });

  socketInstance.on('connect', () => {
    console.log('⚡ Socket.io connected successfully:', socketInstance.id);
  });

  socketInstance.on('connect_error', (error) => {
    console.warn('⚠️ Socket.io connection error:', error.message);
  });

  socketInstance.on('disconnect', (reason) => {
    console.log('🔌 Socket.io disconnected:', reason);
  });

  return socketInstance;
}

/**
 * Disconnect and clean up active socket
 */
export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
    currentToken = null;
  }
}

export default {
  getSocket,
  disconnectSocket,
};
