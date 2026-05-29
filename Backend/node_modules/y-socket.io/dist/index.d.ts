import * as Y from 'yjs';
import * as AwarenessProtocol from 'y-protocols/awareness';
import { Observable } from 'lib0/observable';
import { Socket, ManagerOptions, SocketOptions } from 'socket.io-client';

/**
 * SocketIOProvider instance configuration. Here you can configure:
 * - autoConnect: (Optional) Will try to connect to the server when the instance is created if true; otherwise you have to call `provider.connect()` manually
 * - awareness: (Optional) Give an existing awareness
 * - resyncInterval: (Optional) Specify the number of milliseconds to set an interval to synchronize the document,
 *   if it is greater than 0 enable the synchronization interval (by default is -1)
 * - disableBc: (Optional) This boolean disable the broadcast channel functionality, by default is false (broadcast channel enabled)
 * - onConnect: (Optional) Set a callback that will triggered immediately when the socket is connected
 * - onDisconnect: (Optional) Set a callback that will triggered immediately when the socket is disconnected
 * - onConnectError: (Optional) Set a callback that will triggered immediately when the occurs a socket connection error
 */
interface ProviderConfiguration {
    /**
     * (Optional) This boolean specify if the provider should connect when the instance is created, by default is true
     */
    autoConnect?: boolean;
    /**
     * (Optional) An existent awareness, by default is a new AwarenessProtocol.Awareness instance
     */
    awareness?: AwarenessProtocol.Awareness;
    /**
     * (optional) Specify the number of milliseconds to synchronize, by default is -1 (this disable resync interval)
     */
    resyncInterval?: number;
    /**
     * (Optional) This boolean disable the broadcast channel functionality, by default is false (broadcast channel enabled)
     */
    disableBc?: boolean;
    /**
     * (Optional) Add the authentication data
     */
    auth?: {
        [key: string]: any;
    };
}
/**
 * The socket io provider class to sync a document
 */
