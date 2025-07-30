import React, { useState, useRef } from 'react';
import './ProfilePicture.css';

interface ProfilePictureProps {
  username: string;
  avatarUrl?: string;
  size?: 'small' | 'medium' | 'large';
  isOnline?: boolean;
  allowEdit?: boolean;
  onAvatarChange?: (avatar: string) => void;
}

const ProfilePicture: React.FC<ProfilePictureProps> = ({
  username,
  avatarUrl,
  size = 'medium',
  isOnline = false,
  allowEdit = false,
  onAvatarChange
}) => {
  const [currentAvatar, setCurrentAvatar] = useState(avatarUrl || generateAvatar(username));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setCurrentAvatar(result);
        onAvatarChange?.(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateNewAvatar = () => {
    const newAvatar = generateAvatar(username + Date.now());
    setCurrentAvatar(newAvatar);
    onAvatarChange?.(newAvatar);
  };

  return (
    <div className={`profile-picture-container ${size}`}>
      <div className="profile-picture-wrapper">
        <div 
          className="profile-picture"
          style={{ backgroundImage: `url(${currentAvatar})` }}
        >
          {!currentAvatar && (
            <span className="profile-initial">
              {username.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        
        {isOnline && <div className="online-indicator" />}
        
        {allowEdit && (
          <div className="profile-edit-overlay">
            <button 
              className="edit-button"
              onClick={() => fileInputRef.current?.click()}
              title="Upload photo"
            >
              📷
            </button>
            <button 
              className="generate-button"
              onClick={generateNewAvatar}
              title="Generate avatar"
            >
              🎲
            </button>
          </div>
        )}
      </div>
      
      {allowEdit && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      )}
    </div>
  );
};

// Generate colorful avatar using DiceBear API
const generateAvatar = (seed: string): string => {
  const styles = ['avataaars', 'big-smile', 'bottts', 'identicon', 'initials', 'pixel-art'];
  const style = styles[Math.floor(Math.random() * styles.length)];
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=random`;
};

export default ProfilePicture;
