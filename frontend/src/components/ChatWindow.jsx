import React, { useState, useRef, useEffect } from 'react';
import { Send, Star, AlertCircle, Loader, MoreVertical, Copy, Edit3, Highlighter } from 'lucide-react';
import { api } from '../services/api';

export default function ChatWindow() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I am the FKIP Knowledge Assistant. How can I help you extract insights from your documentation today?',
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [ratings, setRatings] = useState({});
  const [activeMenuMsgId, setActiveMenuMsgId] = useState(null);
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editingText, setEditingText] = useState('');

  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendMessageText = async (textToSend) => {
    if (!textToSend.trim() || isLoading) return;

    const userMessage = { role: 'user', content: textToSend };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const chatPayload = [...messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const data = await api.chat(chatPayload);
      
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: data.response,
        citations: data.citations,
        log_id: data.log_id
      }]);
    } catch (error) {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `Error: ${error.message || 'Could not communicate with server.'}`,
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessageText(inputValue);
  };

  const handleRate = async (logId, score) => {
    try {
      await api.submitFeedback(logId, score);
      setRatings(prev => ({ ...prev, [logId]: score }));
    } catch (err) {
      console.error("Failed to submit feedback", err);
    }
  };

  // Action Handlers
  const handleCopyMessage = (msgId, text) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
    setActiveMenuMsgId(null);
  };

  const handleStartEditMessage = (msgKey, content) => {
    setEditingMsgId(msgKey);
    setEditingText(content);
    setActiveMenuMsgId(null);
  };

  const handleSaveEditedMessage = () => {
    if (!editingText.trim()) return;
    setEditingMsgId(null);
    sendMessageText(editingText);
  };

  const handleSelectTextMessage = (elementId) => {
    setActiveMenuMsgId(null);
    const el = document.getElementById(elementId);
    if (el) {
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };

  return (
    <div className="chat-panel card">
      <div className="chat-history">
        {messages.map((msg, idx) => {
          const msgKey = idx;
          const isEditing = editingMsgId === msgKey;
          const isCopied = copiedMsgId === msgKey;
          const isMenuOpen = activeMenuMsgId === msgKey;
          const textElementId = `cw-msg-text-${msgKey}`;

          return (
            <div 
              key={msgKey} 
              className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}`}
              style={{
                position: 'relative',
                ...(msg.isError ? { borderLeft: '3px solid var(--status-failed)' } : {})
              }}
            >
              {/* Message Header & Action Menu Button */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '6px',
                fontSize: '11px',
                opacity: 0.85
              }}>
                <span>{msg.role === 'user' ? 'You' : 'RAG Assistant'}</span>

                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                  {isCopied && (
                    <span style={{ color: 'var(--status-completed)', fontSize: '10px', fontWeight: 600, marginRight: '4px' }}>
                      Copied!
                    </span>
                  )}

                  <button 
                    type="button"
                    onClick={() => setActiveMenuMsgId(isMenuOpen ? null : msgKey)}
                    title="Message Actions"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'inherit',
                      cursor: 'pointer',
                      padding: '1px 3px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      opacity: 0.7
                    }}
                  >
                    <MoreVertical size={13} />
                  </button>

                  {/* Dropdown Menu */}
                  {isMenuOpen && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      background: 'var(--bg-sidebar)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                      zIndex: 100,
                      padding: '4px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      minWidth: '130px'
                    }}>
                      <button 
                        type="button"
                        onClick={() => handleCopyMessage(msgKey, msg.content)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 10px',
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-main)',
                          fontSize: '12px',
                          cursor: 'pointer',
                          borderRadius: '4px',
                          textAlign: 'left'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                      >
                        <Copy size={13} style={{ color: 'var(--color-secondary)' }} />
                        <span>Copy Message</span>
                      </button>

                      <button 
                        type="button"
                        onClick={() => handleSelectTextMessage(textElementId)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 10px',
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-main)',
                          fontSize: '12px',
                          cursor: 'pointer',
                          borderRadius: '4px',
                          textAlign: 'left'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                      >
                        <Highlighter size={13} style={{ color: 'var(--color-primary)' }} />
                        <span>Select Text</span>
                      </button>

                      {msg.role === 'user' && (
                        <button 
                          type="button"
                          onClick={() => handleStartEditMessage(msgKey, msg.content)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 10px',
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-main)',
                            fontSize: '12px',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            textAlign: 'left'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                        >
                          <Edit3 size={13} style={{ color: 'var(--status-completed)' }} />
                          <span>Edit Message</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Content / Edit field */}
              {isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginTop: '4px' }}>
                  <textarea 
                    className="form-input"
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    style={{ fontSize: '13px', width: '100%', minHeight: '50px', padding: '8px', color: '#fff' }}
                  />
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => setEditingMsgId(null)} className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: '11px' }}>
                      Cancel
                    </button>
                    <button type="button" onClick={handleSaveEditedMessage} className="btn btn-primary" style={{ padding: '3px 8px', fontSize: '11px' }}>
                      Save & Send
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  id={textElementId}
                  style={{
                    userSelect: 'text',
                    WebkitUserSelect: 'text',
                    MozUserSelect: 'text'
                  }}
                >
                  {msg.isError && <AlertCircle size={16} style={{ display: 'inline', marginRight: '6px', color: 'var(--status-failed)' }} />}
                  {msg.content}
                </div>
              )}

              {msg.citations && msg.citations.length > 0 && (
                <div className="citations-container">
                  <div style={{ fontWeight: 600, marginBottom: '6px' }}>Sources:</div>
                  {msg.citations.map((c, cIdx) => (
                    <div key={cIdx} style={{ marginBottom: '4px' }}>
                      <span className="citation-tag">[{cIdx + 1}] {c.filename}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        "{c.chunk_content.substring(0, 100)}..."
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {msg.log_id && (
                <div className="feedback-box">
                  <span style={{ fontSize: '11px', color: 'var(--text-dark)', marginRight: '6px' }}>Rate this response:</span>
                  {[1, 2, 3, 4, 5].map((starVal) => {
                    const activeRating = ratings[msg.log_id] || 0;
                    return (
                      <Star
                        key={starVal}
                        size={14}
                        className={`feedback-star ${starVal <= activeRating ? 'active' : ''}`}
                        onClick={() => handleRate(msg.log_id, starVal)}
                        fill={starVal <= activeRating ? "var(--status-pending)" : "none"}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {isLoading && (
          <div className="chat-bubble chat-bubble-assistant" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Loader size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
            <span>AI Assistant is reading chunks & drafting response...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="chat-input-form">
        <input 
          type="text" 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask a question about the database schemas, release notes, user guides..."
          className="form-input chat-input"
          disabled={isLoading}
        />
        <button type="submit" className="btn btn-primary" disabled={isLoading || !inputValue.trim()}>
          <Send size={18} />
        </button>
      </form>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
