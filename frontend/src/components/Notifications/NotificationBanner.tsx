import React, { useEffect } from 'react';
import './NotificationBanner.css';

interface Notification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
  icon?: string;
}

interface NotificationBannerProps {
  notifications: Notification[];
  onRemove: (id: string) => void;
}

const NotificationBanner: React.FC<NotificationBannerProps> = ({ notifications, onRemove }) => {
  useEffect(() => {
    notifications.forEach(notification => {
      if (notification.duration && notification.duration > 0) {
        const timer = setTimeout(() => {
          onRemove(notification.id);
        }, notification.duration);

        return () => clearTimeout(timer);
      }
    });
  }, [notifications, onRemove]);

  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`notification notification-${notification.type}`}
          onClick={() => onRemove(notification.id)}
        >
          <div className="notification-content">
            <div className="notification-icon">
              {notification.icon || getDefaultIcon(notification.type)}
            </div>
            <div className="notification-text">
              <div className="notification-title">{notification.title}</div>
              <div className="notification-message">{notification.message}</div>
            </div>
            <button 
              className="notification-close"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(notification.id);
              }}
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

const getDefaultIcon = (type: string) => {
  switch (type) {
    case 'success': return '✅';
    case 'info': return 'ℹ️';
    case 'warning': return '⚠️';
    case 'error': return '❌';
    default: return '📢';
  }
};

export default NotificationBanner;
