import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/ToastContext';
import { SkeletonBox } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
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
  Brain,
  MoreVertical,
  Copy,
  Edit3,
  Check,
  Highlighter,
  Sliders,
  Search,
  Sparkles
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
  const [sessionSearch, setSessionSearch] = useState('');
  const toast = useToast();

  // Multi-Model Selection State
  const [availableModels, setAvailableModels] = useState([
    { id: "qwen2:0.5b", name: "Qwen 2.5 (0.5B Fast)", provider: "Ollama (Local CPU)" },
    { id: "llama3:latest", name: "Llama 3.1 (8B Heavy)", provider: "Ollama (Local)" },
    { id: "mistral:latest", name: "Mistral (7B Instruct)", provider: "Ollama (Local)" },
    { id: "gemma:latest", name: "Gemma 3 (Google 2B)", provider: "Ollama (Local)" },
    { id: "deepseek-r1:latest", name: "DeepSeek R1 (Reasoning)", provider: "Ollama (Local)" }
  ]);
  const [selectedModel, setSelectedModel] = useState("qwen2:0.5b");
  
  // Message Actions state
  const [activeMenuMsgId, setActiveMenuMsgId] = useState(null);
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editingText, setEditingText] = useState('');

  // Refs for custom scroll management
  const chatContainerRef = useRef(null);
  const isUserScrolledUpRef = useRef(false);

  const loadModels = async () => {
    try {
      const models = await api.get('/copilot/models');
      if (models && models.length > 0) {
        setAvailableModels(models);
      }
    } catch (err) {
      console.error("Failed to fetch available AI models", err);
    }
  };

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
    loadModels();
    loadConversations(true);
  }, []);

  // Track if user manually scrolled up in the chat container
  const handleChatScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      isUserScrolledUpRef.current = !isAtBottom;
    }
  };

  // Scroll to bottom when messages change unless user has manually scrolled up
  useEffect(() => {
    if (chatContainerRef.current && !isUserScrolledUpRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  const selectConversation = async (id) => {
    try {
      setActiveConvId(id);
      isUserScrolledUpRef.current = false;
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
          name: "Core Banking Settlement Engine - Double-Entry Ledger Posting",
          description: "Executes real-time debit and credit accounting ledger updates with ACID guarantees."
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
      isUserScrolledUpRef.current = false;
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

    const tempUserMsg = {
      id: Math.random().toString(),
      role: 'user',
      content: text,
      created_at: new Date().toISOString()
    };

    // Reset user scroll lock so user's new message scrolls into view
    isUserScrolledUpRef.current = false;
    setMessages(prev => [...prev, tempUserMsg]);
    setInputMessage('');
    setIsSending(true);
    setSuggestions([]);
    
    try {
      const asstMsgId = 'asst-' + Date.now();
      setMessages(prev => [...prev, {
        id: asstMsgId,
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString()
      }]);

      const token = localStorage.getItem('token');
      const response = await fetch('/api/copilot/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          conversation_id: activeConvId,
          message: text,
          model: selectedModel
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              if (data.token) {
                accumulatedText += data.token;
                setMessages(prev => prev.map(m => m.id === asstMsgId ? { ...m, content: accumulatedText } : m));
              }
              if (data.done) {
                if (data.conversation_id && !activeConvId) {
                  setActiveConvId(data.conversation_id);
                }
                if (data.full_text) {
                  setMessages(prev => prev.map(m => m.id === asstMsgId ? { ...m, content: data.full_text } : m));
                }
                if (data.suggestions && data.suggestions.length > 0) {
                  setSuggestions(data.suggestions);
                }
                if (data.recommendations && data.recommendations.length > 0) {
                  setRecommendations(data.recommendations);
                }
              }
            } catch (e) {
              // ignore partial chunk parse error
            }
          }
        }
      }
      loadConversations();
    } catch (err) {
      console.warn("Stream error encountered, executing fallback chat request...", err);
      try {
        const fallbackRes = await api.post('/copilot/chat', {
          conversation_id: activeConvId,
          message: text,
          model: selectedModel
        });
        if (fallbackRes && fallbackRes.response) {
          if (fallbackRes.conversation_id && !activeConvId) {
            setActiveConvId(fallbackRes.conversation_id);
          }
          setMessages(prev => {
            const filtered = prev.filter(m => !m.id.startsWith('asst-') || m.content !== '');
            return [...filtered, {
              id: fallbackRes.message_id || ('asst-' + Date.now()),
              role: 'assistant',
              content: fallbackRes.response,
              created_at: new Date().toISOString()
            }];
          });
          if (fallbackRes.suggestions && fallbackRes.suggestions.length > 0) {
            setSuggestions(fallbackRes.suggestions);
          }
          if (fallbackRes.recommendations && fallbackRes.recommendations.length > 0) {
            setRecommendations(fallbackRes.recommendations);
          }
          loadConversations();
          return;
        }
      } catch (fallbackErr) {
        console.error("Both stream and standard chat endpoints failed", fallbackErr);
      }
      setMessages(prev => {
        const filtered = prev.filter(m => !m.id.startsWith('asst-') || m.content !== '');
        return [...filtered, {
          id: Math.random().toString(),
          role: 'assistant',
          content: "Error communicating with AI Copilot service. Please verify server connectivity and try again.",
          created_at: new Date().toISOString()
        }];
      });
    } finally {
      setIsSending(false);
    }
  };

  // Message Actions Handlers
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
    handleSendMessage(editingText);
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

  const activeModelObj = availableModels.find(m => m.id === selectedModel) || availableModels[0];

  return (
    <div>
      {/* Standardized Page Header */}
      <div className="page-header" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="page-title-group">
          <div className="page-title-row">
            <h1 className="page-title">
              <Brain size={28} className="page-title-icon" />
              <span>AI Copilot</span>
            </h1>
            <span className="badge badge-primary">SSE Stream</span>
            <span className="badge badge-secondary">{activeModelObj?.name || selectedModel}</span>
          </div>
          <p className="page-subtitle">
            Context-aware AI technical assistant for architecture audits, Oracle dependencies, and real-time ledger intelligence.
          </p>
        </div>
      </div>

      <div 
        className="copilot-container"
        style={{ 
          display: 'grid', 
          gridTemplateColumns: '260px 1fr 300px', 
          height: 'calc(100vh - 210px)', 
          maxHeight: 'calc(100vh - 210px)', 
          gap: 'var(--space-5)', 
          overflow: 'hidden' 
        }}
      >
        
        {/* 1. Sidebar Session List */}
        <div 
          className="card copilot-sessions-panel" 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%', 
            minHeight: 0,
            padding: 'var(--space-4)', 
            overflow: 'hidden' 
          }}
        >
          <div className="section-header" style={{ marginBottom: 'var(--space-3)' }}>
            <h3 className="section-title" style={{ fontSize: '15px' }}>
              <MessageSquare size={16} className="section-title-icon" />
              <span>Audit Sessions</span>
            </h3>
          </div>
        
        {/* Create new chat input */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexShrink: 0 }}>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Session title..." 
            value={newChatTitle}
            onChange={(e) => setNewChatTitle(e.target.value)}
            style={{ padding: '8px', fontSize: '13px' }}
          />
          <button onClick={handleCreateConversation} className="btn btn-primary" style={{ padding: '8px 12px' }} title="New Session">
            <Plus size={16} />
          </button>
        </div>

        {/* Filter sessions input */}
        <div style={{ position: 'relative', marginBottom: '12px', flexShrink: 0 }}>
          <input
            type="text"
            className="form-input"
            placeholder="Filter sessions..."
            value={sessionSearch}
            onChange={(e) => setSessionSearch(e.target.value)}
            style={{ padding: '6px 10px 6px 28px', fontSize: '12px', width: '100%' }}
          />
          <Search size={13} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        </div>

        {/* Chats lists */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
          {isLoadingChats ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading sessions...</p>
          ) : conversations.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>No active audit sessions. Click '+' to start.</p>
          ) : (
            conversations
              .filter(c => c.title.toLowerCase().includes(sessionSearch.toLowerCase()))
              .map((conv) => (
                <div 
                  key={conv.id}
                  onClick={() => selectConversation(conv.id)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 10px',
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
                    maxWidth: '160px'
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
      <div 
        className="card copilot-chat-panel" 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          height: '100%', 
          minHeight: 0,
          padding: '20px', 
          overflow: 'hidden' 
        }}
      >
        {/* Fixed Chat Header with Interactive Model Selector */}
        <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', flexShrink: 0 }}>
          <h2 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={18} style={{ color: 'var(--color-primary)' }} />
            <span>AI Copilot Workspace</span>
          </h2>

          {/* Model Selector Control */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={13} style={{ color: 'var(--color-secondary)' }} />
            <span style={{ fontSize: '11px', color: 'var(--text-dark)', fontWeight: 600 }}>MODEL:</span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              style={{
                background: 'rgba(99, 102, 241, 0.12)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                color: 'var(--color-primary)',
                padding: '5px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none'
              }}
              title={activeModelObj?.description || "Selected AI Model"}
            >
              {availableModels.map(m => (
                <option key={m.id} value={m.id} style={{ background: '#1e293b', color: '#f8fafc' }}>
                  {m.name} ({m.provider})
                </option>
              ))}
            </select>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--status-completed)', fontWeight: 600, background: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
              ● Active
            </span>
          </div>
        </div>

        {/* Scrollable Chat Message Log (Only this area scrolls) */}
        <div 
          ref={chatContainerRef}
          onScroll={handleChatScroll}
          style={{ 
            flex: 1, 
            minHeight: 0,
            overflowY: 'auto', 
            paddingRight: '8px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '16px', 
            marginBottom: '16px',
            scrollBehavior: 'smooth'
          }}
        >
          {messages.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', textAlign: 'center' }}>
              <Brain size={48} style={{ opacity: 0.1, marginBottom: '16px', color: 'var(--color-primary)' }} />
              <p style={{ fontSize: '14px', maxWidth: '400px' }}>Ask me about database relationships, application catalogs, knowledge files, or generate custom recommendations.</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const msgKey = msg.id || `temp-${idx}`;
              const isEditing = editingMsgId === msgKey;
              const isCopied = copiedMsgId === msgKey;
              const isMenuOpen = activeMenuMsgId === msgKey;
              const textElementId = `msg-text-${msgKey}`;

              return (
                <div 
                  key={msgKey}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    position: 'relative'
                  }}
                >
                  {/* Sender Header & Message Actions Menu */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '11px',
                    color: 'var(--text-dark)',
                    marginBottom: '4px',
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start'
                  }}>
                    {msg.role === 'user' ? <User size={12} /> : <Cpu size={12} style={{ color: 'var(--color-primary)' }} />}
                    <span>{msg.role === 'user' ? 'You' : `FKIP Copilot (${selectedModel})`}</span>

                    {/* Action Menu Container */}
                    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: '4px' }}>
                      {isCopied && (
                        <span style={{ color: 'var(--status-completed)', fontSize: '10px', fontWeight: 600, marginRight: '4px' }}>
                          Copied!
                        </span>
                      )}

                      <button 
                        onClick={() => setActiveMenuMsgId(isMenuOpen ? null : msgKey)}
                        title="Message Actions"
                        style={{
                          background: isMenuOpen ? 'rgba(255,255,255,0.1)' : 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: '2px 4px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <MoreVertical size={14} />
                      </button>

                      {/* Dropdown Menu */}
                      {isMenuOpen && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          right: msg.role === 'user' ? 0 : 'auto',
                          left: msg.role === 'user' ? 'auto' : 0,
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
                          {/* Copy Option */}
                          <button 
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

                          {/* Select Text Option */}
                          <button 
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

                          {/* Edit Option (User messages only) */}
                          {msg.role === 'user' && (
                            <button 
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

                  {/* Inline Message Edit or Normal Bubble */}
                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', minWidth: '280px' }}>
                      <textarea 
                        className="form-input"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        style={{ fontSize: '13px', width: '100%', minHeight: '60px', padding: '10px' }}
                      />
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button onClick={() => setEditingMsgId(null)} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '11px' }}>
                          Cancel
                        </button>
                        <button onClick={handleSaveEditedMessage} className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '11px' }}>
                          Save & Send
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      id={textElementId}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '12px',
                        fontSize: '14px',
                        lineHeight: '1.5',
                        backgroundColor: msg.role === 'user' ? 'var(--color-primary)' : 'var(--bg-input)',
                        color: 'var(--text-main)',
                        border: msg.role === 'user' ? 'none' : '1px solid var(--border-color)',
                        whiteSpace: 'pre-wrap',
                        userSelect: 'text',
                        WebkitUserSelect: 'text',
                        MozUserSelect: 'text'
                      }}
                    >
                      {msg.content}
                    </div>
                  )}
                </div>
              );
            })
          )}
          {isSending && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>
              <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
              <span>Copilot ({activeModelObj?.name || selectedModel}) is indexing context and thinking...</span>
            </div>
          )}
        </div>

        {/* Fixed Suggested Prompts Pill Row */}
        {suggestions.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px', flexShrink: 0 }}>
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

        {/* Fixed Bottom Input Bar */}
        <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
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
      <div 
        className="card copilot-recs-panel" 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          height: '100%', 
          minHeight: 0,
          padding: '16px', 
          overflow: 'hidden' 
        }}
      >
        <h3 style={{ fontSize: '15px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-secondary)', flexShrink: 0 }}>
          <Compass size={16} />
          <span>Context Recommendations</span>
        </h3>
        
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
          {recommendations.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-dark)', fontSize: '13px', padding: '40px 0' }}>
              <Compass size={32} style={{ opacity: 0.1, margin: '0 auto 12px auto' }} />
              <p>Relevant knowledge files or features will automatically appear here based on your conversation context.</p>
            </div>
          ) : (
            recommendations.map((rec, idx) => (
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
            ))
          )}
        </div>
      </div>
    </div>
  </div>
  );
}
