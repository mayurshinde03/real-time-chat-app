import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import NotificationBanner from '../Notifications/NotificationBanner';
import ProfilePicture from '../Profile/ProfilePicture';
import './ModernChat.css';

interface Message {
  id: string;
  type: 'user' | 'system';
  text: string;
  user: string;
  country?: string;
  timestamp: string;
  socketId?: string;
  avatar?: string;
}

interface UserInfo {
  username: string;
  country: string;
  socketId: string;
  joinTime: string;
  avatar?: string;
  isTyping?: boolean;
}

interface Notification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
  icon?: string;
}

const ModernChat: React.FC = () => {
  const [socket, setSocket] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [username, setUsername] = useState('');
  const [tempUsername, setTempUsername] = useState('');
  const [userAvatar, setUserAvatar] = useState('');
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<UserInfo[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [userCountry, setUserCountry] = useState('Unknown');
  const [isLoading, setIsLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [chatStats, setChatStats] = useState({ messagesSent: 0, activeTime: 0 });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const joinTimeRef = useRef<Date>(new Date());

  const emojis = ['😀', '😂', '❤️', '👍', '👋', '🎉', '🔥', '💯', '🌟', '✨', '🤔', '😍', '🥳', '👏', '🌈'];

  // Enhanced notification system
  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { ...notification, id }]);
    
    if (soundEnabled && notification.type === 'info') {
      playNotificationSound();
    }
  }, [soundEnabled]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const playNotificationSound = () => {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IAAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmkfCkjO8ueXUAkVZrvt4KBODgxMpeLxtWEcBz+Y3PLEiSkGKX/J8NyQQwoWYbjqwaJQDghQp+HxtGAdBj2a2/PGdSUFLYDN8diJOAgZabzn56BLDAZRpePxtmI=');
      audio.volume = 0.1;
      audio.play().catch(() => {});
    } catch (error) {
      // Ignore audio errors
    }
  };

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Track active time
  useEffect(() => {
    if (username) {
      const interval = setInterval(() => {
        setChatStats(prev => ({
          ...prev,
          activeTime: Math.floor((Date.now() - joinTimeRef.current.getTime()) / 1000)
        }));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [username]);

  // Auto-delete messages older than 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setMessages(prev => {
        const cutoff = Date.now() - 30000; // 30 seconds ago
        const filteredMessages = prev.filter(msg => {
          const messageTime = new Date(msg.timestamp).getTime();
          return messageTime > cutoff;
        });
        
        // Notify if messages were removed
        if (filteredMessages.length < prev.length) {
          console.log(`Removed ${prev.length - filteredMessages.length} old messages`);
        }
        
        return filteredMessages;
      });
      
      // Notify server to clean old messages
      if (socket) {
        socket.emit('cleanOldMessages', 30000);
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [socket]);

  // Get user's country
  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        setUserCountry(data.country_name || 'Unknown');
      })
      .catch(() => setUserCountry('Unknown'));
  }, []);

  // Socket connection with enhanced features
  useEffect(() => {
    const serverUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
    console.log('Connecting to:', serverUrl);
    
    const newSocket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to server');
      addNotification({
        type: 'success',
        title: 'Connected!',
        message: 'You are now connected to the global chat',
        icon: '🌐'
      });
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from server');
      addNotification({
        type: 'warning',
        title: 'Disconnected',
        message: 'Connection lost. Trying to reconnect...',
        icon: '📡'
      });
    });

    newSocket.on('connect_error', (error: Error) => {
      console.error('Connection error:', error);
      setIsConnected(false);
      addNotification({
        type: 'error',
        title: 'Connection Error',
        message: 'Failed to connect to chat server',
        icon: '⚠️'
      });
    });

    newSocket.on('receiveMessage', (message: Message) => {
      console.log('Received message:', message);
      setMessages(prev => [...prev, message]);
      
      // Show notification for new messages (when window is not focused)
      if (document.hidden && message.user !== username && message.type === 'user') {
        addNotification({
          type: 'info',
          title: `New message from ${message.user}`,
          message: message.text.substring(0, 50) + (message.text.length > 50 ? '...' : ''),
          icon: '💬'
        });
      }
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

    newSocket.on('userJoined', (data: { username: string; country: string }) => {
      addNotification({
        type: 'info',
        title: 'User Joined',
        message: `${data.username} from ${data.country} joined the chat`,
        icon: '👋'
      });
    });

    newSocket.on('userLeft', (data: { username: string }) => {
      addNotification({
        type: 'info',
        title: 'User Left',
        message: `${data.username} left the chat`,
        icon: '👋'
      });
    });

    newSocket.on('error', (error: string) => {
      console.error('Socket error:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: error,
        icon: '❌'
      });
    });

    return () => {
      newSocket.close();
    };
  }, [username, addNotification]);

  const handleAvatarChange = (avatar: string) => {
    setUserAvatar(avatar);
    if (socket && username) {
      socket.emit('updateAvatar', { avatar });
    }
  };

  const joinChat = async () => {
    if (tempUsername.trim().length >= 2 && socket && isConnected) {
      setIsLoading(true);
      const user = tempUsername.trim();
      setUsername(user);
      joinTimeRef.current = new Date();
      
      socket.emit('userJoined', { 
        username: user, 
        country: userCountry,
        avatar: userAvatar
      });
      
      setIsLoading(false);
      
      addNotification({
        type: 'success',
        title: 'Welcome!',
        message: `You joined as ${user}`,
        icon: '🎉'
      });
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
      setChatStats({ messagesSent: 0, activeTime: 0 });
      
      addNotification({
        type: 'info',
        title: 'Left Chat',
        message: 'You have left the global chat',
        icon: '👋'
      });
    }
  };

  const sendMessage = () => {
    if (inputValue.trim() && username && socket && isConnected) {
      console.log('Sending message:', inputValue);
      
      socket.emit('sendMessage', {
        text: inputValue.trim(),
        timestamp: new Date().toISOString(),
        avatar: userAvatar
      });
      
      setChatStats(prev => ({ ...prev, messagesSent: prev.messagesSent + 1 }));
      setInputValue('');
      inputRef.current?.focus();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    
    // Typing indicator
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

  const addEmoji = (emoji: string) => {
    setInputValue(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const generateRandomName = () => {
    const adjectives = ['Cool', 'Smart', 'Happy', 'Brave', 'Kind', 'Funny', 'Creative', 'Bright', 'Awesome', 'Amazing'];
    const nouns = ['Panda', 'Tiger', 'Eagle', 'Dolphin', 'Lion', 'Wolf', 'Fox', 'Bear', 'Dragon', 'Phoenix'];
    const randomName = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${Math.floor(Math.random() * 999)}`;
    setTempUsername(randomName);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatActiveTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.body.classList.toggle('dark-mode', !isDarkMode);
  };

  if (!username) {
    return (
      <div className={`login-container ${isDarkMode ? 'dark' : ''}`}>
        <NotificationBanner 
          notifications={notifications} 
          onRemove={removeNotification} 
        />
        
        <div className="login-card modern-card">
          <div className="login-header">
            <div className="app-logo">🌍</div>
            <h1>Global Chat</h1>
            <p>Connect with people from around the world!</p>
          </div>
          
          <div className="profile-setup">
            <ProfilePicture
              username={tempUsername || 'User'}
              avatarUrl={userAvatar}
              size="large"
              allowEdit={true}
              onAvatarChange={setUserAvatar}
            />
          </div>
          
          <div className="connection-status modern-status">
            <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
              <div className="status-dot"></div>
              <span>
                {isConnected ? `${onlineCount} people online` : 'Connecting...'}
              </span>
            </div>
            <div className="location-info">
              <span className="location-icon">📍</span>
              <span>Your location: {userCountry}</span>
            </div>
          </div>

          <div className="login-form">
            <div className="input-group modern-input">
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
                  className="random-btn modern-btn"
                  title="Generate random name"
                >
                  🎲
                </button>
                <button 
                  onClick={joinChat}
                  disabled={tempUsername.length < 2 || !isConnected || isLoading}
                  className="join-btn modern-btn primary"
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
            <div className="theme-toggle">
              <button onClick={toggleTheme} className="theme-btn modern-btn">
                {isDarkMode ? '☀️' : '🌙'} {isDarkMode ? 'Light' : 'Dark'} Mode
              </button>
            </div>
            <p className="footer-text">🤝 Be respectful and have fun!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`chat-container ${isDarkMode ? 'dark' : ''}`}>
      <NotificationBanner 
        notifications={notifications} 
        onRemove={removeNotification} 
      />

      {/* Enhanced Header */}
      <header className="chat-header modern-header">
        <div className="header-info">
          <div className="app-branding">
            <span className="app-icon">🌍</span>
            <h1>Global Chat</h1>
          </div>
          <div className="user-info">
            <ProfilePicture
              username={username}
              avatarUrl={userAvatar}
              size="small"
              isOnline={true}
              allowEdit={true}
              onAvatarChange={handleAvatarChange}
            />
            <div className="user-details">
              <span className="username">👤 {username}</span>
              <span className="location">📍 {userCountry}</span>
            </div>
          </div>
        </div>
        
        <div className="header-stats">
          <div className="chat-stats">
            <div className="stat-item">
              <span className="stat-value">{chatStats.messagesSent}</span>
              <span className="stat-label">Messages</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{formatActiveTime(chatStats.activeTime)}</span>
              <span className="stat-label">Active</span>
            </div>
          </div>
          
          <div className="header-controls">
            <button 
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`control-btn ${soundEnabled ? 'active' : ''}`}
              title={soundEnabled ? 'Disable sounds' : 'Enable sounds'}
            >
              {soundEnabled ? '🔊' : '🔇'}
            </button>
            
            <button 
              onClick={toggleTheme}
              className="control-btn"
              title="Toggle theme"
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
            
            <div className="online-count">
              <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
                <div className="status-dot"></div>
                <span>{onlineCount} online</span>
              </div>
            </div>
            
            <button onClick={leaveChat} className="leave-btn modern-btn danger">
              🚪 Leave
            </button>
          </div>
        </div>
      </header>

      <div className="chat-body">
        {/* Enhanced Messages Area */}
        <div className="messages-section modern-card">
          <div className="messages-container">
            {messages.length === 0 ? (
              <div className="welcome-message">
                <div className="welcome-animation">🎉</div>
                <h3>Welcome to Global Chat!</h3>
                <p>Start a conversation with people from around the world</p>
                <div className="welcome-feature">
                  <span className="feature-icon">⏰</span>
                  <span>Messages auto-delete after 30 seconds to keep chat fresh!</span>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`message modern-message ${msg.type} ${msg.user === username ? 'own-message' : ''}`}
                >
                  {msg.type === 'system' ? (
                    <div className="system-message">
                      <div className="system-icon">ℹ️</div>
                      <div className="system-content">
                        <span className="system-text">{msg.text}</span>
                        <span className="message-time">{formatTime(msg.timestamp)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="user-message">
                      <ProfilePicture
                        username={msg.user}
                        avatarUrl={msg.avatar}
                        size="small"
                        isOnline={onlineUsers.some(u => u.username === msg.user)}
                      />
                      <div className="message-content-wrapper">
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
                    </div>
                  )}
                </div>
              ))
            )}
            
            {typingUsers.length > 0 && (
              <div className="typing-indicator modern-typing">
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

          {/* Enhanced Message Input */}
          <div className="message-input-container modern-input-container">
            <div className="input-wrapper">
              <button 
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="emoji-btn modern-btn"
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
                  className="send-btn modern-btn primary"
                  title="Send message"
                >
                  🚀
                </button>
              </div>
            </div>

            {showEmojiPicker && (
              <div className="emoji-picker modern-card">
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

        {/* Enhanced Users Sidebar */}
        <div className="users-sidebar modern-card">
          <div className="sidebar-header">
            <h3>🟢 Online Now ({onlineUsers.length})</h3>
            <button 
              className="refresh-btn modern-btn"
              onClick={() => socket?.emit('requestUserList')}
              title="Refresh user list"
            >
              🔄
            </button>
          </div>
          
          <div className="users-list">
            {onlineUsers.length === 0 ? (
              <div className="no-users">
                <div className="no-users-icon">👥</div>
                <p>No users online</p>
              </div>
            ) : (
              onlineUsers.map((user, index) => (
                <div 
                  key={index} 
                  className={`user-item modern-user-item ${user.username === username ? 'current-user' : ''}`}
                >
                  <ProfilePicture
                    username={user.username}
                    avatarUrl={user.avatar}
                    size="small"
                    isOnline={true}
                  />
                  <div className="user-details">
                    <div className="user-name">
                      {user.username === username ? `${user.username} (You)` : user.username}
                      {user.isTyping && <span className="typing-badge">✏️</span>}
                    </div>
                    <div className="user-country">🌍 {user.country}</div>
                    <div className="user-join-time">
                      Joined {new Date(user.joinTime).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
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
