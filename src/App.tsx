import { useState, useEffect } from 'react'
import { Tldraw, Editor, createShapeId } from 'tldraw'
import { useSyncDemo } from '@tldraw/sync'
import 'tldraw/tldraw.css'
import './index.css'
import { solveChemistryFromImage } from './aiSolver'

const ChalkFilter = () => (
  <svg style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}>
    <defs>
      <filter id="chalk-filter" x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="4" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" result="displaced" />
        <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.8 0" in="displaced" />
      </filter>
    </defs>
  </svg>
)

export default function App() {
  // Multiplayer Room ID logic
  const [roomId, setRoomId] = useState<string>(() => {
    let hash = window.location.hash.slice(1);
    if (!hash) {
      hash = `kelas-${Math.random().toString(36).substring(2, 8)}`;
      window.location.hash = hash;
    }
    return hash;
  });

  // Automatically sync with tldraw's demo server using the room ID
  const store = useSyncDemo({ roomId })

  const [isChalkboard, setIsChalkboard] = useState(false)
  const [editor, setEditor] = useState<Editor | null>(null)
  const [hasSelection, setHasSelection] = useState(false)
  const [isSolving, setIsSolving] = useState(false)
  
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '')
  const [showApiKeyInput, setShowApiKeyInput] = useState(!apiKey)
  const [tempApiKey, setTempApiKey] = useState('')

  const [aiResponses, setAiResponses] = useState<string[]>([])
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    const handleHashChange = () => {
      const newHash = window.location.hash.slice(1)
      if (newHash && newHash !== roomId) {
        window.location.reload()
      }
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [roomId])

  useEffect(() => {
    if (editor) {
      editor.user.updateUserPreferences({ colorScheme: isChalkboard ? 'dark' : 'light' })
      
      const unsubscribe = editor.store.listen(() => {
        setHasSelection(editor.getSelectedShapeIds().length > 0)
      })

      return () => unsubscribe()
    }
  }, [isChalkboard, editor])

  const saveApiKey = () => {
    if (tempApiKey.trim()) {
      setApiKey(tempApiKey.trim())
      localStorage.setItem('gemini_api_key', tempApiKey.trim())
      setShowApiKeyInput(false)
    }
  }

  const handleSolve = async () => {
    if (!editor) return
    if (!apiKey) {
      setShowApiKeyInput(true)
      return
    }
    
    setIsSolving(true)
    try {
      const selectedIds = editor.getSelectedShapeIds()
      if (selectedIds.length === 0) {
        setIsSolving(false)
        return
      }

      const { blob } = await editor.toImage([...selectedIds], {
        format: 'png',
        background: false
      })

      const reader = new FileReader()
      reader.readAsDataURL(blob)
      reader.onloadend = async () => {
        const base64data = reader.result as string
        
        try {
          const solution = await solveChemistryFromImage(base64data, apiKey, 'image/png')
          
          setAiResponses(prev => [solution, ...prev])
          setIsSidebarOpen(true)

        } catch (err: any) {
          alert("Error: " + err.message)
        } finally {
          setIsSolving(false)
        }
      }
    } catch (error) {
      console.error(error)
      alert("Gagal memproses gambar.")
      setIsSolving(false)
    }
  }

  const handleShareLink = () => {
    navigator.clipboard.writeText(window.location.href)
    alert(`Tautan Kelas berhasil disalin!\nBagikan ke murid Anda untuk kolaborasi bersama di ruang: ${roomId}`)
  }

  return (
    <div style={{ position: 'fixed', inset: 0 }} className={isChalkboard ? 'chalkboard-mode' : ''}>
      <ChalkFilter />
      <Tldraw onMount={setEditor} store={store} />
      
      <div style={{ position: 'absolute', top: 12, right: 60, zIndex: 9999, display: 'flex', gap: '10px' }}>
        <button 
          onClick={handleShareLink}
          style={{
            padding: '8px 16px',
            backgroundColor: '#fbbf24',
            color: '#78350f',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
          }}
        >
          🤝 Undang Murid
        </button>
        <button 
          onClick={() => setShowApiKeyInput(true)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#f3f4f6',
            color: '#374151',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
          }}
        >
          ⚙️ API Key
        </button>
        <button 
          onClick={() => setIsChalkboard(!isChalkboard)}
          style={{
            padding: '8px 16px',
            backgroundColor: isChalkboard ? '#ffffff' : '#2b4f3b',
            color: isChalkboard ? '#2b4f3b' : '#ffffff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
            fontFamily: 'sans-serif',
            transition: 'all 0.2s'
          }}
        >
          {isChalkboard ? 'Kembali ke Mode Standar' : 'Gunakan Mode Kapur'}
        </button>
      </div>

      {hasSelection && (
        <div style={{ position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)', zIndex: 9999 }}>
          <button 
            onClick={handleSolve}
            disabled={isSolving}
            style={{
              padding: '12px 24px',
              backgroundColor: '#4ade80',
              color: '#064e3b',
              border: 'none',
              borderRadius: '24px',
              cursor: isSolving ? 'wait' : 'pointer',
              fontWeight: 'bold',
              fontSize: '16px',
              boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontFamily: 'sans-serif'
            }}
          >
            {isSolving ? '🤖 Sedang Menganalisis...' : '🤖 Solve Chemistry'}
          </button>
        </div>
      )}

      {/* AI Sidebar */}
      {isSidebarOpen && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: '350px',
          backgroundColor: '#f9fafb',
          boxShadow: '2px 0 10px rgba(0,0,0,0.1)',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'sans-serif'
        }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>📝 Catatan AI</h2>
            <button onClick={() => setIsSidebarOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>✖️</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {aiResponses.map((res, i) => (
              <div key={i} style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#374151', fontSize: '14px', lineHeight: '1.6' }}>{res}</div>
              </div>
            ))}
            {aiResponses.length === 0 && <p style={{ color: '#6b7280', textAlign: 'center' }}>Belum ada catatan.</p>}
          </div>
        </div>
      )}

      {/* Toggle Sidebar Button */}
      {!isSidebarOpen && aiResponses.length > 0 && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            padding: '10px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            zIndex: 9999,
            fontWeight: 'bold',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
            fontFamily: 'sans-serif'
          }}
        >
          📝 Lihat Catatan AI ({aiResponses.length})
        </button>
      )}

      {showApiKeyInput && (
        <div style={{
          position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10000,
          display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif'
        }}>
          <div style={{
            backgroundColor: 'white', padding: '24px', borderRadius: '12px', width: '400px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ marginTop: 0, color: '#111' }}>Gemini API Key</h3>
            <p style={{ fontSize: '14px', color: '#666' }}>
              Masukkan API Key Gemini Anda untuk menggunakan fitur AI Solver. Key ini hanya disimpan di browser Anda (localStorage).
            </p>
            <input 
              type="text" 
              placeholder="AIzaSy..."
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              style={{ width: '100%', padding: '10px', boxSizing: 'border-box', marginBottom: '16px', borderRadius: '6px', border: '1px solid #ccc' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              {apiKey && (
                <button onClick={() => setShowApiKeyInput(false)} style={{ padding: '8px 16px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '6px', backgroundColor: 'white' }}>
                  Batal
                </button>
              )}
              <button onClick={saveApiKey} style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
