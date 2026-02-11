import React, { useEffect, useRef } from 'react';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

const Chat = ({ messages, message, setMessage, sendMessage, currentUsername }) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const formatTime = (date) => {
    const d = date instanceof Date ? date : new Date();
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  return (
    <div className="flex flex-col h-full bg-[#1a1a2e] text-white">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 shrink-0">
        <ChatBubbleLeftRightIcon className="w-5 h-5 text-blue-400" />
        <h2 className="font-semibold">Chat</h2>
      </div>

      {/* Message history - Zoom/Teams style */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm">
            <ChatBubbleLeftRightIcon className="w-10 h-10 mb-2 opacity-50" />
            <p>No messages yet</p>
            <p className="text-xs mt-1">Send a message to everyone in the meeting</p>
          </div>
        ) : (
          messages.map((item, index) => {
            const isMe = currentUsername && item.sender === currentUsername;
            return (
              <div
                key={index}
                className={`flex flex-col max-w-[85%] ${isMe ? 'items-end ml-auto' : 'items-start'}`}
              >
                <div
                  className={`rounded-2xl px-4 py-2 ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-br-md'
                      : 'bg-white/10 text-gray-100 rounded-bl-md'
                  }`}
                >
                  <p className="text-xs font-medium opacity-90 mb-0.5">
                    {item.sender} {isMe && '(You)'}
                  </p>
                  <p className="text-sm break-words">{item.data}</p>
                </div>
                <span className="text-[10px] text-gray-500 mt-0.5 px-1">
                  {formatTime(new Date())}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Input area */}
      <div className="p-3 border-t border-white/10 shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <button
            type="button"
            onClick={sendMessage}
            className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 font-medium text-sm shrink-0"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
