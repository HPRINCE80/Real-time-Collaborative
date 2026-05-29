import * as Y from 'yjs';
import { Namespace, Server } from 'socket.io';
import * as AwarenessProtocol from 'y-protocols/awareness';
import { Observable } from 'lib0/observable';

/**
 * Document callbacks. Here you can set:
 * - onUpdate: Set a callback that will be triggered when the document is updated
 * - onChangeAwareness: Set a callback that will be triggered when the awareness is updated
 * - onDestroy: Set a callback that will be triggered when the document is destroyed
 */
interface Callbacks {
    /**
     * Set a callback that will be triggered when the document is updated
     */
    onUpdate?: (doc: Document, docUpdate: Uint8Array) => void;
    /**
     * Set a callback that will be triggered when the awareness is updated
     */
    onChangeAwareness?: (doc: Document, awarenessUpdate: Uint8Array) => void;
    /**
     * Set a callback that will be triggered when the document is destroyed
     */
    onDestroy?: (doc: Document) => Promise<void>;
}
/**
 * YSocketIO document
 */
declare class Document extends Y.Doc {
    /**
     * The document name
     * @type {string}
     */
    name: string;
    /**
     * The socket connection
     * @type {Namespace}
     * @private
     */
    private readonly namespace;
    /**
     * The document awareness
     * @type {Awareness}
     */
    awareness: AwarenessProtocol.Awareness;
    /**
     * The document callbacks
     * @type {Callbacks}
     * @private
     */
    private readonly callbacks?;
    /**
     * Document constructor.
     * @constructor
     * @param {string} name Name for the document
     * @param {Namespace} namespace The namespace connection
     * @param {Callbacks} callbacks The document callbacks
     */
    constructor(name: string, namespace: Namespace, callbacks?: Callbacks);
    /**
     * Handles the document's update and emit eht changes to clients.
     * @type {(update: Uint8Array) => void}
     * @param {Uint8Array} update
     * @private
     */
    private readonly onUpdateDoc;
    /**
     * Handles the awareness update and emit the changes to clients.
     * @type {({ added, updated, removed }: { added: number[], updated: number[], removed: number[] }, _socket: Socket | null) => void}
     * @param {AwarenessChange} awarenessChange
     * @param {Socket | null} _socket
     * @private
     */
    private readonly onUpdateAwareness;
    /**
     * Destroy the document and remove the listeners.
     * @type {() => Promise<void>}
     */
    destroy(): Promise<void>;
}

/**
 * Level db persistence object
 */
interface Persistence {
    bindState: (docName: string, ydoc: Document) => void;
    writeState: (docName: string, ydoc: Document) => Promise<any>;
    provider: any;
}
/**
 * YSocketIO instance cofiguration. Here you can configure:
 * - gcEnabled: Enable/Disable garbage collection (default: gc=true)
 * - levelPersistenceDir: The directory path where the persistent Level database will be stored
 * - authenticate: The callback to authenticate the client connection
 */
interface YSocketIOConfiguration {
    /**
     * Enable/Disable garbage collection (default: gc=true)
     */
    gcEnabled?: boolean;
    /**
     * The directory path where the persistent Level database will be stored
     */
    levelPersistenceDir?: string;
    /**
     * Callback to authenticate the client connection.
     *
     *  It can be a promise and if it returns true, the connection is allowed; otherwise, if it returns false, the connection is rejected.
     * @param handshake Provided from the handshake attribute of the socket io
     */
    authenticate?: (handshake: {
        [key: string]: any;
    }) => Promise<boolean> | boolean;
}
/**
 * YSocketIO class. This handles document synchronization.
 */
