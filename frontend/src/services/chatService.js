import api from './apiService';

export const chatService = {
  // Send message to chat
  sendMessage: async (message, conversationId = null) => {
    const response = await api.post('/chat', {
      message,
      conversationId,
    });
    return response; // API interceptor already returns response.data
  },

  // Process text with specific action
  processText: async (text, action = 'punctuate') => {
    const endpoint = `/text/${action}`;
    const response = await api.post(endpoint, { text });
    return response; // API interceptor already returns response.data
  },

  // Get chat history
  getConversations: async (limit = 10, page = 1) => {
    const response = await api.get(`/conversations?limit=${limit}&page=${page}`);
    return response; // API interceptor already returns response.data
  },

  // Get specific conversation
  getConversation: async (conversationId) => {
    const response = await api.get(`/conversations/${conversationId}`);
    return response; // API interceptor already returns response.data
  },

  // Delete conversation
  deleteConversation: async (conversationId) => {
    const response = await api.delete(`/conversations/${conversationId}`);
    return response; // API interceptor already returns response.data
  },

  // Available text processing actions
  textActions: {
    punctuate: 'פיסוק מלא',
    clean: 'ניקוי וסידור',
    paragraph: 'חלוקה לפסקאות',
    vocalize: 'ניקוד',
    format: 'עיצוב מתקדם',
    translate: 'תרגום',
    summarize: 'סיכום',
    analyze: 'ניתוח',
  },

  // Get action description
  getActionDescription: (action) => {
    return chatService.textActions[action] || action;
  }
};