import React, { useState, useRef, useEffect } from 'react';
import { Send, Star, AlertCircle, Loader } from 'lucide-react';
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
  const [ratings, setRatings] = useState({}); // Stores rating for each message log_id
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = { role: 'user', content: inputValue };
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

  const handleRate = async (logId, score) => {
    try {
      await api.submitFeedback(logId, score);
      setRatings(prev => ({ ...prev, [logId]: score }));
    } catch (err) {
      console.error("Failed to submit feedback", err);
    }
  };

  return (
    <div className="chat-panel card">
      <div className="chat-history">
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}`}
            style={msg.isError ? { borderLeft: '3px solid var(--status-failed)' } : {}}
          >
            {msg.isError && <AlertCircle size={16} style={{ display: 'inline', marginRight: '6px', color: 'var(--status-failed)' }} />}
            <div>{msg.content}</div>

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
        ))}
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
