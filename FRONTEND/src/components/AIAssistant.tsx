import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './AIAssistant.css';

interface AIAssistantProps {
  platform: string;
  metrics: any;
  account: any;
}

export default function AIAssistant({ platform, metrics, account }: AIAssistantProps) {
  const { token } = useAuth();
  const platformTitle = platform.charAt(0).toUpperCase() + platform.slice(1);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    {
      role: 'assistant',
      content: `¡Hola! Soy tu asistente de IA para ${platformTitle}. Puedo analizar tus estadísticas y darte recomendaciones personalizadas basadas en tus datos. ¿Qué te gustaría saber?`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      if (!token) {
        throw new Error('No autenticado');
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/ai/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          platform,
          question: userMessage,
          metrics,
          account: {
            displayName: account?.displayName,
            platform: account?.platform
          }
        })
      });

      if (!response.ok) {
        throw new Error('Error al obtener respuesta');
      }

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response || data.message || 'Lo siento, no pude procesar tu pregunta.' }]);
    } catch (error: any) {
      console.error('AI Assistant error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Lo siento, hubo un error al procesar tu pregunta. Por favor, intenta de nuevo.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickQuestions = [
    '¿Cómo están mis estadísticas?',
    'Dame recomendaciones',
    '¿Qué puedo mejorar?',
    'Analiza mi crecimiento'
  ];

  const handleQuickQuestion = (question: string) => {
    setInput(question);
    setTimeout(() => handleSend(), 100);
  };

  return (
    <div className="ai-assistant">
      <div className="ai-assistant-header">
        <div className="ai-assistant-title">
          <div className="ai-icon">✨</div>
          <div>
            <h3>Asistente de IA</h3>
            <p>Analiza tus estadísticas y obtén recomendaciones</p>
          </div>
        </div>
      </div>

      <div className="ai-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`ai-message ${msg.role}`}>
            <div className="ai-message-avatar">
              {msg.role === 'assistant' ? '✨' : '👤'}
            </div>
            <div className="ai-message-content">
              <div className="ai-message-text">
                {msg.content.split('\n').map((line, i) => {
                  const trimmed = line.trim();
                  
                  // Empty line
                  if (trimmed === '') {
                    return <br key={i} />;
                  }
                  
                  // Bold text (markdown **text**)
                  if (trimmed.includes('**')) {
                    const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
                    return (
                      <div key={i} style={{marginBottom: '6px', lineHeight: '1.6'}}>
                        {parts.map((part, j) => {
                          if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={j} style={{fontWeight: 700}}>{part.replace(/\*\*/g, '')}</strong>;
                          }
                          return <span key={j}>{part}</span>;
                        })}
                      </div>
                    );
                  }
                  
                  // Bullet points
                  if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
                    return (
                      <div key={i} style={{marginLeft: '12px', marginBottom: '6px', lineHeight: '1.6'}}>
                        {trimmed}
                      </div>
                    );
                  }
                  
                  // Regular text
                  return (
                    <div key={i} style={{marginBottom: '6px', lineHeight: '1.6'}}>
                      {trimmed}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="ai-message assistant">
            <div className="ai-message-avatar">✨</div>
            <div className="ai-message-content">
              <div className="ai-loading">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {messages.length === 1 && (
        <div className="ai-quick-questions">
          <p className="ai-quick-label">Preguntas rápidas:</p>
          <div className="ai-quick-buttons">
            {quickQuestions.map((q, idx) => (
              <button
                key={idx}
                className="ai-quick-btn"
                onClick={() => handleQuickQuestion(q)}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="ai-input-container">
        <input
          type="text"
          className="ai-input"
          placeholder="Escribe tu pregunta sobre las estadísticas..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
        />
        <button
          className="ai-send-btn"
          onClick={handleSend}
          disabled={loading || !input.trim()}
        >
          {loading ? '⏳' : '➤'}
        </button>
      </div>
    </div>
  );
}

