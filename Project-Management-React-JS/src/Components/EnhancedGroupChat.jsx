import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import { supabase } from '../supabaseClient';
import socket from '../socket';
import API_BASE_URL from '../apiConfig';
import './EnhancedGroupChat.css';

const EnhancedGroupChat = ({ groupId, currentUser, groupMembers = [] }) => {
  // State management
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Refs
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messageInputRef = useRef(null);

  // Common emojis for reactions
  const commonEmojis = ['👍', '❤️', '😂', '😮', '😢', '😡', '👏', '🔥'];

  // Initialize chat system
  useEffect(() => {
    if (!currentUser?.id) return;

    const initializeChat = async () => {
      try {
        // Connect to socket
        socket.connect();
        socket.emit('join_chat_system', currentUser.id);

        // Load chats for the group
        await loadChats();
        
        setLoading(false);
      } catch (error) {
        console.error('Error initializing chat:', error);
        toast.error('Failed to initialize chat');
        setLoading(false);
      }
    };

    initializeChat();

    return () => {
      socket.disconnect();
    };
  }, [currentUser?.id, groupId]);

  // Socket event listeners
  useEffect(() => {
    socket.on('new_message', handleNewMessage);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_status_changed', handleUserStatusChanged);
    socket.on('reaction_added', handleReactionAdded);
    socket.on('reaction_removed', handleReactionRemoved);
    socket.on('message_read', handleMessageRead);
    socket.on('call_invitation', handleCallInvitation);
    socket.on('call_response', handleCallResponse);
    socket.on('call_ended', handleCallEnded);

    return () => {
      socket.off('new_message');
      socket.off('user_typing');
      socket.off('user_status_changed');
      socket.off('reaction_added');
      socket.off('reaction_removed');
      socket.off('message_read');
      socket.off('call_invitation');
      socket.off('call_response');
      socket.off('call_ended');
    };
  }, [activeChat]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chats for the group
  const loadChats = async () => {
    try {
      console.log('Loading chats for group:', groupId);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('No session found');
        return;
      }

      console.log('Fetching chats from API...');
      const response = await fetch(`${API_BASE_URL}/api/enhanced-chat/chats`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      console.log('API response status:', response.status);
      if (response.ok) {
        const allChats = await response.json();
        console.log('All chats received:', allChats);
        // Filter chats for this group
        const groupChats = allChats.filter(chat => chat.group_id === groupId);
        console.log('Group chats filtered:', groupChats);
        
        // If no chats exist for this group, create a default one
        if (groupChats.length === 0) {
          console.log('No chats found, creating default chat...');
          await createDefaultGroupChat();
          return; // createDefaultGroupChat will call loadChats again
        }
        
        setChats(groupChats);
        
        // Auto-select first chat if available
        if (groupChats.length > 0 && !activeChat) {
          setActiveChat(groupChats[0]);
          socket.emit('join_chat', groupChats[0].id);
        }
      } else {
        console.error('API response not ok:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Error loading chats:', error);
      toast.error('Failed to load chats');
    }
  };

  // Create default group chat
  const createDefaultGroupChat = async () => {
    try {
      console.log('Creating default group chat...');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('No session for creating chat');
        return;
      }

      // Get all group member IDs (excluding current user since they're added as admin)
      const participantIds = groupMembers
        .map(member => member.user?.id || member.user_id)
        .filter(id => id && id !== currentUser?.id);
      
      console.log('Group members:', groupMembers);
      console.log('Participant IDs:', participantIds);
      console.log('Current user:', currentUser);

      const chatData = {
        type: 'group',
        name: 'General Chat',
        description: 'Main group discussion',
        group_id: groupId,
        participant_ids: participantIds
      };
      
      console.log('Creating chat with data:', chatData);

      const response = await fetch(`${API_BASE_URL}/api/enhanced-chat/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(chatData)
      });

      console.log('Create chat response status:', response.status);
      if (response.ok) {
        const createdChat = await response.json();
        console.log('Default group chat created successfully:', createdChat);
        // Reload chats after creating default chat
        await loadChats();
      } else {
        const errorText = await response.text();
        console.error('Failed to create default group chat:', response.status, errorText);
        toast.error('Failed to initialize group chat');
      }
    } catch (error) {
      console.error('Error creating default group chat:', error);
      toast.error('Failed to initialize group chat');
    }
  };

  // Load messages for active chat
  const loadMessages = async (chatId, before = null) => {
    if (!chatId) return;

    try {
      setLoadingMessages(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const params = new URLSearchParams();
      if (before) params.append('before', before);
      params.append('limit', '50');

      const response = await fetch(
        `${API_BASE_URL}/api/enhanced-chat/chats/${chatId}/messages?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      );

      if (response.ok) {
        const newMessages = await response.json();
        
        if (before) {
          // Prepend older messages
          setMessages(prev => [...newMessages, ...prev]);
        } else {
          // Replace with fresh messages
          setMessages(newMessages);
        }
        
        setHasMoreMessages(newMessages.length === 50);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  // Handle active chat change
  useEffect(() => {
    if (activeChat) {
      loadMessages(activeChat.id);
      socket.emit('join_chat', activeChat.id);
      markChatAsRead(activeChat.id);
    }
  }, [activeChat]);

  // Socket event handlers
  const handleNewMessage = useCallback((message) => {
    if (message.chat_id === activeChat?.id) {
      setMessages(prev => [...prev, message]);
      
      // Mark as read if chat is active
      if (document.hasFocus()) {
        markMessageAsRead(message.id, message.chat_id);
      }
    }
    
    // Update chat list with new message
    setChats(prev => prev.map(chat => 
      chat.id === message.chat_id 
        ? { ...chat, last_message_at: message.created_at }
        : chat
    ));
  }, [activeChat]);

  const handleUserTyping = useCallback(({ userId, chatId, isTyping }) => {
    if (chatId === activeChat?.id) {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        if (isTyping) {
          newSet.add(userId);
        } else {
          newSet.delete(userId);
        }
        return newSet;
      });
    }
  }, [activeChat]);

  const handleUserStatusChanged = useCallback(({ userId, status }) => {
    setOnlineUsers(prev => {
      const newSet = new Set(prev);
      if (status === 'online') {
        newSet.add(userId);
      } else {
        newSet.delete(userId);
      }
      return newSet;
    });
  }, []);

  const handleReactionAdded = useCallback(({ messageId, reaction }) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        const existingReactions = msg.message_reactions || [];
        return {
          ...msg,
          message_reactions: [...existingReactions, reaction]
        };
      }
      return msg;
    }));
  }, []);

  const handleReactionRemoved = useCallback(({ messageId, userId, emoji }) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        const filteredReactions = (msg.message_reactions || []).filter(
          r => !(r.user_id === userId && r.emoji === emoji)
        );
        return {
          ...msg,
          message_reactions: filteredReactions
        };
      }
      return msg;
    }));
  }, []);

  const handleMessageRead = useCallback(({ messageId, userId, readAt }) => {
    // Update read receipts in UI if needed
    console.log(`Message ${messageId} read by ${userId} at ${readAt}`);
  }, []);

  const handleCallInvitation = useCallback(({ callId, callData, message }) => {
    setActiveCall(callData);
    setMessages(prev => [...prev, message]);
    
    // Show call notification
    toast.info(`${callData.type === 'video' ? 'Video' : 'Audio'} call from ${callData.initiator}`, {
      autoClose: 10000,
      onClick: () => acceptCall(callId)
    });
  }, []);

  const handleCallResponse = useCallback(({ callId, userId, response, callData }) => {
    if (response === 'accept') {
      setActiveCall(callData);
    }
  }, []);

  const handleCallEnded = useCallback(({ callId, callData }) => {
    setActiveCall(null);
    toast.info('Call ended');
  }, []);

  // Message sending
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    
    // Stop typing indicator
    if (isTyping) {
      setIsTyping(false);
      socket.emit('typing_stop', { chatId: activeChat.id });
    }

    try {
      if (editingMessage) {
        // Edit existing message
        await editMessage(editingMessage.id, messageContent);
        setEditingMessage(null);
      } else {
        // Send new message via socket for real-time delivery
        socket.emit('send_message', {
          chatId: activeChat.id,
          content: messageContent,
          messageType: 'text',
          replyToId: replyingTo?.id
        });
        
        setReplyingTo(null);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  // Typing indicators
  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    if (!isTyping && activeChat) {
      setIsTyping(true);
      socket.emit('typing_start', { chatId: activeChat.id });
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping && activeChat) {
        setIsTyping(false);
        socket.emit('typing_stop', { chatId: activeChat.id });
      }
    }, 2000);
  };

  // File upload
  const handleFileUpload = async (files) => {
    if (!files.length || !activeChat) return;

    for (const file of files) {
      try {
        // First create a message for the file
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const response = await fetch(`${API_BASE_URL}/api/enhanced-chat/chats/${activeChat.id}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            content: `📎 ${file.name}`,
            message_type: 'file'
          })
        });

        if (response.ok) {
          const message = await response.json();
          
          // Upload file attachment
          const formData = new FormData();
          formData.append('file', file);
          
          const uploadResponse = await fetch(
            `${API_BASE_URL}/api/enhanced-chat/chats/${activeChat.id}/messages/${message.id}/attachments`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`
              },
              body: formData
            }
          );

          if (uploadResponse.ok) {
            toast.success('File uploaded successfully');
            // Refresh messages to show the file
            loadMessages(activeChat.id);
          }
        }
      } catch (error) {
        console.error('Error uploading file:', error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }
  };

  // Message reactions
  const addReaction = (messageId, emoji) => {
    if (!activeChat) return;
    
    socket.emit('add_reaction', {
      messageId,
      emoji,
      chatId: activeChat.id
    });
    
    setShowEmojiPicker(null);
  };

  const removeReaction = (messageId, emoji) => {
    if (!activeChat) return;
    
    socket.emit('remove_reaction', {
      messageId,
      emoji,
      chatId: activeChat.id
    });
  };

  // Message actions
  const editMessage = async (messageId, newContent) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${API_BASE_URL}/api/enhanced-chat/chats/${activeChat.id}/messages/${messageId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ content: newContent })
        }
      );

      if (response.ok) {
        const updatedMessage = await response.json();
        setMessages(prev => prev.map(msg => 
          msg.id === messageId ? updatedMessage : msg
        ));
        toast.success('Message updated');
      }
    } catch (error) {
      console.error('Error editing message:', error);
      toast.error('Failed to edit message');
    }
  };

  const deleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${API_BASE_URL}/api/enhanced-chat/chats/${activeChat.id}/messages/${messageId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      );

      if (response.ok) {
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
        toast.success('Message deleted');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  // Mark messages as read
  const markMessageAsRead = (messageId, chatId) => {
    socket.emit('mark_message_read', { messageId, chatId });
  };

  const markChatAsRead = async (chatId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await fetch(`${API_BASE_URL}/api/enhanced-chat/chats/${chatId}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
    } catch (error) {
      console.error('Error marking chat as read:', error);
    }
  };

  // Search messages
  const searchMessages = async (query) => {
    if (!query.trim() || !activeChat) {
      setSearchResults([]);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const params = new URLSearchParams({ q: query });
      const response = await fetch(
        `${API_BASE_URL}/api/enhanced-chat/chats/${activeChat.id}/search?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      );

      if (response.ok) {
        const results = await response.json();
        setSearchResults(results);
      }
    } catch (error) {
      console.error('Error searching messages:', error);
      toast.error('Failed to search messages');
    }
  };

  // Call functions
  const initiateCall = (type) => {
    if (!activeChat) return;
    
    socket.emit('initiate_call', {
      chatId: activeChat.id,
      callType: type,
      participants: []
    });
  };

  const acceptCall = (callId) => {
    socket.emit('call_response', {
      callId,
      response: 'accept'
    });
  };

  const declineCall = (callId) => {
    socket.emit('call_response', {
      callId,
      response: 'decline'
    });
  };

  const endCall = () => {
    if (activeCall) {
      socket.emit('end_call', {
        callId: activeCall.id
      });
    }
  };

  // Utility functions
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMoreMessages = () => {
    if (messages.length > 0 && hasMoreMessages && !loadingMessages) {
      const oldestMessage = messages[0];
      loadMessages(activeChat.id, oldestMessage.created_at);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const getUserName = (user) => {
    return user?.raw_user_meta_data?.username || 
           user?.raw_user_meta_data?.full_name || 
           user?.email?.split('@')[0] || 
           'Unknown User';
  };

  const getUserAvatar = (user) => {
    return user?.raw_user_meta_data?.avatar_url || 
           `https://ui-avatars.com/api/?name=${encodeURIComponent(getUserName(user))}&background=random`;
  };

  if (loading) {
    return (
      <div className="enhanced-chat-loading">
        <div className="loading-spinner"></div>
        <p>Initializing group chat...</p>
        <small>Setting up your chat room</small>
      </div>
    );
  }

  // Show message if no chats and not loading
  if (!loading && chats.length === 0) {
    return (
      <div className="enhanced-chat-loading">
        <div className="loading-spinner"></div>
        <p>Setting up group chat...</p>
        <small>Creating your chat room</small>
      </div>
    );
  }

  return (
    <div className="enhanced-group-chat">
      {/* Chat Header */}
      <div className="chat-header">
        <div className="chat-info">
          <h2>{activeChat?.name || 'Group Chat'}</h2>
          <div className="chat-status">
            {typingUsers.size > 0 && (
              <span className="typing-indicator">
                {Array.from(typingUsers).length === 1 
                  ? 'Someone is typing...' 
                  : `${typingUsers.size} people are typing...`}
              </span>
            )}
          </div>
        </div>
        
        <div className="chat-actions">
          <button 
            className="search-btn"
            onClick={() => setShowSearch(!showSearch)}
            title="Search messages"
          >
            🔍
          </button>
          <button 
            className="call-btn"
            onClick={() => initiateCall('audio')}
            title="Audio call"
          >
            📞
          </button>
          <button 
            className="video-call-btn"
            onClick={() => initiateCall('video')}
            title="Video call"
          >
            📹
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              searchMessages(e.target.value);
            }}
          />
          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map(result => (
                <div key={result.id} className="search-result">
                  <div className="result-content">{result.content}</div>
                  <div className="result-meta">
                    {getUserName(result.sender)} • {formatTime(result.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Active Call Overlay */}
      {activeCall && (
        <div className="active-call-overlay">
          <div className="call-info">
            <h3>{activeCall.type === 'video' ? '📹' : '📞'} {activeCall.type} Call</h3>
            <p>Call in progress...</p>
          </div>
          <button className="end-call-btn" onClick={endCall}>
            End Call
          </button>
        </div>
      )}

      {/* Messages Container */}
      <div 
        className="messages-container" 
        ref={messagesContainerRef}
        onScroll={(e) => {
          if (e.target.scrollTop === 0) {
            loadMoreMessages();
          }
        }}
      >
        {loadingMessages && (
          <div className="loading-more">Loading more messages...</div>
        )}
        
        {messages.map((message, index) => {
          const prevMessage = messages[index - 1];
          const showDateSeparator = !prevMessage || 
            formatDate(message.created_at) !== formatDate(prevMessage.created_at);
          const isOwnMessage = message.sender_id === currentUser.id;
          const showAvatar = !prevMessage || 
            prevMessage.sender_id !== message.sender_id ||
            new Date(message.created_at) - new Date(prevMessage.created_at) > 300000; // 5 minutes

          return (
            <React.Fragment key={message.id}>
              {showDateSeparator && (
                <div className="date-separator">
                  {formatDate(message.created_at)}
                </div>
              )}
              
              <div className={`message ${isOwnMessage ? 'own-message' : 'other-message'}`}>
                {!isOwnMessage && showAvatar && (
                  <img 
                    src={getUserAvatar(message.sender)} 
                    alt={getUserName(message.sender)}
                    className="message-avatar"
                  />
                )}
                
                <div className="message-content">
                  {!isOwnMessage && showAvatar && (
                    <div className="message-sender">
                      {getUserName(message.sender)}
                    </div>
                  )}
                  
                  {message.reply_to_id && (
                    <div className="reply-reference">
                      Replying to: {message.reply_to?.content}
                    </div>
                  )}
                  
                  <div className="message-bubble">
                    {message.is_deleted ? (
                      <em className="deleted-message">This message was deleted</em>
                    ) : (
                      <>
                        {message.message_type === 'file' && message.message_attachments?.length > 0 && (
                          <div className="message-attachments">
                            {message.message_attachments.map(attachment => (
                              <div key={attachment.id} className="attachment">
                                {attachment.mime_type.startsWith('image/') ? (
                                  <img 
                                    src={attachment.file_url} 
                                    alt={attachment.original_filename}
                                    className="attachment-image"
                                  />
                                ) : (
                                  <a 
                                    href={attachment.file_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="attachment-link"
                                  >
                                    📎 {attachment.original_filename}
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {message.content && (
                          <div className="message-text">{message.content}</div>
                        )}
                      </>
                    )}
                    
                    <div className="message-meta">
                      <span className="message-time">
                        {formatTime(message.created_at)}
                        {message.is_edited && <span className="edited-indicator"> (edited)</span>}
                      </span>
                    </div>
                  </div>
                  
                  {/* Message Reactions */}
                  {message.message_reactions?.length > 0 && (
                    <div className="message-reactions">
                      {Object.entries(
                        message.message_reactions.reduce((acc, reaction) => {
                          if (!acc[reaction.emoji]) acc[reaction.emoji] = [];
                          acc[reaction.emoji].push(reaction);
                          return acc;
                        }, {})
                      ).map(([emoji, reactions]) => (
                        <button
                          key={emoji}
                          className={`reaction ${reactions.some(r => r.user_id === currentUser.id) ? 'own-reaction' : ''}`}
                          onClick={() => {
                            const hasReacted = reactions.some(r => r.user_id === currentUser.id);
                            if (hasReacted) {
                              removeReaction(message.id, emoji);
                            } else {
                              addReaction(message.id, emoji);
                            }
                          }}
                        >
                          {emoji} {reactions.length}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* Message Actions */}
                  <div className="message-actions">
                    <button
                      className="action-btn"
                      onClick={() => setShowEmojiPicker(message.id)}
                      title="Add reaction"
                    >
                      😊
                    </button>
                    <button
                      className="action-btn"
                      onClick={() => setReplyingTo(message)}
                      title="Reply"
                    >
                      ↩️
                    </button>
                    {isOwnMessage && (
                      <>
                        <button
                          className="action-btn"
                          onClick={() => {
                            setEditingMessage(message);
                            setNewMessage(message.content);
                            messageInputRef.current?.focus();
                          }}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          className="action-btn"
                          onClick={() => deleteMessage(message.id)}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </>
                    )}
                  </div>
                  
                  {/* Emoji Picker */}
                  {showEmojiPicker === message.id && (
                    <div className="emoji-picker">
                      {commonEmojis.map(emoji => (
                        <button
                          key={emoji}
                          className="emoji-btn"
                          onClick={() => addReaction(message.id, emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview */}
      {replyingTo && (
        <div className="reply-preview">
          <div className="reply-content">
            Replying to: {replyingTo.content}
          </div>
          <button 
            className="cancel-reply"
            onClick={() => setReplyingTo(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Edit Preview */}
      {editingMessage && (
        <div className="edit-preview">
          <div className="edit-content">
            Editing message
          </div>
          <button 
            className="cancel-edit"
            onClick={() => {
              setEditingMessage(null);
              setNewMessage('');
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Message Input */}
      <form className="message-input-form" onSubmit={sendMessage}>
        <input
          type="file"
          ref={fileInputRef}
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleFileUpload(Array.from(e.target.files))}
        />
        
        <button
          type="button"
          className="attach-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Attach file"
        >
          📎
        </button>
        
        <input
          ref={messageInputRef}
          type="text"
          value={newMessage}
          onChange={handleTyping}
          placeholder={editingMessage ? "Edit message..." : "Type a message..."}
          className="message-input"
        />
        
        <button 
          type="submit" 
          className="send-btn"
          disabled={!newMessage.trim()}
        >
          {editingMessage ? '✏️' : '➤'}
        </button>
      </form>
    </div>
  );
};

export default EnhancedGroupChat;