declare class SocketIOProvider extends Observable<string> {
    /**
     * The connection url to server. Example: `ws://localhost:3001`
     * @type {string}
     */
    private readonly _url;
    /**
     * The name of the document room
     * @type {string}
     */
    roomName: string;
    /**
     * The broadcast channel room
     * @type {string}
     * @private
     */
    private readonly _broadcastChannel;
    /**
     * The socket connection
     * @type {Socket}
     */
    socket: Socket;
    /**
     * The yjs document
     * @type {Y.Doc}
     */
    doc: Y.Doc;
    /**
     * The awareness
     * @type {AwarenessProtocol.Awareness}
     */
    awareness: AwarenessProtocol.Awareness;
    /**
     * Disable broadcast channel, by default is false
     * @type {boolean}
     */
    disableBc: boolean;
    /**
     * The broadcast channel connection status indicator
     * @type {boolean}
     */
    bcconnected: boolean;
    /**
     * The document's sync status indicator
     * @type {boolean}
     * @private
     */
    private _synced;
    /**
     * Interval to emit `sync-step-1` to sync changes
     * @type {ReturnType<typeof setTimeout> | null}
     * @private
     */
    private resyncInterval;
    /**
     * Optional overrides for socket.io
     * @type {Partial<ManagerOptions & SocketOptions> | undefined}
     * @private
     */
    private readonly _socketIoOptions;
    /**
     * SocketIOProvider constructor
     * @constructor
     * @param {string} url The connection url from server
     * @param {string} roomName The document's room name
     * @param {Y.Doc} doc The yjs document
     * @param {ProviderConfiguration} options Configuration options to the SocketIOProvider
     * @param {Partial<ManagerOptions & SocketOptions> | undefined} socketIoOptions optional overrides for socket.io
     */
    constructor(url: string, roomName: string, doc: Y.Doc | undefined, { autoConnect, awareness, resyncInterval, disableBc, auth }: ProviderConfiguration, socketIoOptions?: Partial<ManagerOptions & SocketOptions> | undefined);
    /**
     * Broadcast channel room getter
     * @type {string}
     */
    get broadcastChannel(): string;
    /**
     * URL getter
     * @type {string}
     */
    get url(): string;
    /**
     * Synchronized state flag getter
     * @type {boolean}
     */
    get synced(): boolean;
    /**
     * Synchronized state flag setter
     */
    set synced(state: boolean);
    /**
     * This function initializes the socket event listeners to synchronize document changes.
     *
     *  The synchronization protocol is as follows:
     *  - A server emits the sync step one event (`sync-step-1`) which sends the document as a state vector
     *    and the sync step two callback as an acknowledgment according to the socket io acknowledgments.
     *  - When the client receives the `sync-step-1` event, it executes the `syncStep2` acknowledgment callback and sends
     *    the difference between the received state vector and the local document (this difference is called an update).
     *  - The second step of the sync is to apply the update sent in the `syncStep2` callback parameters from the client
     *    to the document on the server side.
     *  - There is another event (`sync-update`) that is emitted from the server, which sends an update for the document,
     *    and when the client receives this event, it applies the received update to the local document.
     *  - When an update is applied to a document, it will fire the document's "update" event, which
     *    sends the update to the server.
     * @type {() => void}
     * @private
     */
    private readonly initSyncListeners;
    /**
     * This function initializes socket event listeners to synchronize awareness changes.
     *
     *  The awareness protocol is as follows:
     *  - The server emits the `awareness-update` event by sending the awareness update.
     *  - The client receives that event and applies the received update to the local awareness.
     *  - When an update is applied to awareness, the awareness "update" event will fire, which
     *    sends the update to the server.
     * @type {() => void}
     * @private
     */
    private readonly initAwarenessListeners;
    /**
     * This function initialize the window or process events listener. Specifically set ups the
     * window `beforeunload` and process `exit` events to remove the client from the awareness.
     * @type {() => void}
     */
    private readonly initSystemListeners;
    /**
     * Connect provider's socket
     * @type {() => void}
     */
    connect(): void;
    /**
     * This function runs when the socket connects and reconnects and emits the `sync-step-1`
     * and `awareness-update` socket events to start synchronization.
     *
     *  Also starts the resync interval if is enabled.
     * @private
     * @param {() => void | Promise<void>} onConnect (Optional) A callback that will be triggered every time that socket is connected or reconnected
     * @param {number} resyncInterval (Optional) A number of milliseconds for interval of synchronize
     * @type {(onConnect: () => void | Promise<void>, resyncInterval: number = -1) => void}
     */
    private readonly onSocketConnection;
    /**
     * Disconnect provider's socket
     * @type {() => void}
     */
    disconnect(): void;
    /**
     * This function runs when the socket is disconnected and emits the socket event `awareness-update`
     * which removes this client from awareness.
     * @private
     * @param {Socket.DisconnectReason} event The reason of the socket disconnection
     * @param {() => void | Promise<void>} onDisconnect (Optional) A callback that will be triggered every time that socket is disconnected
     * @type {(event: Socket.DisconnectReason, onDisconnect: () => void | Promise<void>) => void}
     */
    private readonly onSocketDisconnection;
    /**
     * This function is executed when the socket connection fails.
     * @param {Error} error The error in the connection
     * @param {(error: Error) => void | Promise<void>} onConnectError (Optional) A callback that will be triggered every time that socket has a connection error
     * @type {(error: Error, onConnectError: (error: Error) => void | Promise<void>) => void}
     */
    private readonly onSocketConnectionError;
    /**
     * Destroy the provider. This method clears the document, awareness, and window/process listeners and disconnects the socket.
     * @type {() => void}
     */
    destroy(): void;
    /**
     * This function is executed when the document is updated, if the instance that
     * emit the change is not this, it emit the changes by socket and broadcast channel.
     * @private
     * @param {Uint8Array} update Document update
     * @param {SocketIOProvider} origin The SocketIOProvider instance that emits the change.
     * @type {(update: Uint8Array, origin: SocketIOProvider) => void}
     */
    private readonly onUpdateDoc;
    /**
     * This function is called when the server emits the `sync-update` event and applies the received update to the local document.
     * @private
     * @param {Uint8Array}update A document update received by the `sync-update` socket event
     * @type {(update: Uint8Array) => void}
     */
    private readonly onSocketSyncUpdate;
    /**
     * This function is executed when the local awareness changes and this broadcasts the changes per socket and broadcast channel.
     * @private
     * @param {{ added: number[], updated: number[], removed: number[] }} awarenessChanges The clients added, updated and removed
     * @param {SocketIOProvider | null} origin The SocketIOProvider instance that emits the change.
     * @type {({ added, updated, removed }: { added: number[], updated: number[], removed: number[] }, origin: SocketIOProvider | null) => void}
     */
    private readonly awarenessUpdate;
    /**
     * This function is executed when the windows will be unloaded or the process will be closed and this
     * will remove the local client from awareness.
     * @private
     * @type {() => void}
     */
    private readonly beforeUnloadHandler;
    /**
     * This function subscribes the provider to the broadcast channel and initiates synchronization by broadcast channel.
     * @type {() => void}
     */
    private readonly connectBc;
    /**
     * This function unsubscribes the provider from the broadcast channel and before unsubscribing, updates the awareness.
     * @type {() => void}
     */
    private readonly disconnectBc;
    /**
     * This method handles messages received by the broadcast channel and responds to them.
     * @param {{ type: string, data: any }} message The object message received by broadcast channel
     * @param {SocketIOProvider} origin The SocketIOProvider instance that emits the change
     * @type {(message: { type: string, data: any }, origin: SocketIOProvider) => void}
     */
    private readonly onBroadcastChannelMessage;
}

export { ProviderConfiguration, SocketIOProvider };
