import { useState, useEffect } from 'react'
import { Tldraw, Editor } from 'tldraw'
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
  const [roomId] = useState<string>(() => {
    let hash = window.location.hash.slice(1);
    if (!hash) {
      hash = `kelas-${Math.random().toString(36).substring(2, 8)}`;
      window.location.hash = hash;
    }
    return hash;
  });

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

  // Floating Glass Dock for actions (Now used as SharePanel in top right)
  const FloatingDock = () => (
    <div style={{
      display: 'flex',
      gap: '8px',
      padding: '8px',
      borderRadius: '20px',
      pointerEvents: 'all',
      marginRight: '8px'
    }} className="glass-panel">
      <button 
        onClick={handleShareLink}
        style={{
          padding: '8px 12px',
          backgroundColor: 'var(--primary-color)',
          color: 'white',
          border: 'none',
          borderRadius: '14px',
          cursor: 'pointer',
          fontWeight: '600',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'all 0.2s ease',
        }}
        onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <span>🤝</span> <span className="hide-on-mobile">Undang Murid</span>
      </button>
      
      <button 
        onClick={() => setIsChalkboard(!isChalkboard)}
        style={{
          padding: '8px 12px',
          backgroundColor: isChalkboard ? 'var(--surface)' : '#2b4f3b',
          color: isChalkboard ? 'var(--text-main)' : 'white',
          border: 'none',
          borderRadius: '14px',
          cursor: 'pointer',
          fontWeight: '600',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'all 0.2s ease',
        }}
        onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <span>{isChalkboard ? '☀️' : '🏫'}</span> <span className="hide-on-mobile">{isChalkboard ? 'Standar' : 'Kapur'}</span>
      </button>

      <button 
        onClick={() => setShowApiKeyInput(true)}
        style={{
          padding: '8px 12px',
          backgroundColor: 'var(--surface)',
          color: 'var(--text-main)',
          border: '1px solid var(--glass-border)',
          borderRadius: '14px',
          cursor: 'pointer',
          fontWeight: '600',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'all 0.2s ease',
        }}
        onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <span>⚙️</span> <span className="hide-on-mobile">API</span>
      </button>
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }} className={isChalkboard ? 'chalkboard-mode' : ''}>
      <ChalkFilter />
      <style>{`
        @media (max-width: 600px) {
          .hide-on-mobile { display: none; }
        }
      `}</style>
      
      <Tldraw 
        onMount={setEditor} 
        store={store} 
        components={{ SharePanel: FloatingDock }} 
        licenseKey="tldraw-2026-09-05/WyIzQnV1RmwxWiIsWyIqIl0sMTYsIjIwMjYtMDktMDUiXQ.yozZaBoIzDedhzRIQQAJzVsgTKA4JU0CuQNNsmkZYKLd/lwu34aCq6bCQXqPdt07OzR3Zz4X2qtVaxeJ0tNMsQ"
      />

      {hasSelection && (
        <div style={{ 
          position: 'absolute', 
          bottom: '120px', 
          left: '50%', 
          transform: 'translateX(-50%)', 
          zIndex: 9999 
        }}>
          <button 
            className="pulse-glow"
            onClick={handleSolve}
            disabled={isSolving}
            style={{
              padding: '14px 28px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '30px',
              cursor: isSolving ? 'wait' : 'pointer',
              fontWeight: '700',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            {isSolving ? '✨ Menganalisis...' : '✨ Solve Chemistry'}
          </button>
        </div>
      )}

      {/* AI Drawer */}
      {isSidebarOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="animate-fade-in"
            onClick={() => setIsSidebarOpen(false)}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.4)',
              zIndex: 9999
            }}
          />
          <div 
            className="animate-slide-in glass-panel"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              width: '100vw',
              maxWidth: '350px',
              zIndex: 10000,
              display: 'flex',
              flexDirection: 'column',
              borderRight: '1px solid var(--glass-border)'
            }}
          >
            <div style={{ 
              padding: '20px', 
              borderBottom: '1px solid var(--glass-border)', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center' 
            }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📝</span> AI Notes
              </h2>
              <button 
                onClick={() => setIsSidebarOpen(false)} 
                style={{ 
                  background: 'rgba(0,0,0,0.05)', 
                  border: 'none', 
                  cursor: 'pointer', 
                  fontSize: '18px', 
                  width: '36px', 
                  height: '36px', 
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✖
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {aiResponses.map((res, i) => (
                <div key={i} style={{ 
                  backgroundColor: 'var(--surface)', 
                  padding: '16px', 
                  borderRadius: '12px', 
                  boxShadow: 'var(--shadow-sm)',
                  border: '1px solid var(--glass-border)'
                }}>
                  <div style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--text-main)', fontSize: '15px', lineHeight: '1.6' }}>{res}</div>
                </div>
              ))}
              {aiResponses.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px' }}>
                  <span style={{ fontSize: '40px', display: 'block', marginBottom: '10px' }}>💭</span>
                  Belum ada catatan. Pilih area lalu tekan Solve Chemistry.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Toggle Sidebar Button */}
      {!isSidebarOpen && aiResponses.length > 0 && (
        <button
          className="glass-panel"
          onClick={() => setIsSidebarOpen(true)}
          style={{
            position: 'absolute',
            top: '72px',
            left: '16px',
            padding: '12px 20px',
            color: 'var(--text-main)',
            border: 'none',
            borderRadius: '16px',
            cursor: 'pointer',
            zIndex: 9998,
            fontWeight: '600',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <span>📝</span> <span className="hide-on-mobile">Catatan AI</span>
          <span style={{ 
            backgroundColor: 'var(--primary-color)', 
            color: 'white', 
            borderRadius: '12px', 
            padding: '2px 8px', 
            fontSize: '12px' 
          }}>{aiResponses.length}</span>
        </button>
      )}

      {/* API Key Modal */}
      {showApiKeyInput && (
        <div 
          className="animate-fade-in"
          style={{
            position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10000,
            display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'
          }}
        >
          <div 
            className="glass-panel"
            style={{
              padding: '32px', borderRadius: '24px', width: '100%', maxWidth: '400px',
              display: 'flex', flexDirection: 'column', gap: '16px'
            }}
          >
            <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '24px', fontWeight: '700' }}>Setup AI Solver</h3>
            <p style={{ margin: 0, fontSize: '15px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Masukkan Gemini API Key Anda. Key disimpan secara lokal di browser Anda.
            </p>
            <input 
              type="text" 
              placeholder="AIzaSy..."
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              style={{ 
                width: '100%', padding: '14px 16px', boxSizing: 'border-box', 
                borderRadius: '12px', border: '1px solid #d1d5db',
                fontSize: '16px', outline: 'none', transition: 'border-color 0.2s'
              }}
              onFocus={e => e.target.style.borderColor = 'var(--primary-color)'}
              onBlur={e => e.target.style.borderColor = '#d1d5db'}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button 
                onClick={() => setShowApiKeyInput(false)} 
                style={{ 
                  padding: '12px 20px', cursor: 'pointer', border: '1px solid #d1d5db', 
                  borderRadius: '12px', backgroundColor: 'transparent', color: 'var(--text-main)',
                  fontWeight: '600'
                }}
              >
                Batal
              </button>
              <button 
                onClick={saveApiKey} 
                style={{ 
                  padding: '12px 24px', backgroundColor: 'var(--primary-color)', 
                  color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
