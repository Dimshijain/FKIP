import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { 
  MessageSquare, 
  Send, 
  Plus, 
  Trash2, 
  Loader2, 
  BookOpen, 
  Database, 
  AppWindow,
  Compass,
  ArrowRight,
  User,
  Cpu,
  Brain
} from 'lucide-react';

export default function AiCopilot() {
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [newChatTitle, setNewChatTitle] = useState('New Audit Session');
  
  const messagesEndRef = useRef(null);

  const loadConversations = async (selectFirst = false) => {
    try {
      const data = await api.get('/copilot/conversations');
      setConversations(data);
      if (selectFirst && data.length > 0) {
        selectConversation(data[0].id);
      }
    } catch (err) {
      console.error("Failed to load Copilot sessions", err);
    } finally {
      setIsLoadingChats(false);
    }
  };

  useEffect(() => {
    loadConversations(true);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectConversation = async (id) => {
    try {
      setActiveConvId(id);
      const data = await api.get(`/copilot/conversations/${id}`);
      setMessages(data.messages);
      
      let foundRecs = [];
      let foundSugg = [];
      for (let i = data.messages.length - 1; i >= 0; i--) {
        const msg = data.messages[i];
        if (msg.role === 'assistant') {
          if (!foundSugg.length && msg.suggestions?.length) foundSugg = msg.suggestions;
          if (!foundRecs.length && msg.recommendations?.length) foundRecs = msg.recommendations;
        }
      }
      
      setSuggestions(foundSugg.length ? foundSugg : [
        "Explain the system architecture and database dependencies.",
        "What capability clusters are registered in our Core Banking catalog?",
        "Show response latency trends and search telemetry."
      ]);
      
      setRecommendations(foundRecs.length ? foundRecs : [
        {
          type: "document",
          name: "core_banking_architecture_spec.txt",
          description: "Distributed transaction accounting, multi-currency ledger processing, and high-availability PostgreSQL/Weaviate architecture."
        },
        {
          type: "document",
          name: "payment_gateway_integration_guide.txt",
          description: "ISO20022 message clearing, pacs.008 XML schema validation, and real-time Fedwire reconciliation specifications."
        },
        {
          type: "dna_feature",
          name: "Core Banking Settlement Engine - ISO20022 Clearing",
          description: "Parses and validates pacs.008 and pacs.009 XML payment clearing messages in real-time."
        }
      ]);
    } catch (err) {
      console.error("Failed to fetch session details", err);
    }
  };

  const handleCreateConversation = async () => {
    try {
      const data = await api.post(`/copilot/conversations?title=${encodeURIComponent(newChatTitle)}`);
      setConversations([data, ...conversations]);
      setActiveConvId(data.id);
      setMessages([]);
      setSuggestions([
        "Explain the schema and dependencies of target tables.",
        "What capability clusters are registered in our Core Banking catalog?",
        "Show latency metrics averages for AI engine queries."
      ]);
      setRecommendations([]);
      setNewChatTitle('New Audit Session');
    } catch (err) {
      console.error("Failed to create conversation session", err);
    }
  };

  const handleDeleteConversation = async (id, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/copilot/conversations/${id}`);
      const updated = conversations.filter(c => c.id !== id);
      setConversations(updated);
      if (activeConvId === id) {
        if (updated.length > 0) {
          selectConversation(updated[0].id);
        } else {
          setActiveConvId(null);
          setMessages([]);
          setSuggestions([]);
          setRecommendations([]);
        }
      }
    } catch (err) {
      console.error("Failed to delete session", err);
    }
  };

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputMessage;
    if (!text.trim()) return;

    // Build temporary user message
    const tempUserMsg = {
      id: Math.random().toString(),
      role: 'user',
      content: text,
      created_at: new Date().toISOString()
    };

    setMessages([...messages, tempUserMsg]);
    setInputMessage('');
    setIsSending(true);
    setSuggestions([]);
    
    try {
      const payload = {
        conversation_id: activeConvId,
        message: text
      };
      const res = await api.post('/copilot/chat', payload);
      
      // If we created a new conversation session, reload list
      if (!activeConvId) {
        loadConversations();
        setActiveConvId(res.conversation_id);
      }
      
      // Get conversation messages
      const updatedConv = await api.get(`/copilot/conversations/${res.conversation_id}`);
      setMessages(updatedConv.messages);
      setSuggestions(res.suggestions || []);
      setRecommendations(res.recommendations || []);
      
      // Reload active conversations list to sync titles
      loadConversations();
    } catch (err) {
      console.error("Failed to send chat message", err);
      // Append fallback error assistant response
      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        role: 'assistant',
        content: "Error communicating with AI Copilot service. Please try again.",
        created_at: new Date().toISOString()
      }]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 300px', height: 'calc(100vh - 80px)', gap: '20px' }}>
      
      {/* 1. Sidebar Session List */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={16} />
          <span>Audit Sessions</span>
        </h3>
        
        {/* Create new chat input */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Session title..." 
            value={newChatTitle}
            onChange={(e) => setNewChatTitle(e.target.value)}
            style={{ padding: '8px', fontSize: '13px' }}
          />
          <button onClick={handleCreateConversation} className="btn btn-primary" style={{ padding: '8px 12px' }}>
            <Plus size={16} />
          </button>
        </div>

        {/* Chats lists */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {isLoadingChats ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading sessions...</p>
          ) : conversations.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>No active audit sessions. Click '+' to start.</p>
          ) : (
            conversations.map((conv) => (
              <div 
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: activeConvId === conv.id ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  border: activeConvId === conv.id ? '1px solid var(--color-primary)' : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'var(--transition-fast)'
                }}
                className="chat-session-item"
              >
                <span style={{ 
                  fontSize: '13px', 
                  fontWeight: activeConvId === conv.id ? 600 : 400,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '170px'
                }} title={conv.title}>
                  {conv.title}
                </span>
                <button 
                  onClick={(e) => handleDeleteConversation(conv.id, e)}
                  title="Delete Audit Session"
                  style={{
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#ef4444',
                    borderRadius: '4px',
                    padding: '4px 6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. Main Chat Area */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px' }}>
        {/* Chat Header */}
        <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={18} style={{ color: 'var(--color-primary)' }} />
            <span>AI Copilot Workspace</span>
          </h2>
        </div>

        {/* Message Log */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
          {messages.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', textAlign: 'center' }}>
              <Brain size={48} style={{ opacity: 0.1, marginBottom: '16px', color: 'var(--color-primary)' }} />
              <p style={{ fontSize: '14px', maxWidth: '400px' }}>Ask me about database relationships, application catalogs, knowledge files, or generate custom recommendations.</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div 
                key={msg.id || idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  color: 'var(--text-dark)',
                  marginBottom: '4px',
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start'
                }}>
                  {msg.role === 'user' ? <User size={12} /> : <Cpu size={12} style={{ color: 'var(--color-primary)' }} />}
                  <span>{msg.role === 'user' ? 'You' : 'FKIP Copilot'}</span>
                </div>
                
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  backgroundColor: msg.role === 'user' ? 'var(--color-primary)' : 'var(--bg-input)',
                  color: 'var(--text-main)',
                  border: msg.role === 'user' ? 'none' : '1px solid var(--border-color)',
                  whiteSpace: 'pre-wrap'
                }}>
                  {msg.content}
                </div>
              </div>
            ))
          )}
          {isSending && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>
              <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
              <span>Copilot is indexing context and thinking...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompts Pill Row */}
        {suggestions.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
            {suggestions.map((s, idx) => (
              <button 
                key={idx}
                onClick={() => handleSendMessage(s)}
                style={{
                  background: 'rgba(99, 102, 241, 0.08)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  color: 'var(--color-primary)',
                  padding: '6px 12px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'var(--transition-fast)'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(99, 102, 241, 0.15)'}
                onMouseLeave={(e) => e.target.style.background = 'rgba(99, 102, 241, 0.08)'}
              >
                <span>{s}</span>
                <ArrowRight size={10} />
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="text"
            className="form-input"
            placeholder="Type your message to Copilot..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={isSending}
            style={{ flex: 1 }}
          />
          <button 
            onClick={() => handleSendMessage()}
            className="btn btn-primary"
            disabled={isSending || !inputMessage.trim()}
            style={{ gap: '8px', padding: '12px 20px' }}
          >
            <Send size={16} />
            <span>Send</span>
          </button>
        </div>
      </div>

      {/* 3. Right-hand Recommendations Panel */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px', overflowY: 'auto' }}>
        <h3 style={{ fontSize: '15px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-secondary)' }}>
          <Compass size={16} />
          <span>Context Recommendations</span>
        </h3>
        
        {recommendations.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-dark)', fontSize: '13px', padding: '40px 0' }}>
            <Compass size={32} style={{ opacity: 0.1, margin: '0 auto 12px auto' }} />
            <p>Relevant knowledge files or features will automatically appear here based on your conversation context.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recommendations.map((rec, idx) => (
              <div 
                key={idx} 
                style={{ 
                  padding: '12px', 
                  background: 'rgba(255,255,255,0.02)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                {/* Header tag */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {rec.type === 'document' ? (
                    <BookOpen size={12} style={{ color: 'var(--color-secondary)' }} />
                  ) : (
                    <AppWindow size={12} style={{ color: 'var(--color-primary)' }} />
                  )}
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dark)', textTransform: 'uppercase' }}>
                    {rec.type === 'document' ? 'Document Link' : 'App Capability'}
                  </span>
                </div>
                
                {/* Title */}
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                  {rec.name}
                </span>
                
                {/* Description snippet */}
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  {rec.description}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