declare class YSocketIO extends Observable<string> {
    /**
     * @type {Map<string, Document>}
     */
    private readonly _documents;
    /**
     * @type {Server}
     */
    private readonly io;
    /**
     * @type {string | undefined | null}
     */
    private readonly _levelPersistenceDir;
    /**
     * @type {Persistence | null}
     */
    private persistence;
    /**
     * @type {YSocketIOConfiguration}
     */
    private readonly configuration?;
    /**
     * @type {Namespace | null}
     */
    nsp: Namespace | null;
    /**
     * YSocketIO constructor.
     * @constructor
     * @param {Server} io Server instance from Socket IO
     * @param {YSocketIOConfiguration} configuration (Optional) The YSocketIO configuration
     */
    constructor(io: Server, configuration?: YSocketIOConfiguration);
    /**
     * YSocketIO initialization.
     *
     *  This method set ups a dynamic namespace manager for namespaces that match with the regular expression `/^\/yjs\|.*$/`
     *  and adds the connection authentication middleware to the dynamics namespaces.
     *
     *  It also starts socket connection listeners.
     * @type {() => void}
     */
    initialize(): void;
    /**
     * The document map's getter. If you want to delete a document externally, make sure you don't delete
     * the document directly from the map, instead use the "destroy" method of the document you want to delete,
     * this way when you destroy the document you are also closing any existing connection on the document.
     * @type {Map<string, Document>}
     */
    get documents(): Map<string, Document>;
    /**
     * This method creates a yjs document if it doesn't exist in the document map. If the document exists, get the map document.
     *
     *  - If document is created:
     *      - Binds the document to LevelDB if LevelDB persistence is enabled.
     *      - Adds the new document to the documents map.
     *      - Emit the `document-loaded` event
     * @private
     * @param {string} name The name for the document
     * @param {Namespace} namespace The namespace of the document
     * @param {boolean} gc Enable/Disable garbage collection (default: gc=true)
     * @returns {Promise<Document>} The document
     */
    private initDocument;
    /**
     * This method sets persistence if enabled.
     * @private
     * @param {string} levelPersistenceDir The directory path where the persistent Level database is stored
     */
    private initLevelDB;
    /**
     * This function initializes the socket event listeners to synchronize document changes.
     *
     *  The synchronization protocol is as follows:
     *  - A client emits the sync step one event (`sync-step-1`) which sends the document as a state vector
     *    and the sync step two callback as an acknowledgment according to the socket io acknowledgments.
     *  - When the server receives the `sync-step-1` event, it executes the `syncStep2` acknowledgment callback and sends
     *    the difference between the received state vector and the local document (this difference is called an update).
     *  - The second step of the sync is to apply the update sent in the `syncStep2` callback parameters from the server
     *    to the document on the client side.
     *  - There is another event (`sync-update`) that is emitted from the client, which sends an update for the document,
     *    and when the server receives this event, it applies the received update to the local document.
     *  - When an update is applied to a document, it will fire the document's "update" event, which
     *    sends the update to clients connected to the document's namespace.
     * @private
     * @type {(socket: Socket, doc: Document) => void}
     * @param {Socket} socket The socket connection
     * @param {Document} doc The document
     */
    private readonly initSyncListeners;
    /**
     * This function initializes socket event listeners to synchronize awareness changes.
     *
     *  The awareness protocol is as follows:
     *  - A client emits the `awareness-update` event by sending the awareness update.
     *  - The server receives that event and applies the received update to the local awareness.
     *  - When an update is applied to awareness, the awareness "update" event will fire, which
     *    sends the update to clients connected to the document namespace.
     * @private
     * @type {(socket: Socket, doc: Document) => void}
     * @param {Socket} socket The socket connection
     * @param {Document} doc The document
     */
    private readonly initAwarenessListeners;
    /**
     *  This function initializes socket event listeners for general purposes.
     *
     *  When a client has been disconnected, check the clients connected to the document namespace,
     *  if no connection remains, emit the `all-document-connections-closed` event
     *  parameters and if LevelDB persistence is enabled, persist the document in LevelDB and destroys it.
     * @private
     * @type {(socket: Socket, doc: Document) => void}
     * @param {Socket} socket The socket connection
     * @param {Document} doc The document
     */
    private readonly initSocketListeners;
    /**
     * This function is called when a client connects and it emit the `sync-step-1` and `awareness-update`
     * events to the client to start the sync.
     * @private
     * @type {(socket: Socket, doc: Document) => void}
     * @param {Socket} socket The socket connection
     * @param {Document} doc The document
     */
    private readonly startSynchronization;
}

export { Callbacks, Document, Persistence, YSocketIO, YSocketIOConfiguration };
