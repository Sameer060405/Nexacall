import React from 'react';

const Chat = ({ messages, message, setMessage, sendMessage }) => {
  return (
    <div className="flex flex-col h-full p-4 bg-gray-800 text-white">
      <h1 className="text-2xl font-bold mb-4">Chat</h1>
      <div className="flex-1 overflow-y-auto mb-4 p-2 rounded-lg bg-gray-700">
        {messages.length !== 0 ? (
          messages.map((item, index) => (
            <div className="mb-3" key={index}>
              <p className="font-bold text-blue-300">{item.sender}</p>
              <p className="text-gray-100">{item.data}</p>
            </div>
          ))
        ) : (
          <p className="text-gray-400">No Messages Yet</p>
        )}
      </div>
      <div className="flex items-center space-x-2">
        <input
          type="text"
          placeholder="Type your message..."
          className="input input-bordered w-full bg-gray-700 text-white"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              sendMessage();
            }
          }}
        />
        <button className="btn btn-primary" onClick={sendMessage}>
          Send
        </button>
      </div>
    </div>
  );
};

export default Chat;