import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { chatService } from '../services/chatService';
import Layout from '../components/Layout';
import { toast } from 'react-hot-toast';

const ChatPage = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAction, setSelectedAction] = useState('punctuate');
  const [conversationId, setConversationId] = useState(null);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || isLoading) return;

    const messageText = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    // Add user message to chat
    const userMessage = {
      id: Date.now(),
      text: messageText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      // Send message to backend
      const response = await chatService.sendMessage(messageText, conversationId);
      
      // Add assistant response
      const assistantMessage = {
        id: Date.now() + 1,
        text: response.response,
        sender: 'assistant',
        timestamp: new Date(),
        metadata: response.metadata,
        usage: response.usage,
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Update conversation ID if this is a new conversation
      if (response.conversationId && !conversationId) {
        setConversationId(response.conversationId);
      }

    } catch (error) {
      console.error('Chat error:', error);
      
      const errorMessage = {
        id: Date.now() + 1,
        text: `שגיאה: ${error.message || 'לא ניתן היה לשלוח את ההודעה'}`,
        sender: 'system',
        timestamp: new Date(),
        isError: true,
      };

      setMessages(prev => [...prev, errorMessage]);
      toast.error('שגיאה בשליחת ההודעה');
    } finally {
      setIsLoading(false);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const handleTextAction = async (text, action) => {
    if (!text.trim()) return;

    setIsLoading(true);

    try {
      const response = await chatService.processText(text, action);
      
      const resultMessage = {
        id: Date.now(),
        text: response.processedText || response.result,
        sender: 'assistant',
        timestamp: new Date(),
        action: chatService.getActionDescription(action),
        metadata: response.metadata,
        usage: response.usage,
      };

      setMessages(prev => [...prev, resultMessage]);
      toast.success(`${chatService.getActionDescription(action)} הושלם בהצלחה`);

    } catch (error) {
      console.error('Text processing error:', error);
      toast.error(`שגיאה ב${chatService.getActionDescription(action)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setConversationId(null);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (authLoading) {
    return (
      <Layout title="טוען..." showNav={false}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="spinner"></div>
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <Layout title="צ'אט - עורך תורני">
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {/* Chat Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-xl">🤖</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 hebrew-text">
                  עורך תורני - בינה מלאכותית
                </h1>
                <p className="text-sm text-gray-500 hebrew-text">
                  מוכן לעזור בעיבוד הטקסטים התורניים שלך
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 space-x-reverse">
              <button
                onClick={clearChat}
                className="btn btn-outline text-sm"
                disabled={messages.length === 0}
              >
                נקה צ'אט
              </button>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50 px-4 py-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">💬</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 hebrew-text mb-2">
                  ברוך הבא לעורך התורני!
                </h3>
                <p className="text-gray-600 hebrew-text mb-4">
                  תוכל לשלוח לי טקסט לעיבוד או לשאול שאלות על עיבוד טקסטים תורניים
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-2xl mx-auto">
                  <button 
                    onClick={() => setInputMessage('בדוק פיסוק: הרב אמר שדבר זה חשוב מאד והוא צריך לדבר על זה')}
                    className="p-3 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 text-sm hebrew-text text-right"
                  >
                    דוגמה לפיסוק
                  </button>
                  <button 
                    onClick={() => setInputMessage('נקה טקסט: הרב   אמר שדבר זה    חשוב מאד')}
                    className="p-3 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 text-sm hebrew-text text-right"
                  >
                    דוגמה לניקוי
                  </button>
                  <button 
                    onClick={() => setInputMessage('איך אני יכול להשתמש בעורך?')}
                    className="p-3 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 text-sm hebrew-text text-right"
                  >
                    איך משתמשים?
                  </button>
                  <button 
                    onClick={() => setInputMessage('מה האפשרויות הזמינות?')}
                    className="p-3 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 text-sm hebrew-text text-right"
                  >
                    אפשרויות זמינות
                  </button>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-2xl px-4 py-3 rounded-2xl ${
                      message.sender === 'user'
                        ? 'bg-primary-600 text-white'
                        : message.sender === 'system'
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : 'bg-white text-gray-900 border border-gray-200'
                    }`}
                  >
                    {message.action && (
                      <div className="text-xs text-primary-600 font-medium mb-1">
                        {message.action}
                      </div>
                    )}
                    
                    <div className="whitespace-pre-wrap hebrew-text leading-relaxed">
                      {message.text}
                    </div>
                    
                    <div className={`text-xs mt-2 ${
                      message.sender === 'user' ? 'text-primary-100' : 'text-gray-500'
                    }`}>
                      {formatTimestamp(message.timestamp)}
                      {message.usage && (
                        <span className="mr-2">
                          • {message.usage.tokensUsed} אסימונים
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {isLoading && (
              <div className="flex justify-end">
                <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <div className="spinner"></div>
                    <span className="text-gray-500 hebrew-text">מעבד...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 px-4 py-4">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSendMessage} className="flex items-end space-x-3 space-x-reverse">
              <div className="flex-1">
                <textarea
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="הכנס את הטקסט לעיבוד או שאל שאלה..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none hebrew-text"
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                />
              </div>
              
              <button
                type="submit"
                disabled={isLoading || !inputMessage.trim()}
                className="btn btn-primary px-6 py-3 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-5 h-5 spinner"></div>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </form>
            
            <div className="mt-2 text-xs text-gray-500 text-center hebrew-text">
              השתמש ב-Shift+Enter לשורה חדשה • Enter לשליחה
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ChatPage;