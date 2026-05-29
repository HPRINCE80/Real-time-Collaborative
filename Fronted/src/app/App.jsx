import './App.css'
import { Editor } from '@monaco-editor/react'
import { MonacoBinding } from 'y-monaco'
import { useMemo, useRef, useState, useEffect } from 'react'
import * as Y from 'yjs'
import { SocketIOProvider } from "y-socket.io"

// Short unique Room ID generate karne ke liye (koi extra package nahi chahiye)
const generateRoomId = () => Math.random().toString(36).slice(2, 10)
const randomColor = () => {
  const colors = ["#f87171", "#60a5fa", "#34d399", "#fbbf24", "#a78bfa"]
  return colors[Math.floor(Math.random() * colors.length)]
}


function App() {
  const [users, setUsers] = useState([])
  const [editorReady, setEditorReady] = useState(false)
  const [copied, setCopied] = useState(false)

  const editorRef = useRef(null)
  const providerRef = useRef(null)

  // URL se username aur roomId lo
  const [username, setUsername] = useState(
    () => new URLSearchParams(window.location.search).get("username") || ""
  )
  const [roomId, setRoomId] = useState(
    () => new URLSearchParams(window.location.search).get("room") || ""
  )
  const [inputRoomId, setInputRoomId] = useState("")

  // Yjs doc — roomId change hone par naya doc banana padega
  const ydoc = useMemo(() => new Y.Doc(), [roomId])
  const ytext = useMemo(() => ydoc.getText('monaco'), [ydoc])

  const handleMount = (editor) => {
    editorRef.current = editor

    if (!providerRef.current && roomId) {
      providerRef.current = new SocketIOProvider(
        "https://editor-o66f.onrender.com",
        roomId,       // ← yahan room ID use ho rahi hai
        ydoc,
        { autoConnect: true }
      )

      new MonacoBinding(
        ytext,
        editorRef.current.getModel(),
        new Set([editorRef.current]),
        providerRef.current.awareness
      )
      
    } 

    setEditorReady(true)
  }

  // Username form submit
  const handleJoin = (e) => {
    e.preventDefault()
    const name = e.target.username.value.trim()
    if (!name) return
    setUsername(name)
    const params = new URLSearchParams(window.location.search)
    params.set("username", name)
    window.history.pushState({}, "", "?" + params.toString())
  }

  // Naya room banao
  const handleCreateRoom = () => {
    const id = generateRoomId()
    setRoomId(id)
    const params = new URLSearchParams(window.location.search)
    params.set("room", id)
    window.history.pushState({}, "", "?" + params.toString())
  }

  // Existing room join karo
  const handleJoinRoom = () => {
    const id = inputRoomId.trim()
    if (!id) return
    setRoomId(id)
    const params = new URLSearchParams(window.location.search)
    params.set("room", id)
    window.history.pushState({}, "", "?" + params.toString())
  }

  // Room ID copy karo
  const handleCopy = () => {
    navigator.clipboard.writeText(roomId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    if (username && editorReady && providerRef.current) {
      const provider = providerRef.current

      const syncUsers = () => {
        const states = Array.from(provider.awareness.getStates().values())
        setUsers(
          states
            .filter(state => state.user && state.user.username)
            .map(state => state.user)
        )
      }

      provider.awareness.setLocalStateField("user", { username })
      syncUsers()
      provider.awareness.on("change", syncUsers)

      const handleBeforeUnload = () => {
        provider.awareness.setLocalStateField("user", null)
      }
      window.addEventListener("beforeunload", handleBeforeUnload)

      return () => {
        provider.awareness.setLocalStateField("user", null)
        provider.disconnect()
        providerRef.current = null
        window.removeEventListener("beforeunload", handleBeforeUnload)
      }
    }
  }, [username, editorReady, ydoc])

  // ── STEP 1: Username ─────────────────────────────────
  if (!username) {
    return (
      <main className="h-screen w-full bg-gray-950 flex gap-4 p-4 items-center justify-center">
        <form onSubmit={handleJoin} className="flex flex-col gap-4">
          <h1 className="text-white text-2xl font-bold text-center">Collaborative Editor</h1>
          <input
            type="text"
            name="username"
            placeholder="Enter Username ..."
            className="p-2 rounded-lg bg-gray-800 text-white"
          />
          <button className="p-2 rounded-lg bg-amber-50 text-gray-950 font-bold">
            Countinue
          </button>
        </form>
      </main>
    )
  }

  // ── STEP 2: Room create/join ──────────────────────────
  if (!roomId) {
    return (
      <main className="h-screen w-full bg-gray-950 flex flex-col gap-6 p-4 items-center justify-center">
        <h1 className="text-white text-2xl font-bold">Select Room</h1>

        {/* Naya Room */}
        <div className="flex flex-col gap-3 bg-gray-800 p-6 rounded-xl w-80">
          <p className="text-gray-400 text-sm text-center">Create a new room</p>
          <button
            onClick={handleCreateRoom}
            className="p-2 rounded-lg bg-amber-50 text-gray-950 font-bold"
          >
            Create a New Room
          </button>
        </div>

        <p className="text-gray-500">— ya —</p>

        {/* Existing Room Join */}
        <div className="flex flex-col gap-3 bg-gray-800 p-6 rounded-xl w-80">
          <p className="text-gray-400 text-sm text-center">Join an existing room</p>
          <input
            type="text"
            placeholder="Enter Room ID..."
            value={inputRoomId}
            onChange={(e) => setInputRoomId(e.target.value)}
            className="p-2 rounded-lg bg-gray-700 text-white"
          />
          <button
            onClick={handleJoinRoom}
            className="p-2 rounded-lg bg-green-500 text-white font-bold"
          >
            Join Room
          </button>
        </div>
      </main>
    )
  }

  // ── STEP 3: Editor ───────────────────────────────────
  return (
    <main className='min-h-screen w-full bg-gray-950 flex gap-4 p-4'>
      <aside className="h-full w-1/4 bg-amber-50 rounded-lg flex flex-col">
        <h2 className="text-2xl font-bold p-4 border-b border-gray-300">Users</h2>

        {/* Room ID box */}
        <div className="mx-4 mt-4 p-3 bg-gray-800 rounded-lg">
          <p className="text-gray-400 text-xs mb-1">Room ID</p>
          <div className="flex items-center justify-between gap-2">
            <code className="text-amber-300 text-sm font-mono">{roomId}</code>
            <button
              onClick={handleCopy}
              className="text-xs px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 transition"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        <ul className="p-4 flex flex-col gap-2">
          {users.map((user, index) => (
            <li
              key={index}
              className="flex p-2 bg-gray-800 text-white rounded justify-between items-center"
            >
              {user.username}
              <button
                onClick={() => {
                  providerRef.current?.awareness.setLocalStateField("user", null)
                  setUsers([])
                }}
                className="px-3 py-1 bg-red-500 hover:bg-red-600 text-sm rounded transition"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="w-3/4 bg-neutral-800 rounded-lg overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          defaultValue="// Start coding..."
          theme="vs-dark"
          onMount={handleMount}
        />
      </section>
    </main>
  )
}

export default App


// import './App.css'
// import { Editor } from '@monaco-editor/react'
// import { MonacoBinding } from 'y-monaco'
// import { useMemo, useRef, useState, useEffect } from 'react'
// import * as Y from 'yjs'
// import { SocketIOProvider } from "y-socket.io"




// import './App.css'
// import { Editor } from '@monaco-editor/react'
// import { MonacoBinding } from 'y-monaco'
// import { useMemo, useRef, useState, useEffect } from 'react'
// import * as Y from 'yjs'
// import { SocketIOProvider } from 'y-socket.io'
// import { io } from 'socket.io-client'
// import debounce from 'lodash/debounce'
// import { v4 as uuid } from 'uuid'

// const generateRoomId = () => Math.random().toString(36).slice(2, 10)

// const COLORS = [
//   '#f87171',
//   '#60a5fa',
//   '#34d399',
//   '#fbbf24',
//   '#a78bfa',
// ]

// const getStableColor = (username) => {
//   let hash = 0

//   for (let i = 0; i < username.length; i++) {
//     hash = username.charCodeAt(i) + ((hash << 5) - hash)
//   }

//   return COLORS[Math.abs(hash % COLORS.length)]
// }

// function App() {
//   const [users, setUsers] = useState([])
//   const [userLines, setUserLines] = useState({})
//   const [files, setFiles] = useState([])
//   const [uploading, setUploading] = useState(false)
//   const [copied, setCopied] = useState(false)

//   const editorRef = useRef(null)
//   const providerRef = useRef(null)
//   const socketRef = useRef(null)
//   const bindingRef = useRef(null)
//   const fileInputRef = useRef(null)

//   const [username, setUsername] = useState(
//     () => new URLSearchParams(window.location.search).get('username') || ''
//   )

//   const [roomId, setRoomId] = useState(
//     () => new URLSearchParams(window.location.search).get('room') || ''
//   )

//   const [inputRoomId, setInputRoomId] = useState('')

//   const userColor = getStableColor(username)

//   const ydoc = useMemo(() => new Y.Doc(), [roomId])

//   const ytext = useMemo(() => {
//     return ydoc.getText('monaco')
//   }, [ydoc])

//   // Reset files when room changes
//   useEffect(() => {
//     setFiles([])
//   }, [roomId])

//   // Socket Connection
//   useEffect(() => {
//     if (!roomId) return

//     const socket = io('http://localhost:3000')

//     socketRef.current = socket

//     socket.emit('join-file-room', roomId)

//     socket.on('room-files', (existingFiles) => {
//       setFiles((prev) => {
//         const merged = [...prev]

//         existingFiles.forEach((file) => {
//           if (!merged.some((f) => f.id === file.id)) {
//             merged.push(file)
//           }
//         })

//         return merged
//       })
//     })

//     socket.on('receive-file', (fileData) => {
//       setFiles((prev) => {
//         const exists = prev.some((f) => f.id === fileData.id)

//         if (exists) return prev

//         return [...prev, fileData]
//       })
//     })

//     socket.on('connect_error', (err) => {
//       console.log('Socket Error:', err.message)
//     })

//     return () => {
//       socket.disconnect()
//     }
//   }, [roomId])

//   // Editor Mount
//   const handleMount = (editor) => {
//     editorRef.current = editor

//     if (!providerRef.current && roomId) {
//       const provider = new SocketIOProvider(
//         'http://localhost:3000',
//         roomId,
//         ydoc,
//         {
//           autoConnect: true,
//         }
//       )

//       providerRef.current = provider

//       bindingRef.current = new MonacoBinding(
//         ytext,
//         editor.getModel(),
//         new Set([editor]),
//         provider.awareness
//       )

//       provider.awareness.setLocalStateField('user', {
//         name: username,
//         color: userColor,
//         line: null,
//       })

//       const updateCursor = debounce(() => {
//         const line = editor.getPosition()?.lineNumber || null

//         provider.awareness.setLocalStateField('user', {
//           name: username,
//           color: userColor,
//           line,
//         })
//       }, 100)

//       editor.onDidChangeCursorPosition(updateCursor)
//     }
//   }

//   // Awareness
//   useEffect(() => {
//     if (!providerRef.current || !username) return

//     const provider = providerRef.current

//     const syncUsers = () => {
//       const states = Array.from(
//         provider.awareness.getStates().values()
//       )

//       const activeUsers = states
//         .filter((s) => s.user?.name)
//         .map((s) => s.user)

//       setUsers(activeUsers)

//       const activeLines = {}

//       activeUsers.forEach((user) => {
//         if (user.line) {
//           activeLines[user.name] = {
//             line: user.line,
//             color: user.color,
//           }
//         }
//       })

//       setUserLines(activeLines)
//     }

//     provider.awareness.on('change', syncUsers)

//     syncUsers()

//     return () => {
//       provider.awareness.off('change', syncUsers)

//       provider.awareness.setLocalStateField('user', null)

//       bindingRef.current?.destroy()

//       provider.destroy()

//       providerRef.current = null
//     }
//   }, [username, roomId])

//   // Upload File
//   const handleFileUpload = (e) => {
//     const file = e.target.files[0]

//     if (!file) return

//     if (file.size > 10 * 1024 * 1024) {
//       alert('10MB se badi file allowed nahi hai')
//       return
//     }

//     setUploading(true)

//     const reader = new FileReader()

//     reader.onload = () => {
//       const fileData = {
//         id: uuid(),
//         name: file.name,
//         type: file.type,
//         size: file.size,
//         data: reader.result,
//         uploadedBy: username,
//         uploadedAt: new Date().toISOString(),
//       }

//       setFiles((prev) => [...prev, fileData])

//       socketRef.current?.emit('send-file', {
//         roomId,
//         fileData,
//       })

//       setUploading(false)
//     }

//     reader.readAsDataURL(file)

//     e.target.value = ''
//   }

//   const handleDownload = (file) => {
//     const link = document.createElement('a')

//     link.href = file.data
//     link.download = file.name

//     document.body.appendChild(link)

//     link.click()

//     document.body.removeChild(link)
//   }

//   const formatSize = (bytes) => {
//     if (bytes < 1024) return bytes + ' B'

//     if (bytes < 1024 * 1024) {
//       return (bytes / 1024).toFixed(1) + ' KB'
//     }

//     return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
//   }

//   const getFileIcon = (type) => {
//     if (type.startsWith('image/')) return '🖼️'

//     if (type.startsWith('video/')) return '🎬'

//     if (type.startsWith('audio/')) return '🎵'

//     if (type.includes('pdf')) return '📄'

//     return '📁'
//   }

//   const handleJoin = (e) => {
//     e.preventDefault()

//     const name = e.target.username.value.trim()

//     if (!name) return

//     setUsername(name)

//     const params = new URLSearchParams(window.location.search)

//     params.set('username', name)

//     window.history.pushState({}, '', '?' + params.toString())
//   }

//   const handleCreateRoom = () => {
//     const id = generateRoomId()

//     setRoomId(id)

//     const params = new URLSearchParams(window.location.search)

//     params.set('room', id)

//     window.history.pushState({}, '', '?' + params.toString())
//   }

//   const handleJoinRoom = () => {
//     if (!inputRoomId.trim()) return

//     setRoomId(inputRoomId.trim())

//     const params = new URLSearchParams(window.location.search)

//     params.set('room', inputRoomId.trim())

//     window.history.pushState({}, '', '?' + params.toString())
//   }

//   const handleCopy = async () => {
//     await navigator.clipboard.writeText(roomId)

//     setCopied(true)

//     setTimeout(() => setCopied(false), 2000)
//   }

//   // Username Screen
//   if (!username) {
//     return (
//       <main className="h-screen bg-gray-950 flex items-center justify-center">
//         <form
//           onSubmit={handleJoin}
//           className="bg-gray-900 p-8 rounded-xl w-80 flex flex-col gap-4"
//         >
//           <h1 className="text-2xl text-white font-bold text-center">
//             Collaborative Editor
//           </h1>

//           <input
//             type="text"
//             name="username"
//             placeholder="Username..."
//             className="p-3 rounded bg-gray-800 text-white"
//           />

//           <button className="bg-amber-400 text-black p-3 rounded font-bold">
//             Continue
//           </button>
//         </form>
//       </main>
//     )
//   }

//   // Room Screen
//   if (!roomId) {
//     return (
//       <main className="h-screen bg-gray-950 flex flex-col items-center justify-center gap-6">
//         <button
//           onClick={handleCreateRoom}
//           className="bg-amber-400 text-black px-6 py-3 rounded font-bold"
//         >
//           Create Room
//         </button>

//         <input
//           value={inputRoomId}
//           onChange={(e) => setInputRoomId(e.target.value)}
//           placeholder="Room ID..."
//           className="p-3 rounded bg-gray-800 text-white"
//         />

//         <button
//           onClick={handleJoinRoom}
//           className="bg-green-500 px-6 py-3 rounded text-white font-bold"
//         >
//           Join Room
//         </button>
//       </main>
//     )
//   }

//   // Main UI
//   return (
//     <main className="h-screen flex bg-gray-950 p-4 gap-4">

//       <aside className="w-80 bg-gray-900 rounded-xl flex flex-col overflow-hidden">

//         <div className="p-4 border-b border-gray-700">
//           <p className="text-xs text-gray-400 mb-1">ROOM ID</p>

//           <div className="flex justify-between items-center">
//             <code className="text-amber-300">{roomId}</code>

//             <button
//               onClick={handleCopy}
//               className="bg-gray-700 px-2 py-1 rounded text-white text-xs"
//             >
//               {copied ? 'Copied!' : 'Copy'}
//             </button>
//           </div>
//         </div>

//         <div className="p-4 border-b border-gray-700">
//           <p className="text-xs text-gray-400 mb-2">ONLINE USERS</p>

//           <ul className="flex flex-col gap-2">
//             {users.map((user, i) => (
//               <li
//                 key={i}
//                 style={{
//                   borderLeft: `4px solid ${user.color}`,
//                 }}
//                 className="bg-gray-800 p-2 rounded text-white pl-3"
//               >
//                 {user.name}
//               </li>
//             ))}
//           </ul>
//         </div>

//         <div className="p-4 border-b border-gray-700">
//           <input
//             type="file"
//             ref={fileInputRef}
//             className="hidden"
//             onChange={handleFileUpload}
//           />

//           <button
//             onClick={() => fileInputRef.current.click()}
//             disabled={uploading}
//             className="w-full bg-blue-600 hover:bg-blue-700 p-3 rounded text-white"
//           >
//             {uploading ? 'Uploading...' : '📎 Upload File'}
//           </button>
//         </div>

//         <div className="flex-1 overflow-y-auto p-4">
//           <p className="text-xs text-gray-400 mb-3">
//             SHARED FILES ({files.length})
//           </p>

//           <div className="flex flex-col gap-2">
//             {files.map((file) => (
//               <div
//                 key={file.id}
//                 className="bg-gray-800 rounded p-2"
//               >
//                 <div className="flex justify-between items-center">
//                   <div className="flex gap-2 items-center min-w-0">
//                     <span>{getFileIcon(file.type)}</span>

//                     <div className="min-w-0">
//                       <p className="text-white text-sm truncate">
//                         {file.name}
//                       </p>

//                       <p className="text-gray-400 text-xs">
//                         {formatSize(file.size)}
//                       </p>
//                     </div>
//                   </div>

//                   <button
//                     onClick={() => handleDownload(file)}
//                     className="bg-green-600 px-2 py-1 rounded text-xs text-white"
//                   >
//                     ↓
//                   </button>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>
//       </aside>

//       <section className="flex-1 rounded-xl overflow-hidden">
//         <Editor
//           height="100%"
//           defaultLanguage="javascript"
//           defaultValue="// Start coding..."
//           theme="vs-dark"
//           onMount={handleMount}
//           options={{
//             fontSize: 16,
//             minimap: { enabled: true },
//             smoothScrolling: true,
//             cursorBlinking: 'smooth',
//             automaticLayout: true,
//           }}
//         />
//       </section>
//     </main>
//   )
// }

// export default App
