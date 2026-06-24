import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User, signOut, auth, db, doc, getDoc, collection, query, where, orderBy, limit, onSnapshot, updateDoc } from '../firebase';
import { LogOut, User as UserIcon, PlusCircle, MessageSquare, Shield, Search, Menu, X, Bell, Heart, Home, Stethoscope } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Logo from './Logo';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  user: User | null;
  unreadCount?: number;
  notificationsCount?: number;
}

export default function Navbar({ user, unreadCount = 0, notificationsCount = 0 }: Props) {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [photoURL, setPhotoURL] = useState<string | null>(user?.photoURL || null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const { t } = useTranslation();
  const location = useLocation();

  // Close notifications dropdown when navigating to a new page
  useEffect(() => {
    setShowNotifications(false);
  }, [location.pathname]);

  useEffect(() => {
    if (user) {
      setPhotoURL(user.photoURL);
      syncProfile();
    } else {
      setPhotoURL(null);
    }
  }, [user]);

  useEffect(() => {
    if (!user?.uid) {
      setNotifications([]);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20) // Increased limit to ensure more notifications are visible
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      if (error.code === 'failed-precondition') {
        console.warn("Notification Index missing. Click the link in the Firebase error log to create it.");
      } else {
        console.error("Error fetching notifications for navbar:", error);
      }
      setNotifications([]); // Clear list on error to avoid showing stale data
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const syncProfile = async () => {
    try {
      if (!user?.uid) return;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setPhotoURL(data.photoURL || user?.photoURL);
        setIsAdmin(data.role === 'admin');
      }
    } catch (error) {
      setIsAdmin(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 bg-[var(--cream-50)] border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <Logo className="text-2xl" />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="nav-link text-[var(--navy-900)] font-medium flex items-center">
              <Home className="w-4 h-4 mr-1.5" />
              {t('nav.home')}
            </Link>
            <Link to="/health" className="nav-link text-[var(--navy-900)] font-medium flex items-center">
              <Stethoscope className="w-4 h-4 mr-1.5" />
              {t('nav.health')}
            </Link>
            <Link to="/coupling" className="nav-link text-[var(--navy-900)] font-medium flex items-center">
              <Heart className="w-4 h-4 mr-1.5" />
              {t('nav.coupling')}
            </Link>
            {user && (
              <>
                <Link to="/chat" className="text-gray-600 hover:text-orange-600 font-medium transition-colors flex items-center relative">
                  <MessageSquare className="w-4 h-4 mr-1.5" />
                  {t('nav.messages')}
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-3 bg-orange-600 text-white text-[10px] font-black h-4 min-w-[16px] px-1 flex items-center justify-center rounded-full ring-2 ring-white animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </Link>
                <div className="relative">
                  {showNotifications && (
                    <div 
                      className="fixed inset-0 z-[55]" 
                      onClick={() => setShowNotifications(false)}
                    />
                  )}
                  <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="text-gray-600 hover:text-orange-600 transition-colors flex items-center relative p-1"
                  >
                    <Bell className="w-5 h-5" />
                    {notificationsCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[10px] font-black h-4 min-w-[16px] px-1 flex items-center justify-center rounded-full ring-2 ring-white animate-pulse">
                        {notificationsCount}
                      </span>
                    )}
                  </button>
                  
                  <AnimatePresence>
                    {showNotifications && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-[60]"
                      >
                        <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('nav.notifications')}</h3>
                        </div>
                        <div className="max-h-96 overflow-y-auto scrollbar-hide">
                          {notifications.length > 0 ? (
                            notifications.map((notif) => (
                              <div 
                                key={notif.id} 
                                className={`p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer text-left ${!notif.read ? 'bg-orange-50/30' : ''}`}
                                onClick={async () => {
                                  if (!notif.read) await updateDoc(doc(db, 'notifications', notif.id), { read: true });
                                  if (notif.listingId) navigate(`/listing/${notif.listingId}`);
                                  if (notif.postId) navigate(`/health/${notif.postId}`);
                                  if (notif.offerId) navigate(`/coupling/${notif.offerId}`);
                                  setShowNotifications(false);
                                }}
                              >
                                <p className="text-sm font-bold text-gray-900 leading-tight">{notif.title}</p>
                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{notif.message}</p>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">
                                  {notif.createdAt?.toDate ? formatDistanceToNow(notif.createdAt.toDate()) : 'Recently'} ago
                                </p>
                              </div>
                            ))
                          ) : (
                            <div className="p-8 text-center text-gray-400">
                              <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                              <p className="text-[10px] font-black uppercase tracking-widest">No notifications</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                {isAdmin && (
                  <Link to="/admin" className="text-purple-600 hover:text-purple-700 font-bold transition-colors flex items-center">
                    <Shield className="w-4 h-4 mr-1.5" />
                    {t('nav.admin')}
                  </Link>
                )}
                <Link to="/create" className="btn-primary flex items-center" style={{borderColor: 'var(--gold-500)'}}>
                  <PlusCircle className="w-4 h-4 mr-1.5" />
                  {t('nav.postAd')}
                </Link>
              </>
            )}
          </div>

          {/* User Actions */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <Link to="/profile" className="flex items-center space-x-2 group">
                  <div className="w-8 h-8 rounded-full bg-gray-100 border overflow-hidden">
                    {photoURL ? (
                      <img src={photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <UserIcon className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-[var(--navy-900)] group-hover:text-[var(--gold-500)] transition-colors" style={{fontFamily: 'Playfair Display, serif'}}>
                    {user.displayName?.split(' ')[0]}
                  </span>
                </Link>
                <button 
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Link to="/login" className="text-orange-600 font-bold hover:text-orange-700">
                {t('nav.login')}
              </Link>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden p-2 text-gray-600"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t overflow-hidden"
          >
            <div className="px-4 py-6 space-y-4">
              <Link to="/" onClick={() => setIsMenuOpen(false)} className="flex items-center text-lg font-medium text-gray-900">
                <Home className="w-5 h-5 mr-3 text-gray-400" />
                {t('nav.home')}
              </Link>
              <Link to="/health" onClick={() => setIsMenuOpen(false)} className="flex items-center text-lg font-medium text-gray-900">
                <Stethoscope className="w-5 h-5 mr-3 text-green-500" />
                {t('nav.health')}
              </Link>
              <Link to="/coupling" onClick={() => setIsMenuOpen(false)} className="flex items-center text-lg font-medium text-gray-900">
                <Heart className="w-5 h-5 mr-3 text-red-500" />
                {t('nav.coupling')}
              </Link>
              {user ? (
                <>
                  <Link to="/chat" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-between text-lg font-medium text-gray-900">
                    <span>{t('nav.messages')}</span>
                    {unreadCount > 0 && (
                      <span className="bg-orange-600 text-white text-xs font-black px-2 py-0.5 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                  <div className="space-y-2">
                    <button 
                      onClick={() => setShowNotifications(!showNotifications)} 
                      className="flex items-center justify-between w-full text-lg font-medium text-gray-900"
                    >
                      <div className="flex items-center">
                        <Bell className="w-5 h-5 mr-3 text-gray-400" />
                      </div>
                      {notificationsCount > 0 && (
                        <span className="bg-orange-600 text-white text-xs font-black px-2 py-0.5 rounded-full">
                          {notificationsCount}
                        </span>
                      )}
                    </button>
                    <AnimatePresence>
                      {showNotifications && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="pl-4 border-l-2 border-orange-100 space-y-3 py-2 overflow-hidden"
                        >
                          {notifications.map(notif => (
                            <div 
                              key={notif.id}
                              onClick={async () => {
                                if (!notif.read) await updateDoc(doc(db, 'notifications', notif.id), { read: true });
                                if (notif.listingId) navigate(`/listing/${notif.listingId}`);
                                if (notif.postId) navigate(`/health/${notif.postId}`);
                                if (notif.offerId) navigate(`/coupling/${notif.offerId}`);
                                setShowNotifications(false);
                                setIsMenuOpen(false);
                              }}
                              className={`p-3 rounded-xl text-left transition-colors ${!notif.read ? 'bg-orange-50' : 'bg-gray-50 opacity-60'}`}
                            >
                              <p className="text-sm font-bold text-gray-900">{notif.title}</p>
                              <p className="text-xs text-gray-500 line-clamp-1">{notif.message}</p>
                            </div>
                          ))}
                          {notifications.length === 0 && (
                            <p className="text-xs text-gray-400 italic">No notifications</p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  {isAdmin && (
                    <Link to="/admin" onClick={() => setIsMenuOpen(false)} className="block text-lg font-bold text-purple-600">🔐 {t('nav.admin')}</Link>
                  )}
                  <Link to="/profile" onClick={() => setIsMenuOpen(false)} className="block text-lg font-medium text-gray-900">{t('nav.profile')}</Link>
                  <Link to="/create" onClick={() => setIsMenuOpen(false)} className="block text-lg font-bold text-orange-600">{t('nav.postAd')}</Link>
                  <button 
                    onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                    className="block w-full text-left text-lg font-medium text-red-600"
                  >
                    {t('profile.logout')}
                  </button>
                </>
              ) : (
                <Link to="/login" onClick={() => setIsMenuOpen(false)} className="block text-lg font-bold text-orange-600">{t('nav.login')}</Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
