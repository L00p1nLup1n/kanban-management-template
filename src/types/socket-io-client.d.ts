declare module 'socket.io-client' {
    type MinimalSocket = {
        id?: string;
        connected?: boolean;
        connect?: () => void;
        on: (ev: string, cb: (...args: unknown[]) => void) => void;
        off: (ev?: string, cb?: (...args: unknown[]) => void) => void;
        emit: (ev: string, ...args: unknown[]) => void;
        disconnect: () => void;
    };

    export function io(url?: string, opts?: Record<string, unknown>): MinimalSocket;
    export default io;
    export type Socket = MinimalSocket;
}
