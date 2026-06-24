import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { db, collection, query, where, orderBy, onSnapshot, addDoc, Timestamp, User, doc, getDoc, updateDoc, limit, increment, setDoc } from '../firebase';
import { Send, User as UserIcon, ChevronLeft, MoreVertical, Search, MessageSquare, Clock, Star, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface Props {
  user: User;
}

export default function Chat({ user }: Props) {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const [chats, setChats] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeChat, setActiveChat] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recipientProfile, setRecipientProfile] = useState<any>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState(5);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (!user?.uid) return;
    // Fetch user's chats
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid),
      orderBy('lastMessageAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setChats(chatData);
      setLoading(false);
      
      if (chatId) {
        const current = chatData.find(c => c.id === chatId);
        if (current) setActiveChat(current);
      }
    });

    return () => unsubscribe();
  }, [user?.uid, chatId]);

  useEffect(() => {
    if (!chatId) return;

    // Fetch messages for active chat (limit to last 50 for performance)
    const q = query(
      collection(db, `chats/${chatId}/messages`),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messageData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).reverse();
      setMessages(messageData);
    });

    return () => unsubscribe();
  }, [chatId]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mark messages as read when chat is opened
  useEffect(() => {
    if (chatId && user?.uid && activeChat) {
      const markAsRead = async () => {
        // Only update if there are actually unread messages for this user
        if (activeChat.unreadCount?.[user.uid] > 0) {
          await updateDoc(doc(db, 'chats', chatId), {
            [`unreadCount.${user.uid}`]: 0
          });
        }
      };
      markAsRead();
    }
  }, [chatId, user?.uid, activeChat]);

  // Fetch the recipient's profile directly from users collection for the active chat
  useEffect(() => {
    const fetchRecipient = async () => {
      const otherId = getOtherParticipant(activeChat);
      if (otherId) {
        const docSnap = await getDoc(doc(db, 'users', otherId));
        if (docSnap.exists()) {
          setRecipientProfile(docSnap.data());
        }
      }
    };

    if (activeChat) fetchRecipient();
  }, [activeChat, user.uid]);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !chatId) return;

    try {
      const messageData = {
        chatId,
        senderId: user.uid,
        text: newMessage,
        createdAt: Timestamp.now()
      };

      await addDoc(collection(db, `chats/${chatId}/messages`), messageData);

      // Find recipient ID to increment their unread count
      if (!activeChat) return;
      
      const recipientId = activeChat.participants.find((p: string) => p !== user.uid);
      
      // Update chat last message and recipient's unread count
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: newMessage,
        lastMessageAt: Timestamp.now(),
        [`unreadCount.${recipientId}`]: increment(1)
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleRatingSubmit = async () => {
    const otherId = getOtherParticipant(activeChat);
    if (!otherId) return;

    setIsSubmittingRating(true);
    try {
      const recipientRef = doc(db, 'users', otherId);
      const currentRating = recipientProfile?.rating ?? 5;
      const currentCount = recipientProfile?.reviewCount ?? 0;

      // Weighted average calculation
      const newCount = currentCount + 1;
      const newRating = ((currentRating * currentCount) + selectedRating) / newCount;

      await setDoc(recipientRef, {
        rating: newRating,
        reviewCount: newCount,
        updatedAt: Timestamp.now()
      }, { merge: true });

      toast.success('Thank you for your review!');
      setShowRatingModal(false);
    } catch (error: any) {
      console.error('❌ Rating Error:', error);
      toast.error('Failed to submit rating', {
        description: error.code === 'permission-denied' 
          ? 'Permissions denied. Update your Firestore rules to allow user updates.' 
          : 'An unexpected error occurred.'
      });
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const getOtherParticipant = (chat: any) => {
    return chat?.participants?.find((p: string) => p !== user.uid);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-12rem)] bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 flex">
      {/* Sidebar: Chat List */}
      <div className={`w-full md:w-80 lg:w-96 border-r flex flex-col ${chatId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-6 border-b">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-4">{t('chat.title')}</h2>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder={t('chat.searchPlaceholder')}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm font-medium"
            />
          </div>
        </div>

        <div className="flex-grow overflow-y-auto scrollbar-hide">
          {chats.length > 0 ? (
            chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => navigate(`/chat/${chat.id}`)}
                className={`w-full p-6 flex items-start space-x-4 border-b border-gray-50 transition-all text-left group ${
                  chatId === chat.id ? 'bg-orange-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-gray-100 border overflow-hidden flex-shrink-0">
                  {chat.participantDetails?.[getOtherParticipant(chat)]?.photoURL ? (
                    <img 
                      src={chat.participantDetails[getOtherParticipant(chat)].photoURL} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <UserIcon className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <div className="flex-grow min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-gray-900 truncate group-hover:text-orange-600 transition-colors">
                      {chat.listingTitle === 'Admin Support' ? t('nav.adminSupport') : (chat.listingTitle || 'Chat')}
                    </h4>
                    {chat.unreadCount?.[user.uid] > 0 && (
                      <span className="bg-orange-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full ml-2 animate-pulse">
                        {chat.unreadCount[user.uid]}
                      </span>
                    )}
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      {chat.lastMessageAt?.toDate ? formatDistanceToNow(chat.lastMessageAt.toDate(), { addSuffix: false }) : ''}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 truncate font-medium">
                    {chat.lastMessage || t('chat.startConversation')}
                  </p>
                </div>
              </button>
            ))
          ) : (
            <div className="p-12 text-center text-gray-400">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="font-bold text-sm">{t('chat.noMessages')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Main: Chat Window */}
      <div className={`flex-grow flex flex-col ${!chatId ? 'hidden md:flex' : 'flex'}`}>
        {chatId ? (
          <>
            {/* Chat Header */}
            <div className="p-6 border-b flex items-center justify-between bg-white/80 backdrop-blur-sm sticky top-0 z-10">
              <div className="flex items-center space-x-4">
                <button onClick={() => navigate('/chat')} className="md:hidden p-2 text-gray-400 hover:text-gray-900">
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <Link to={`/profile/${getOtherParticipant(activeChat)}`} className="flex items-center space-x-4 group">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center overflow-hidden border border-orange-200 shadow-sm group-hover:border-orange-400 transition-colors">
                    {(recipientProfile?.photoURL || activeChat?.participantDetails?.[getOtherParticipant(activeChat)]?.photoURL) ? (
                      <img 
                        src={recipientProfile?.photoURL || activeChat.participantDetails[getOtherParticipant(activeChat)].photoURL} 
                        alt="" 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <UserIcon className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 tracking-tight leading-tight group-hover:text-orange-600 transition-colors">
                      {recipientProfile?.displayName || activeChat?.participantDetails?.[getOtherParticipant(activeChat)]?.displayName || 'User'}
                    </h3>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate max-w-[150px]">
                      {activeChat?.listingTitle === 'Admin Support' ? t('nav.adminSupport') : activeChat?.listingTitle}
                    </p>
                  </div>
                </Link>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => setShowRatingModal(true)}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg font-bold text-xs hover:bg-orange-100 transition-colors"
                >
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>{t('chat.rateUser')}</span>
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div 
              ref={messagesContainerRef}
              className="flex-grow overflow-y-auto p-6 space-y-6 scrollbar-hide bg-gray-50/50"
            >
              {messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={`flex ${msg.senderId === user.uid ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] group ${msg.senderId === user.uid ? 'items-end' : 'items-start'}`}>
                    <div className={`px-5 py-3.5 rounded-2xl font-medium text-sm shadow-sm ${
                      msg.senderId === user.uid 
                      ? 'bg-orange-600 text-white rounded-tr-none' 
                      : 'bg-white text-gray-900 rounded-tl-none border border-gray-100'
                    }`}>
                      {msg.text}
                    </div>
                    <span className={`text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1.5 block px-1 ${
                      msg.senderId === user.uid ? 'text-right' : 'text-left'
                    }`}>
                      {msg.createdAt?.toDate ? formatDistanceToNow(msg.createdAt.toDate(), { addSuffix: true }) : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-6 border-t bg-white">
              <div className="relative flex items-center space-x-4">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={t('chat.typeMessage')}
                  className="flex-grow px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-medium text-sm"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="bg-orange-600 hover:bg-orange-700 text-white p-4 rounded-2xl transition-all shadow-lg hover:shadow-orange-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center text-center p-12 bg-gray-50/30">
            <div className="w-24 h-24 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mb-6">
              <MessageSquare className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-2">{t('chat.conversations')}</h3>
            <p className="text-gray-500 max-w-xs font-medium">{t('chat.selectChat')}</p>
          </div>
        )}
      </div>

      {/* Modern Rating Modal */}
      <AnimatePresence>
        {showRatingModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 text-center">
                <div className="flex justify-end -mt-4 -mr-4 mb-2">
                  <button 
                    onClick={() => setShowRatingModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-900 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="w-20 h-20 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-6">
                  <Star className="w-10 h-10 fill-current" />
                </div>
                
                <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Rate {recipientProfile?.displayName || 'User'}</h3>
                <p className="text-gray-500 font-medium text-sm mb-8">
                  How was your experience with this {activeChat?.listingTitle ? 'seller' : 'user'}?
                </p>

                <div className="flex items-center justify-center space-x-2 mb-10">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setSelectedRating(star)}
                      onMouseEnter={() => setSelectedRating(star)}
                      className="transition-transform active:scale-90"
                    >
                      <Star 
                        className={`w-10 h-10 transition-colors ${
                          star <= selectedRating 
                          ? 'fill-orange-400 text-orange-400' 
                          : 'text-gray-200'
                        }`} 
                      />
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setShowRatingModal(false)}
                    className="py-4 text-gray-500 font-bold hover:text-gray-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRatingSubmit}
                    disabled={isSubmittingRating}
                    className="bg-orange-600 hover:bg-orange-700 text-white py-4 rounded-2xl font-black transition-all shadow-lg hover:shadow-orange-200 disabled:opacity-50"
                  >
                    {isSubmittingRating ? 'Saving...' : 'Submit'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
