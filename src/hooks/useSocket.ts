import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocketInstance(serverUrl: string) {
    if (!socket) {
        // prefer using the server origin only (scheme + host + port) so any API path (e.g. /api/v1)
        // doesn't get treated as a socket namespace. Fall back to the raw value if parsing fails.
        let base = serverUrl;
        try {
            const u = new URL(serverUrl);
            base = u.origin;
        } catch (_e) {
            // if serverUrl isn't a full URL (rare in Vite), keep it as-is
        }
        socket = io(base, { path: '/socket.io', autoConnect: false, transports: ['websocket', 'polling'] });
    }
    return socket;
}

export default function useSocket(projectId?: string, handlers?: Record<string, (...args: unknown[]) => void>) {
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        const server = import.meta.env.VITE_API_URL || 'http://localhost:4000';
        const s = getSocketInstance(server);
        socketRef.current = s;

        // attach diagnostics
        s.on('connect', () => {
            // eslint-disable-next-line no-console
            console.debug('[useSocket] connected', s.id);
        });
        s.on('connect_error', (err: Error | string | unknown) => {
            // eslint-disable-next-line no-console
            const msg = typeof err === 'string' ? err : (err instanceof Error ? err.message : String(err));
            console.warn('[useSocket] connect_error', msg);
        });
        s.on('disconnect', (...args: unknown[]) => {
            // eslint-disable-next-line no-console
            console.debug('[useSocket] disconnected', ...args);
        });

        if (!s.connected && typeof s.connect === 'function') s.connect();

        if (projectId) {
            s.emit('join', { projectId });
        }

        // ack join
        s.on('socket:joined', (...args: unknown[]) => {
            // eslint-disable-next-line no-console
            console.debug('[useSocket] socket:joined', ...args);
        });

        // register handlers
        if (handlers) {
            Object.entries(handlers).forEach(([event, h]) => {
                s.on(event, h as (...args: unknown[]) => void);
            });
        }

        return () => {
            if (projectId) {
                s.emit('leave', { projectId });
            }
            if (handlers) {
                Object.entries(handlers).forEach(([event, h]) => {
                    s.off(event, h as (...args: unknown[]) => void);
                });
            }
            // do not disconnect global socket; keep for reuse across pages
        };
    }, [projectId, handlers]);
}
