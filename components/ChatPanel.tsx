
import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../types';
import { Icons } from './Icons';

interface ChatPanelProps {
  chatHistory: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  isReady: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ chatHistory, onSendMessage, isLoading, isReady }) => {
  const [inputMessage, setInputMessage] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleSend = () => {
    if (inputMessage.trim()) {
      onSendMessage(inputMessage);
      setInputMessage('');
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
        <Icons.MessageSquare className="w-5 h-5 text-gray-600" />
        <span>SME Chat & Refinement</span>
      </h2>
      <div ref={chatContainerRef} className="flex-grow overflow-y-auto pr-2 -mr-2 mb-4 space-y-4">
        {chatHistory.map((msg, index) => (
          <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'model' && (
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <Icons.Bot className="w-5 h-5 text-indigo-600" />
              </div>
            )}
            <div
              className={`max-w-xs md:max-w-sm lg:max-w-xs xl:max-w-sm rounded-lg px-4 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-none'
                  : 'bg-gray-200 text-gray-800 rounded-bl-none'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
             {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                <Icons.User className="w-5 h-5 text-gray-600" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
           <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <Icons.Bot className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="bg-gray-200 text-gray-800 rounded-lg rounded-bl-none px-4 py-3">
                <Icons.Loader className="w-5 h-5 animate-spin" />
            </div>
           </div>
        )}
      </div>
      <div className="flex items-center gap-2 border-t border-gray-200 pt-3">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && !isLoading && isReady && handleSend()}
          placeholder={isReady ? "Ask for changes..." : "Analyze a document first"}
          className="flex-grow p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-sm"
          disabled={isLoading || !isReady}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !isReady || !inputMessage.trim()}
          className="bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors"
        >
          <Icons.Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
