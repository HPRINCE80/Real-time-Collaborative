import './App.css'
import { Editor } from '@monaco-editor/react'
import { MonacoBinding, } from 'y-monaco'
import { useMemo, useRef, useState, useEffect } from 'react'
import * as Y from 'yjs'
import { SocketIOProvider } from "y-socket.io"


function App() {
  const [users, setUsers] = useState([])
  const [editorReady, setEditorReady] = useState(false)

  const editorRef = useRef(null)
  const providerRef = useRef(null)
  const [username, setUsername] = useState(() => {
    return new URLSearchParams(window.location.search).get("username") || ""
  })
  const ydoc = useMemo(() => new Y.Doc(), [])
  const ytext = useMemo(() => ydoc.getText('monaco'), [ydoc])

  const handleMount = (editor) => {
    editorRef.current = editor

    if (!providerRef.current) {
      providerRef.current = new SocketIOProvider("http://localhost:3000", "monaco", ydoc, {
        autoConnect: true,
      })

      new MonacoBinding(
        ytext,
        editorRef.current.getModel(),
        new Set([editorRef.current]),
        providerRef.current.awareness
      )
    }

    setEditorReady(true)
  }

  const handleJoin = (e) => {
    e.preventDefault()
    setUsername(e.target.username.value)
    window.history.pushState({}, "", "?username=" + e.target.username.value)
  }
  useEffect(() => {
    if (username && editorReady && providerRef.current) {
      const provider = providerRef.current

      const syncUsers = () => {
        const states = Array.from(provider.awareness.getStates().values())
        setUsers(states.filter(state => state.user && state.user.username).map(state => state.user))
      }

      provider.awareness.setLocalStateField("user", { username })
      syncUsers()

      provider.awareness.on("change", syncUsers)

      function handleBeforeUnload() {
        provider.awareness.setLocalStateField("user", null)
      }

      window.addEventListener("beforeunload", handleBeforeUnload)

      return () => {
        provider.awareness.setLocalStateField("user", null)
        provider.disconnect()
        window.removeEventListener("beforeunload", handleBeforeUnload)
      }
    }
  }, [
    username,
    editorReady,
    ydoc
  ])


  if (!username) {
    return (
      <main className="h-screen w-full bg-gray-950 flex gap-4 p-4 items-center justify-center" >
        <form
          onSubmit={handleJoin}
          className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Enter your username"
            className="p-2 rounded-lg bg-gray-800 text-white"
            name="username"
          />
          <button
            className="p-2 rounded-lg bg-amber-50 text-gray-950 font-bold"
          >
            Join
          </button>
        </form>
      </main>
    )
  }

  return (
    <main className='min-h-screen w-full bg-gray-950 flex gap-4 p-4'>
      <aside className="h-full w-1/4 bg-amber-50 rounded-lg">
        <h2 className="text-2xl font-bold p-4 border-b border-gray-300">Users</h2>
        <ul className="p-4">
          {users.map((user, index) => (
            <li key={index} className="flex p-2 bg-gray-800 text-white rounded mb-2 justify-between items-center">
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
