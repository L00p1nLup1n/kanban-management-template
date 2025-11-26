import { useEffect, useRef } from 'react';
import { getSocketInstance } from './useSocket';

/**
 * Hook for user-specific socket events (global events not tied to a specific project)
 * Used for notifications that need to reach the user regardless of which page they're on
 */
export default function useUserSocket(userId?: string, handlers?: Record<string, (...args: unknown[]) => void>) {
    const socketRef = useRef<ReturnType<typeof getSocketInstance> | null>(null);

    useEffect(() => {
        if (!userId) return;

        const server = import.meta.env.VITE_API_URL || 'http://localhost:4000';
        const socket = getSocketInstance(server);
        socketRef.current = socket;

        // Ensure socket is connected
        if (!socket.connected && typeof socket.connect === 'function') {
            socket.connect();
        }

        // Join user-specific room
        socket.emit('join-user', { userId });

        // Listen for join confirmation
        socket.on('socket:joined-user', (data: unknown) => {
            console.debug('[useUserSocket] joined user room', data);
        });

        // Register event handlers
        if (handlers) {
            Object.entries(handlers).forEach(([event, handler]) => {
                socket.on(event, handler as (...args: unknown[]) => void);
            });
        }

        // Cleanup
        return () => {
            // Leave user room
            socket.emit('leave-user', { userId });

            // Remove event handlers
            socket.off('socket:joined-user');
            if (handlers) {
                Object.entries(handlers).forEach(([event, handler]) => {
                    socket.off(event, handler as (...args: unknown[]) => void);
                });
            }
        };
    }, [userId, handlers]);

    return socketRef.current;
}