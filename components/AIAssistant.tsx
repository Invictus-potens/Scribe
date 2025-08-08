
'use client';

import { useState } from 'react';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hello! I\'m your AI assistant. I can help you generate content, brainstorm ideas, and answer questions. How can I assist you today?',
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponses = [
        "That's a great question! Based on what you've shared, here are some thoughts and suggestions that might help you move forward...",
        "I can help you brainstorm ideas for that project. Let me break down some creative approaches you could consider...",
        "Here's a structured outline for your content: 1) Introduction with key points, 2) Main body with supporting details, 3) Conclusion with actionable next steps...",
        "I understand you're looking for creative solutions. Here are some innovative approaches that could work well for your situation...",
        "Let me help you organize those thoughts into a clear, actionable plan. We can start by identifying the core objectives..."
      ];

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponses[Math.floor(Math.random() * aiResponses.length)],
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handleInsertToNotes = (_messageContent: string) => {
    // This would integrate with the notes system
    alert('Content would be inserted into your notes!');
    setSelectedMessage(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const suggestedPrompts = [
    "Help me brainstorm ideas for my project",
    "Write a summary of my meeting notes",
    "Create a task list for my goals",
    "Generate content for my presentation",
    "Organize my thoughts into sections"
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <i className="ri-robot-line w-5 h-5 flex items-center justify-center text-white"></i>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">AI Assistant</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Your creative productivity partner</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-green-600 dark:text-green-400 flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Online</span>
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {messages.length === 1 && (
          <div className="p-6 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Try these prompts:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {suggestedPrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => setInputMessage(prompt)}
                  className="text-left p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                >
                  <span className="text-gray-700 dark:text-gray-300 text-sm">{prompt}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[70%] ${
                message.sender === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700'
              } rounded-lg p-4 shadow-sm`}>
                <div className="flex items-start space-x-3">
                  {message.sender === 'ai' && (
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <i className="ri-robot-line w-3 h-3 flex items-center justify-center text-white"></i>
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className={`text-xs ${
                        message.sender === 'user' 
                          ? 'text-blue-100' 
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {message.sender === 'ai' && (
                        <button
                          onClick={() => setSelectedMessage(message.id)}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium whitespace-nowrap"
                        >
                          Insert to Notes
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <i className="ri-robot-line w-3 h-3 flex items-center justify-center text-white"></i>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything or request help with your content..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm resize-none"
                rows={3}
                disabled={isLoading}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className={`px-6 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                !inputMessage.trim() || isLoading
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isLoading ? (
                <i className="ri-loader-4-line w-4 h-4 flex items-center justify-center animate-spin"></i>
              ) : (
                <i className="ri-send-plane-line w-4 h-4 flex items-center justify-center"></i>
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>

      {selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Insert to Notes</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              This AI response will be inserted into your notes. You can edit it later.
            </p>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg mb-4 max-h-32 overflow-y-auto">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {messages.find(m => m.id === selectedMessage)?.content}
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setSelectedMessage(null)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                onClick={() => handleInsertToNotes(messages.find(m => m.id === selectedMessage)?.content || '')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors whitespace-nowrap"
              >
                Insert to Notes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
