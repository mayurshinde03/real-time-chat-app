import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface Message {
  id: string;
  text: string;
  user: string;
  timestamp: string;
  country?: string;
}

interface UserInfo {
  username: string;
  country: string;
  joinTime: string;
}

const GlobalChat: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [username, setUsername] = useState('');
  const [tempUsername, setTempUsername] = useState('');
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<UserInfo[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [userCountry, setUserCountry] = useState('Unknown');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Get user's country (using a free API)
  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        setUserCountry(data.country_name || 'Unknown');
      })
      .catch(() => setUserCountry('Unknown'));
  }, []);

  useEffect(() => {
    const newSocket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to global chat');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('receiveMessage', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    newSocket.on('userJoined', (data: { user: string; country: string; message: string }) => {
      const notification: Message = {
        id: Date.now().toString(),
        text: `${data.user} from ${data.country} joined the chat`,
        user: 'System',
        timestamp: new Date().toLocaleTimeString(),
        country: data.country
      };
      setMessages(prev => [...prev, notification]);
    });

    newSocket.on('userLeft', (data: { user: string; message: string }) => {
      const notification: Message = {
        id: Date.now().toString(),
        text: data.message,
        user: 'System',
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, notification]);
    });

    newSocket.on('onlineCount', (count: number) => {
      setOnlineCount(count);
    });

    newSocket.on('onlineUsers', (users: UserInfo[]) => {
      setOnlineUsers(users);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const joinChat = () => {
    if (tempUsername.trim().length >= 2 && socket) {
      const user = tempUsername.trim();
      setUsername(user);
      socket.emit('userJoined', { username: user, country: userCountry });
    }
  };

  const leaveChat = () => {
    if (socket && username) {
      socket.emit('userLeft', username);
      setUsername('');
      setTempUsername('');
    }
  };

  const sendMessage = () => {
    if (inputValue.trim() && username && socket) {
      const message: Message = {
        id: Date.now().toString(),
        text: inputValue.trim(),
        user: username,
        timestamp: new Date().toLocaleTimeString(),
        country: userCountry
      };
      socket.emit('sendMessage', message);
      setInputValue('');
    }
  };

  const generateRandomName = () => {
    const adjectives = ['Happy', 'Cool', 'Smart', 'Brave', 'Kind', 'Funny', 'Creative', 'Bright'];
    const nouns = ['Panda', 'Tiger', 'Eagle', 'Dolphin', 'Lion', 'Wolf', 'Fox', 'Bear'];
    const randomName = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${Math.floor(Math.random() * 999)}`;
    setTempUsername(randomName);
  };

  if (!username) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{ 
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '15px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          textAlign: 'center',
          maxWidth: '400px',
          width: '100%'
        }}>
          <h1 style={{ color: '#333', marginBottom: '10px' }}>🌍 Global Chat</h1>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Connect with people from around the world!
          </p>
          <div style={{ 
            backgroundColor: '#f0f8ff', 
            padding: '15px', 
            borderRadius: '10px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px'
          }}>
            <div style={{ 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%',
              backgroundColor: isConnected ? '#4caf50' : '#f44336'
            }}></div>
            <span style={{ fontSize: '14px' }}>
              {isConnected ? `${onlineCount} people online` : 'Connecting...'}
            </span>
            <span style={{ fontSize: '12px', color: '#666' }}>
              | Your location: {userCountry}
            </span>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Enter your name"
              value={tempUsername}
              onChange={(e) => setTempUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && tempUsername.length >= 2 && joinChat()}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px',
                marginBottom: '10px',
                boxSizing: 'border-box'
              }}
              maxLength={20}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button 
                onClick={generateRandomName}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f0f0f0',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                🎲 Random Name
              </button>
              <button 
                onClick={joinChat}
                disabled={tempUsername.length < 2}
                style={{
                  padding: '12px 24px',
                  backgroundColor: tempUsername.length >= 2 ? '#4caf50' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: tempUsername.length >= 2 ? 'pointer' : 'not-allowed',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                Join Chat ({tempUsername.length}/20)
              </button>
            </div>
          </div>

          <p style={{ fontSize: '12px', color: '#999' }}>
            By joining, you agree to be respectful to other users
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      backgroundColor: '#f5f7fa',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <header style={{
        backgroundColor: '#4a90e2',
        color: 'white',
        padding: '15px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px' }}>🌍 Global Chat</h1>
          <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
            Welcome, {username} from {userCountry}!
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{onlineCount}</div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>online</div>
          </div>
          <button 
            onClick={leaveChat}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Leave
          </button>
        </div>
      </header>

      {/* Main Chat Area */}
      <div style={{ 
        flex: 1,
        display: 'flex',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%',
        gap: '20px',
        padding: '20px'
      }}>
        {/* Messages */}
        <div style={{ flex: 1 }}>
          <div style={{
            height: '60vh',
            backgroundColor: 'white',
            border: '1px solid #e1e8ed',
            borderRadius: '10px',
            padding: '20px',
            overflowY: 'auto',
            marginBottom: '20px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
          }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#666', marginTop: '50px' }}>
                <h3>Welcome to Global Chat! 🎉</h3>
                <p>Start a conversation with people from around the world</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} style={{
                  marginBottom: '15px',
                  padding: '12px',
                  borderRadius: '10px',
                  backgroundColor: msg.user === 'System' 
                    ? '#fff3cd' 
                    : msg.user === username 
                      ? '#e3f2fd' 
                      : '#f8f9fa',
                  border: '1px solid ' + (msg.user === 'System' ? '#ffeaa7' : '#e9ecef')
                }}>
                  {msg.user === 'System' ? (
                    <div style={{ textAlign: 'center', fontSize: '14px', color: '#856404' }}>
                      ℹ️ {msg.text}
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <strong style={{ color: msg.user === username ? '#1976d2' : '#333' }}>
                          {msg.user} {msg.country && `🌍 ${msg.country}`}
                        </strong>
                        <small style={{ color: '#666' }}>{msg.timestamp}</small>
                      </div>
                      <div style={{ fontSize: '15px', lineHeight: '1.4' }}>
                        {msg.text}
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div style={{ 
            display: 'flex', 
            gap: '10px',
            backgroundColor: 'white',
            padding: '15px',
            borderRadius: '10px',
            border: '1px solid #e1e8ed'
          }}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type your message to the world..."
              style={{
                flex: 1,
                padding: '12px',
                border: '2px solid #e1e8ed',
                borderRadius: '25px',
                fontSize: '14px',
                outline: 'none'
              }}
              maxLength={300}
            />
            <button 
              onClick={sendMessage}
              disabled={!inputValue.trim()}
              style={{
                padding: '12px 24px',
                backgroundColor: inputValue.trim() ? '#4caf50' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '25px',
                cursor: inputValue.trim() ? 'pointer' : 'not-allowed'
              }}
            >
              Send 🚀
            </button>
          </div>
        </div>

        {/* Online Users Sidebar */}
        <div style={{
          width: '250px',
          backgroundColor: 'white',
          border: '1px solid #e1e8ed',
          borderRadius: '10px',
          padding: '20px',
          height: 'fit-content',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>
            🟢 Online Now ({onlineUsers.length})
          </h3>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {onlineUsers.map((user, index) => (
              <div key={index} style={{
                padding: '10px',
                marginBottom: '8px',
                backgroundColor: user.username === username ? '#e3f2fd' : '#f8f9fa',
                borderRadius: '8px',
                fontSize: '13px',
                border: '1px solid #e9ecef'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>
                  {user.username === username ? `${user.username} (You)` : user.username}
                </div>
                <div style={{ color: '#666', fontSize: '11px' }}>
                  🌍 {user.country}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalChat;
