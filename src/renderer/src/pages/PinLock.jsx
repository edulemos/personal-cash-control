import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Delete, LogIn, AlertCircle } from 'lucide-react';

const PIN_LENGTH = 4;

export default function PinLock({ user, onUnlock, onForgotPin }) {
  const [digits, setDigits] = useState([]);
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  // Verifica o PIN automaticamente quando 4 dígitos são inseridos
  useEffect(() => {
    if (digits.length === PIN_LENGTH) {
      verifyPin(digits.join(''));
    }
  }, [digits]);

  // Suporte ao teclado físico
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showForgotModal) return;
      if (e.key >= '0' && e.key <= '9') {
        addDigit(e.key);
      } else if (e.key === 'Backspace') {
        removeDigit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [digits, showForgotModal]);

  const addDigit = useCallback((d) => {
    setError(false);
    setDigits((prev) => (prev.length < PIN_LENGTH ? [...prev, d] : prev));
  }, []);

  const removeDigit = useCallback(() => {
    setError(false);
    setDigits((prev) => prev.slice(0, -1));
  }, []);

  const verifyPin = async (pin) => {
    setLoading(true);
    try {
      const result = await window.api.pinVerify(user.id, pin);
      if (result.success) {
        onUnlock();
      } else {
        setShake(true);
        setError(true);
        setDigits([]);
        setTimeout(() => setShake(false), 600);
      }
    } catch (err) {
      console.error('[PinLock] Erro ao verificar:', err);
      setDigits([]);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPin = async () => {
    setForgotLoading(true);
    try {
      // Re-login Google: desconecta os tokens atuais e força nova autenticação
      await window.api.gdriveLogout();
      const result = await window.api.loginWithGoogle();
      if (result.success) {
        // Remove o PIN — acesso desbloqueado via Google
        await window.api.pinRemove(result.user.id);
        setShowForgotModal(false);
        onForgotPin(result.user);
      }
    } catch (err) {
      console.error('[PinLock] Erro no esqueci meu PIN:', err);
    } finally {
      setForgotLoading(false);
    }
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', null, '0', 'del'];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'linear-gradient(135deg, #0a0f1e 0%, #0f172a 60%, #0a0f1e 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Glow decoration */}
      <div style={{
        position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32,
        position: 'relative', zIndex: 1,
      }}>
        {/* Avatar + nome */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', overflow: 'hidden',
              border: '2px solid rgba(99,102,241,0.3)', flexShrink: 0,
            }}>
              {user?.picture
                ? <img src={user.picture} alt={user.name} referrerPolicy="no-referrer"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{
                    width: '100%', height: '100%',
                    background: 'rgba(99,102,241,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#818cf8', fontWeight: 700, fontSize: 28,
                  }}>
                    {user?.name?.[0]?.toUpperCase()}
                  </div>
              }
            </div>
            <div style={{
              position: 'absolute', bottom: -4, right: -4,
              width: 24, height: 24, borderRadius: '50%',
              background: 'rgba(99,102,241,0.9)', border: '2px solid #0f172a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ShieldCheck size={12} color="white" />
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'white', fontWeight: 600, fontSize: 16 }}>{user?.name}</div>
            <div style={{ color: 'rgba(148,163,184,0.8)', fontSize: 13, marginTop: 2 }}>
              Digite seu PIN para continuar
            </div>
          </div>
        </div>

        {/* Indicadores do PIN */}
        <div
          style={{
            display: 'flex', gap: 16, alignItems: 'center',
            animation: shake ? 'pinShake 0.5s ease' : 'none',
          }}
        >
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 18, height: 18, borderRadius: '50%',
                border: `2px solid ${error ? '#f87171' : digits.length > i ? '#818cf8' : 'rgba(148,163,184,0.3)'}`,
                background: digits.length > i
                  ? (error ? '#f87171' : '#818cf8')
                  : 'transparent',
                transition: 'all 0.15s ease',
                boxShadow: digits.length > i && !error
                  ? '0 0 12px rgba(129,140,248,0.6)'
                  : digits.length > i && error
                  ? '0 0 12px rgba(248,113,113,0.6)'
                  : 'none',
              }}
            />
          ))}
        </div>

        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            color: '#f87171', fontSize: 13, marginTop: -16,
          }}>
            <AlertCircle size={14} />
            PIN incorreto. Tente novamente.
          </div>
        )}

        {/* Teclado numérico */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12,
          padding: '24px 32px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 24,
          backdropFilter: 'blur(12px)',
        }}>
          {keys.map((key, idx) => {
            if (key === null) return <div key={idx} />;
            if (key === 'del') {
              return (
                <button
                  key={idx}
                  onClick={removeDigit}
                  disabled={loading || digits.length === 0}
                  style={{
                    width: 64, height: 64, borderRadius: 16,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'rgba(148,163,184,0.8)',
                    cursor: digits.length === 0 ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                    opacity: digits.length === 0 ? 0.3 : 1,
                  }}
                  onMouseEnter={(e) => { if (digits.length > 0) e.target.style.background = 'rgba(255,255,255,0.1)'; }}
                  onMouseLeave={(e) => { e.target.style.background = 'rgba(255,255,255,0.05)'; }}
                >
                  <Delete size={20} />
                </button>
              );
            }
            return (
              <button
                key={idx}
                onClick={() => addDigit(key)}
                disabled={loading || digits.length >= PIN_LENGTH}
                style={{
                  width: 64, height: 64, borderRadius: 16,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'white', fontSize: 22, fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                  userSelect: 'none',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.15)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.93)'; }}
                onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                {key}
              </button>
            );
          })}
        </div>

        {/* Esqueci meu PIN */}
        <button
          onClick={() => setShowForgotModal(true)}
          style={{
            background: 'none', border: 'none', color: 'rgba(148,163,184,0.7)',
            fontSize: 13, cursor: 'pointer', textDecoration: 'underline',
            padding: '4px 8px', borderRadius: 6,
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => { e.target.style.color = 'rgba(148,163,184,1)'; }}
          onMouseLeave={(e) => { e.target.style.color = 'rgba(148,163,184,0.7)'; }}
        >
          Esqueci meu PIN
        </button>
      </div>

      {/* Modal Esqueci PIN */}
      {showForgotModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 20, padding: '32px 28px',
            maxWidth: 380, width: '100%',
            display: 'flex', flexDirection: 'column', gap: 20,
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <LogIn size={20} color="#818cf8" />
                <h3 style={{ color: 'white', fontWeight: 700, fontSize: 18, margin: 0 }}>
                  Recuperar acesso
                </h3>
              </div>
              <p style={{ color: 'rgba(148,163,184,0.9)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                Para remover o PIN esquecido, você precisará fazer login novamente com o Google.
                Após a verificação, o PIN será desativado automaticamente.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowForgotModal(false)}
                disabled={forgotLoading}
                style={{
                  flex: 1, padding: '10px 16px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.05)', color: 'rgba(148,163,184,0.9)',
                  cursor: 'pointer', fontSize: 14, fontWeight: 500,
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleForgotPin}
                disabled={forgotLoading}
                style={{
                  flex: 1, padding: '10px 16px', borderRadius: 10,
                  background: 'rgba(99,102,241,0.9)', border: 'none',
                  color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  opacity: forgotLoading ? 0.7 : 1,
                }}
              >
                {forgotLoading ? (
                  <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>
                ) : (
                  <LogIn size={15} />
                )}
                Entrar com Google
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes pinShake {
          0%, 100% { transform: translateX(0); }
          15%       { transform: translateX(-10px); }
          30%       { transform: translateX(10px); }
          45%       { transform: translateX(-8px); }
          60%       { transform: translateX(8px); }
          75%       { transform: translateX(-4px); }
          90%       { transform: translateX(4px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
