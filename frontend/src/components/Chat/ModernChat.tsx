import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './ModernChat.css';

interface Message {
  id: string;
  type: 'user' | 'system';
  text: string;
  user: string;
  country?: string;
  timestamp: string;
  avatar?: string;
}

interface UserInfo {
  username: string;
  country: string;
  socketId: string;
  joinTime: string;
  avatar?: string;
}

const ModernChat: React.FC = () => {
  const [socket, setSocket] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [username, setUsername] = useState('');
  const [tempUsername, setTempUsername] = useState('');
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<UserInfo[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [userCountry, setUserCountry] = useState('Unknown');
  const [isLoading, setIsLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Get user's country
  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => setUserCountry(data.country_name || 'Unknown'))
      .catch(() => setUserCountry('Unknown'));
  }, []);

  // Socket connection
  useEffect(() => {
    const serverUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
    console.log('🔗 Connecting to:', serverUrl);
    
    const newSocket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('✅ Connected to server');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('❌ Disconnected from server');
    });

    newSocket.on('connect_error', (error: Error) => {
      console.error('🔥 Connection error:', error);
      setIsConnected(false);
    });

    newSocket.on('receiveMessage', (message: Message) => {
      console.log('📨 Received message:', message);
      setMessages(prev => [...prev, message]);
    });

    newSocket.on('messageHistory', (history: Message[]) => {
      console.log('📚 Received message history:', history);
      setMessages(history);
    });

    newSocket.on('onlineCount', (count: number) => {
      setOnlineCount(count);
    });

    newSocket.on('onlineUsers', (users: UserInfo[]) => {
      setOnlineUsers(users);
    });

    newSocket.on('userTyping', (data: { username: string; isTyping: boolean }) => {
      if (data.isTyping) {
        setTypingUsers(prev => [...prev.filter(u => u !== data.username), data.username]);
      } else {
        setTypingUsers(prev => prev.filter(u => u !== data.username));
      }
    });

    newSocket.on('error', (error: string) => {
      console.error('Socket error:', error);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const joinChat = () => {
    if (tempUsername.trim().length >= 2 && socket && isConnected) {
      setIsLoading(true);
      const user = tempUsername.trim();
      setUsername(user);
      
      socket.emit('userJoined', { 
        username: user, 
        country: userCountry 
      });
      
      setIsLoading(false);
    }
  };

  const leaveChat = () => {
    if (socket && username) {
      socket.emit('userLeft', username);
      socket.disconnect();
      setUsername('');
      setTempUsername('');
      setMessages([]);
      setOnlineUsers([]);
      setOnlineCount(0);
    }
  };

  const sendMessage = () => {
    if (inputValue.trim() && username && socket && isConnected) {
      console.log('📤 Sending message:', inputValue);
      
      socket.emit('sendMessage', {
        text: inputValue.trim(),
        timestamp: new Date().toISOString()
      });
      
      setInputValue('');
      inputRef.current?.focus();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    
    if (socket && username) {
      socket.emit('typing', { isTyping: true });
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = window.setTimeout(() => {
        socket.emit('typing', { isTyping: false });
      }, 1000);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const generateAvatar = (name: string) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF'];
    const color = colors[name.length % colors.length];
    return color;
  };

  const generateRandomName = () => {
    const adjectives = ['Cool', 'Smart', 'Happy', 'Brave', 'Kind', 'Funny', 'Creative', 'Bright'];
    const nouns = ['Panda', 'Tiger', 'Eagle', 'Dolphin', 'Lion', 'Wolf', 'Fox', 'Bear'];
    const randomName = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${Math.floor(Math.random() * 999)}`;
    setTempUsername(randomName);
  };

  if (!username) {
    return (
      <div className="login-screen">
        <div className="login-container">
          <div className="login-card">
            <div className="login-header">
              <div className="app-icon">💬</div>
              <h1>Global Chat</h1>
              <p>Connect with people worldwide</p>
            </div>
            
            <div className="connection-status">
              <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></div>
              <span className="status-text">
                {isConnected ? `${onlineCount} people online` : 'Connecting...'}
              </span>
            </div>
            
            <div className="login-form">
              <input
                type="text"
                placeholder="Enter your name..."
                value={tempUsername}
                onChange={(e) => setTempUsername(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && tempUsername.length >= 2 && joinChat()}
                className="name-input"
                maxLength={20}
                autoFocus
              />
              
              <div className="login-buttons">
                <button 
                  onClick={generateRandomName}
                  className="random-btn"
                  type="button"
                >
                  🎲 Random
                </button>
                <button 
                  onClick={joinChat}
                  disabled={tempUsername.length < 2 || !isConnected || isLoading}
                  className="join-btn"
                >
                  {isLoading ? '⏳ Joining...' : '🚀 Join Chat'}
                </button>
              </div>
              
              <div className="char-counter">
                {tempUsername.length}/20 characters
              </div>
            </div>
            
            <div className="location-info">
              📍 Your location: {userCountry}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-app">
      {/* Header */}
      <div className="chat-header">
        <div className="header-left">
          <div className="chat-info">
            <h2>Global Chat</h2>
            <p>{onlineCount} members online</p>
          </div>
        </div>
        
        <div className="header-right">
          <div className="user-info">
            <div 
              className="user-avatar"
              style={{ backgroundColor: generateAvatar(username) }}
            >
              {username.charAt(0).toUpperCase()}
            </div>
            <span className="username">{username}</span>
          </div>
          <button onClick={leaveChat} className="leave-btn">
            Leave
          </button>
        </div>
      </div>

      <div className="chat-body">
        {/* Messages */}
        <div className="messages-area">
          <div className="messages-container">
            {messages.length === 0 ? (
              <div className="welcome-screen">
                <div className="welcome-icon">👋</div>
                <h3>Welcome to Global Chat!</h3>
                <p>Start a conversation with people from around the world</p>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div 
                  key={msg.id} 
                  className={`message-wrapper ${msg.user === username ? 'own' : 'other'}`}
                >
                  {msg.type === 'system' ? (
                    <div className="system-message">
                      <span>{msg.text}</span>
                      <time>{formatTime(msg.timestamp)}</time>
                    </div>
                  ) : (
                    <div className="message">
                      {msg.user !== username && (
                        <div 
                          className="message-avatar"
                          style={{ backgroundColor: generateAvatar(msg.user) }}
                        >
                          {msg.user.charAt(0).toUpperCase()}
                        </div>
                      )}
                      
                      <div className="message-content">
                        {msg.user !== username && (
                          <div className="message-header">
                            <span className="sender-name">{msg.user}</span>
                            {msg.country && <span className="sender-location">🌍 {msg.country}</span>}
                          </div>
                        )}
                        
                        <div className="message-bubble">
                          <p>{msg.text}</p>
                          <time className="message-time">{formatTime(msg.timestamp)}</time>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
            
            {typingUsers.length > 0 && (
              <div className="typing-indicator">
                <div className="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span className="typing-text">
                  {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                </span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="sidebar">
          <div className="sidebar-header">
            <h3>Online ({onlineUsers.length})</h3>
          </div>
          
          <div className="users-list">
            {onlineUsers.map((user, index) => (
              <div 
                key={index} 
                className={`user-item ${user.username === username ? 'current-user' : ''}`}
              >
                <div 
                  className="user-avatar small"
                  style={{ backgroundColor: generateAvatar(user.username) }}
                >
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div className="user-details">
                  <div className="user-name">
                    {user.username === username ? `${user.username} (You)` : user.username}
                  </div>
                  <div className="user-country">🌍 {user.country}</div>
                </div>
                <div className="online-indicator"></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="input-area">
        <div className="input-container">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            className="message-input"
            maxLength={500}
            disabled={!isConnected}
          />
          <button 
            onClick={sendMessage}
            disabled={!inputValue.trim() || !isConnected}
            className="send-btn"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModernChat;
