import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

interface Message {
  id: string;
  text: string;
  user: string;
  timestamp: Date;
  type: 'message' | 'notification';
}

const Chat: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [username, setUsername] = useState('');
  const [tempUsername, setTempUsername] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const newSocket: Socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000');
    setSocket(newSocket);

    // Connection events
    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to server');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from server');
    });

    // Message events
    newSocket.on('receiveMessage', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    // User events
    newSocket.on('userJoined', (data: { user: string; message: string; timestamp: Date }) => {
      const notification: Message = {
        id: Date.now().toString(),
        text: data.message,
        user: 'System',
        timestamp: new Date(data.timestamp),
        type: 'notification'
      };
      setMessages(prev => [...prev, notification]);
    });

    newSocket.on('userLeft', (data: { user: string; message: string; timestamp: Date }) => {
      const notification: Message = {
        id: Date.now().toString(),
        text: data.message,
        user: 'System',
        timestamp: new Date(data.timestamp),
        type: 'notification'
      };
      setMessages(prev => [...prev, notification]);
    });

    newSocket.on('onlineUsers', (users: string[]) => {
      setOnlineUsers(users);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const joinChat = () => {
    if (tempUsername.trim().length >= 2 && socket) {
      setUsername(tempUsername.trim());
      socket.emit('userJoined', tempUsername.trim());
    }
  };

  const sendMessage = () => {
    if (inputValue.trim() && username.trim() && socket) {
      const message: Message = {
        id: Date.now().toString(),
        text: inputValue.trim(),
        user: username,
        timestamp: new Date(),
        type: 'message'
      };
      socket.emit('sendMessage', message);
      setInputValue('');
    }
  };

  const leaveChat = () => {
    if (socket) {
      socket.emit('userLeft', username);
      setUsername('');
      setTempUsername('');
      setMessages([]);
      setOnlineUsers([]);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Real-Time Chat</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ 
            width: '10px', 
            height: '10px', 
            borderRadius: '50%', 
            backgroundColor: isConnected ? '#4caf50' : '#f44336' 
          }}></div>
          <span style={{ fontSize: '14px', color: '#666' }}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {!username ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <h3>Join the Chat Room</h3>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Enter a username (minimum 2 characters) to start chatting
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Enter your username (e.g., John Doe)"
              value={tempUsername}
              onChange={(e) => setTempUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && tempUsername.trim().length >= 2 && joinChat()}
              style={{ 
                padding: '12px', 
                fontSize: '16px', 
                border: '2px solid #ddd',
                borderRadius: '5px',
                minWidth: '250px',
                borderColor: tempUsername.trim().length >= 2 ? '#4caf50' : '#ddd'
              }}
              maxLength={30}
            />
            <button 
              onClick={joinChat}
              disabled={tempUsername.trim().length < 2}
              style={{ 
                padding: '12px 24px', 
                fontSize: '16px', 
                cursor: tempUsername.trim().length >= 2 ? 'pointer' : 'not-allowed',
                backgroundColor: tempUsername.trim().length >= 2 ? '#1976d2' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '5px'
              }}
            >
              Join Chat
            </button>
          </div>
          <p style={{ fontSize: '12px', color: '#999', marginTop: '10px' }}>
            Character count: {tempUsername.length}/30
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '20px' }}>
          {/* Chat Area */}
          <div style={{ flex: 1 }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '10px',
              padding: '10px',
              backgroundColor: '#e3f2fd',
              borderRadius: '5px'
            }}>
              <span><strong>Welcome, {username}!</strong></span>
              <button 
                onClick={leaveChat}
                style={{ 
                  padding: '5px 15px',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Leave Chat
              </button>
            </div>
            
            <div style={{ 
              height: '400px', 
              border: '1px solid #ccc', 
              padding: '15px', 
              overflowY: 'auto', 
              marginBottom: '15px',
              backgroundColor: '#fafafa',
              borderRadius: '5px'
            }}>
              {messages.length === 0 ? (
                <p style={{ color: '#666', textAlign: 'center', fontStyle: 'italic' }}>
                  No messages yet. Start the conversation!
                </p>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} style={{ 
                    marginBottom: '12px', 
                    padding: msg.type === 'notification' ? '6px 12px' : '10px 12px',
                    backgroundColor: msg.type === 'notification' 
                      ? '#fff3cd' 
                      : msg.user === username 
                        ? '#e3f2fd' 
                        : '#fff',
                    borderRadius: '8px',
                    border: msg.type === 'notification' 
                      ? '1px solid #ffeaa7' 
                      : '1px solid #eee',
                    textAlign: msg.type === 'notification' ? 'center' : 'left'
                  }}>
                    {msg.type === 'notification' ? (
                      <>
                        <span style={{ color: '#856404', fontSize: '14px', fontStyle: 'italic' }}>
                          {msg.text}
                        </span>
                        <small style={{ color: '#666', marginLeft: '10px', fontSize: '11px' }}>
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </small>
                      </>
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <strong style={{ 
                              color: msg.user === username ? '#1976d2' : '#333',
                              fontSize: '14px'
                            }}>
                              {msg.user}:
                            </strong>
                            <span style={{ marginLeft: '8px', fontSize: '15px' }}>
                              {msg.text}
                            </span>
                          </div>
                          <small style={{ color: '#666', fontSize: '11px', marginLeft: '10px' }}>
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </small>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type your message..."
                style={{ 
                  flex: 1, 
                  padding: '12px', 
                  border: '2px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '14px'
                }}
                maxLength={500}
              />
              <button 
                onClick={sendMessage}
                disabled={!inputValue.trim()}
                style={{ 
                  padding: '12px 24px',
                  backgroundColor: inputValue.trim() ? '#4caf50' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '14px'
                }}
              >
                Send
              </button>
            </div>
            <p style={{ fontSize: '11px', color: '#999', marginTop: '5px' }}>
              {inputValue.length}/500 characters
            </p>
          </div>

          {/* Online Users Sidebar */}
          <div style={{ 
            width: '200px', 
            border: '1px solid #ddd', 
            borderRadius: '5px',
            padding: '15px',
            backgroundColor: '#f9f9f9',
            height: 'fit-content'
          }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>
              Online Users ({onlineUsers.length})
            </h4>
            {onlineUsers.length === 0 ? (
              <p style={{ color: '#666', fontSize: '12px', fontStyle: 'italic' }}>
                No users online
              </p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {onlineUsers.map((user, index) => (
                  <li key={index} style={{ 
                    padding: '8px', 
                    marginBottom: '5px',
                    backgroundColor: user === username ? '#e3f2fd' : '#fff',
                    borderRadius: '4px',
                    fontSize: '13px',
                    border: '1px solid #eee',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <div style={{ 
                      width: '8px', 
                      height: '8px', 
                      borderRadius: '50%', 
                      backgroundColor: '#4caf50' 
                    }}></div>
                    <span style={{ 
                      fontWeight: user === username ? 'bold' : 'normal',
                      color: user === username ? '#1976d2' : '#333'
                    }}>
                      {user} {user === username && '(You)'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
