import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import './ModernChat.css';

interface Message {
  id: string;
  type: 'user' | 'system';
  text: string;
  user: string;
  country?: string;
  timestamp: string;
  socketId?: string;
}

interface UserInfo {
  username: string;
  country: string;
  socketId: string;
  joinTime: string;
}

const ModernChat: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const emojis = ['😀', '😂', '❤️', '👍', '👋', '🎉', '🔥', '💯', '🌟', '✨'];

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
      .then(data => {
        setUserCountry(data.country_name || 'Unknown');
      })
      .catch(() => setUserCountry('Unknown'));
  }, []);

  // Socket connection
  useEffect(() => {
    const serverUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
    console.log('Connecting to:', serverUrl);
    
    const newSocket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to server');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from server');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setIsConnected(false);
    });

    newSocket.on('receiveMessage', (message: Message) => {
      console.log('Received message:', message);
      setMessages(prev => [...prev, message]);
    });

    newSocket.on('messageHistory', (history: Message[]) => {
      console.log('Received message history:', history);
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
      alert(error);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const joinChat = async () => {
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
      console.log('Sending message:', inputValue);
      
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
    
    // Typing indicator
    if (socket && username) {
      socket.emit('typing', { isTyping: true });
      
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', { isTyping: false });
      }, 1000);
    }
  };

  const addEmoji = (emoji: string) => {
    setInputValue(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const generateRandomName = () => {
    const adjectives = ['Cool', 'Smart', 'Happy', 'Brave', 'Kind', 'Funny', 'Creative', 'Bright'];
    const nouns = ['Panda', 'Tiger', 'Eagle', 'Dolphin', 'Lion', 'Wolf', 'Fox', 'Bear'];
    const randomName = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${Math.floor(Math.random() * 999)}`;
    setTempUsername(randomName);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!username) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1>🌍 Global Chat</h1>
            <p>Connect with people from around the world!</p>
          </div>
          
          <div className="connection-status">
            <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
              <div className="status-dot"></div>
              <span>
                {isConnected ? `${onlineCount} people online` : 'Connecting...'}
              </span>
            </div>
            <div className="location-info">
              📍 Your location: {userCountry}
            </div>
          </div>

          <div className="login-form">
            <div className="input-group">
              <input
                type="text"
                placeholder="Enter your name"
                value={tempUsername}
                onChange={(e) => setTempUsername(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && tempUsername.length >= 2 && joinChat()}
                className="username-input"
                maxLength={20}
              />
              <div className="input-actions">
                <button 
                  onClick={generateRandomName}
                  className="random-btn"
                  title="Generate random name"
                >
                  🎲
                </button>
                <button 
                  onClick={joinChat}
                  disabled={tempUsername.length < 2 || !isConnected || isLoading}
                  className="join-btn"
                >
                  {isLoading ? '⏳' : '🚀'} Join Chat
                </button>
              </div>
            </div>
            <div className="character-count">
              {tempUsername.length}/20 characters
            </div>
          </div>

          <div className="login-footer">
            <p>🤝 Be respectful and have fun!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      {/* Header */}
      <header className="chat-header">
        <div className="header-info">
          <h1>🌍 Global Chat</h1>
          <div className="user-info">
            <span className="username">👤 {username}</span>
            <span className="location">📍 {userCountry}</span>
          </div>
        </div>
        
        <div className="header-stats">
          <div className="online-count">
            <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
              <div className="status-dot"></div>
              <span>{onlineCount} online</span>
            </div>
          </div>
          <button onClick={leaveChat} className="leave-btn">
            🚪 Leave
          </button>
        </div>
      </header>

      <div className="chat-body">
        {/* Messages Area */}
        <div className="messages-section">
          <div className="messages-container">
            {messages.length === 0 ? (
              <div className="welcome-message">
                <h3>🎉 Welcome to Global Chat!</h3>
                <p>Start a conversation with people from around the world</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`message ${msg.type} ${msg.user === username ? 'own-message' : ''}`}
                >
                  {msg.type === 'system' ? (
                    <div className="system-message">
                      ℹ️ {msg.text}
                      <span className="message-time">{formatTime(msg.timestamp)}</span>
                    </div>
                  ) : (
                    <div className="user-message">
                      <div className="message-header">
                        <span className="message-user">
                          {msg.user === username ? 'You' : msg.user}
                        </span>
                        {msg.country && (
                          <span className="message-country">🌍 {msg.country}</span>
                        )}
                        <span className="message-time">{formatTime(msg.timestamp)}</span>
                      </div>
                      <div className="message-content">{msg.text}</div>
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

          {/* Message Input */}
          <div className="message-input-container">
            <div className="input-wrapper">
              <button 
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="emoji-btn"
                title="Add emoji"
              >
                😀
              </button>
              
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type your message to the world..."
                className="message-input"
                maxLength={500}
                disabled={!isConnected}
              />
              
              <div className="input-actions">
                <span className="char-count">{inputValue.length}/500</span>
                <button 
                  onClick={sendMessage}
                  disabled={!inputValue.trim() || !isConnected}
                  className="send-btn"
                  title="Send message"
                >
                  🚀
                </button>
              </div>
            </div>

            {showEmojiPicker && (
              <div className="emoji-picker">
                {emojis.map((emoji, index) => (
                  <button
                    key={index}
                    onClick={() => addEmoji(emoji)}
                    className="emoji-option"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Online Users Sidebar */}
        <div className="users-sidebar">
          <h3>🟢 Online Now ({onlineUsers.length})</h3>
          <div className="users-list">
            {onlineUsers.length === 0 ? (
              <p className="no-users">No users online</p>
            ) : (
              onlineUsers.map((user, index) => (
                <div 
                  key={index} 
                  className={`user-item ${user.username === username ? 'current-user' : ''}`}
                >
                  <div className="user-avatar">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="user-details">
                    <div className="user-name">
                      {user.username === username ? `${user.username} (You)` : user.username}
                    </div>
                    <div className="user-country">🌍 {user.country}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernChat;
