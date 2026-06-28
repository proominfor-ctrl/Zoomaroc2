import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { db, doc, getDoc, updateDoc, setDoc, auth, User, collection, query, where, limit, onSnapshot, Timestamp, updateProfile, verifyBeforeUpdateEmail } from '../firebase';
import { User as UserIcon, Mail, Phone, MapPin, Shield, Settings, LayoutGrid, Heart, LogOut, Camera, Save, CheckCircle2, MessageCircle, FileText, BadgeCheck, Star, Stethoscope, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import ListingCard from '../components/ListingCard'; 
import { uploadImage } from '../storage'; 

interface Props {
  user: User | null;
}

export default function Profile({ user }: Props) {
  const { userId } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [healthPosts, setHealthPosts] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('listings');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const targetUserId = userId || user?.uid;
  const isOwnProfile = !userId || userId === user?.uid;

  // Form states
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [privacySettings, setPrivacySettings] = useState({
    showEmail: false,
    showPhone: true,
    showLocation: true
  });
  const [newEmail, setNewEmail] = useState('');
  const [isChangingEmail, setIsChangingEmail] = useState(false);

  useEffect(() => {
    if (!targetUserId) return;

    const docRef = doc(db, 'users', targetUserId);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setProfile(data);
        setDisplayName(data.displayName || '');
        setPhoneNumber(data.phoneNumber || '');
        setLocation(data.location || '');
        setBio(data.bio || '');
        setWhatsapp(data.whatsapp || '');
        setPrivacySettings(data.privacySettings || {
          showEmail: false,
          showPhone: true,
          showLocation: true
        });
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching profile:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [targetUserId]);

  useEffect(() => {
    if (!targetUserId) return;

    const q = query(
      collection(db, 'listings'),
      where('authorId', '==', targetUserId),
      limit(100)
    );
    
    // Set up real-time listener
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Client-side sorting: newest first
        data.sort((a: any, b: any) => {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return bTime - aTime;
        });

        // Filter out non-active listings if viewing someone else's profile
        if (!isOwnProfile) {
          data = data.filter((l: any) => l.status === 'active');
        }

        setListings(data);
      },
      (error) => {
        console.error('Error fetching user listings:', error);
      }
    );

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [targetUserId]);

  useEffect(() => {
    if (!targetUserId) return;

    const q = query(
      collection(db, 'health_posts'),
      where('authorId', '==', targetUserId),
      limit(50)
    );
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Client-side sorting: newest first
        data.sort((a: any, b: any) => {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return bTime - aTime;
        });

        // Filter out non-active posts if viewing someone else's profile
        if (!isOwnProfile) {
          data = data.filter((p: any) => p.status === 'active');
        }

        setHealthPosts(data);
      },
      (error) => {
        console.error('Error fetching user health posts:', error);
      }
    );

    return () => unsubscribe();
  }, [targetUserId]);

  useEffect(() => {
    if (isOwnProfile && activeTab === 'favorites' && profile?.favorites?.length > 0) {
      fetchFavorites();
    }
  }, [activeTab, profile?.favorites]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwnProfile || !user) return;
    setSaving(true);
    try {
      const docRef = doc(db, 'users', user.uid);
      // Update Firebase Auth profile
      if (auth.currentUser && auth.currentUser.displayName !== displayName) {
        await updateProfile(auth.currentUser, { displayName });
      }
      // Update Firestore document
      await updateDoc(docRef, {
        displayName,
        phoneNumber,
        location,
        bio,
        whatsapp,
        privacySettings,
        updatedAt: Timestamp.now()
      });
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newEmail || newEmail === user.email) {
      toast.info("Please enter a new, different email address.");
      return;
    }

    setIsChangingEmail(true);
    try {
      await verifyBeforeUpdateEmail(user, newEmail);
      toast.success("Verification email sent!", {
        description: `Please check your new email inbox at ${newEmail} to complete the change.`,
        duration: 8000,
      });
      setNewEmail('');
    } catch (error: any) {
      let errorMessage = 'Failed to start email change process.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already in use by another account.';
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'This is a sensitive action. Please log out and log back in before changing your email.';
      }
      toast.error(errorMessage);
      console.error("Email change error:", error);
    } finally {
      setIsChangingEmail(false);
    }
  };

  const compressProfileImage = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const SIZE = 400; // Profile pics can be smaller
          canvas.width = SIZE;
          canvas.height = SIZE;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, SIZE, SIZE);
          canvas.toBlob((blob) => {
            resolve(blob || file);
          }, 'image/jpeg', 0.8);
        };
      };
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isOwnProfile || !user) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setUploadingPhoto(true);
    try {
      const compressedBlob = await compressProfileImage(file);
      const photoURL = await uploadImage(compressedBlob, `${user.uid}-${Date.now()}.jpg`, 'profiles');

      // 1. Update user's photoURL in Firebase Auth to keep the session in sync
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL });
        await auth.currentUser.reload();
      }
      
      // 2. Update Firestore (Source of truth for the app)
      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, {
        photoURL,
        updatedAt: Timestamp.now()
      });

      toast.success('Profile photo updated successfully!');
    } catch (error: any) {
      console.error('❌ Photo upload error:', error);
      const errorMessage = error.message || '';
      if (errorMessage.includes('Invalid authentication token') || !navigator.onLine) {
        toast.error('Network Error', {
          description: 'Could not connect to the server or Supabase Storage. Check your internet connection.'
        });
      } else {
        toast.error('Failed to upload photo', {
          description: errorMessage
        });
      }
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  // Priority display: Use Firestore profile data if available, fallback to Auth user object
  const rawPhotoURL = profile?.photoURL || (isOwnProfile ? user?.photoURL : null);
  // Ensure we don't treat empty strings or invalid values as truthy
  const currentPhotoURL = (typeof rawPhotoURL === 'string' && rawPhotoURL.trim().length > 0) ? rawPhotoURL : null;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left: Profile Sidebar */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center">
            <div className="relative inline-block mb-6">
              <div className="w-32 h-32 rounded-3xl bg-gray-100 border-4 border-white shadow-lg overflow-hidden mx-auto">
                {currentPhotoURL ? (
                  <img 
                    src={currentPhotoURL} 
                    alt={displayName || ''} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <UserIcon className="w-12 h-12" />
                  </div>
                )}
              </div>
              {isOwnProfile && (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="absolute -bottom-2 -right-2 p-2 bg-orange-600 text-white rounded-xl shadow-lg hover:bg-orange-700 transition-all disabled:opacity-50"
                >
                  <Camera className="w-5 h-5" />
                </button>
              )}
              <input 
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>
            
            <div className="flex items-center justify-center space-x-2">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">{profile?.displayName || 'Anonymous'}</h2>
              {profile?.role === 'admin' && <span title="Admin"><Shield className="w-5 h-5 text-purple-600" /></span>}
              {profile?.isTrusted && <span title="Trusted Seller"><BadgeCheck className="w-6 h-6 text-[#006d2c]" /></span>}
            </div>

            <div className="flex items-center justify-center space-x-1 mt-2">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.round(profile?.rating ?? 5) ? 'fill-orange-400 text-orange-400' : 'text-gray-200'
                  }`}
                />
              ))}
              <span className="text-sm font-bold text-gray-500 ml-1">({profile?.reviewCount || 0})</span>
            </div>

            {(isOwnProfile || profile?.privacySettings?.showEmail) && (
              <p className="text-sm text-gray-500 font-medium mt-1">{profile?.email}</p>
            )}

            {profile?.bio && (
              <p className="mt-4 text-sm text-gray-600 line-clamp-3 italic px-4">
                "{profile.bio}"
              </p>
            )}
            
            <div className="mt-8 pt-8 border-t border-gray-50 grid grid-cols-2 gap-y-6">
              <div className="text-center">
                <span className="block text-xl font-black text-gray-900 tracking-tight">{listings.length}</span>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('profile.listingsCount')}</span>
              </div>
              <div className="text-center">
                <span className="block text-xl font-black text-gray-900 tracking-tight">{profile?.reviewCount || 0}</span>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('profile.reviewsCount')}</span>
              </div>
              <div className="text-center">
                <span className="block text-xl font-black text-gray-900 tracking-tight">{(profile?.followers || []).length}</span>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('profile.followersCount')}</span>
              </div>
              <div className="text-center">
                <span className="block text-xl font-black text-gray-900 tracking-tight">{(profile?.following || []).length}</span>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('profile.followingCount')}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <button 
              onClick={() => setActiveTab('listings')}
              className={`w-full p-6 flex items-center space-x-4 font-bold transition-all text-left ${
                activeTab === 'listings' ? 'bg-orange-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <LayoutGrid className="w-5 h-5" />
              <span>{t('profile.myListings')}</span>
            </button>
            <button 
              onClick={() => setActiveTab('health')}
              className={`w-full p-6 flex items-center space-x-4 font-bold transition-all text-left ${
                activeTab === 'health' ? 'bg-orange-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Stethoscope className="w-5 h-5" />
              <span>{t('nav.health')}</span>
            </button>
            {isOwnProfile && (
              <>
                <button 
                  onClick={() => setActiveTab('favorites')}
                  className={`w-full p-6 flex items-center space-x-4 font-bold transition-all text-left ${
                    activeTab === 'favorites' ? 'bg-orange-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Heart className="w-5 h-5" />
                  <span>{t('profile.savedItems')}</span>
                </button>
                <button 
                  onClick={() => setActiveTab('settings')}
                  className={`w-full p-6 flex items-center space-x-4 font-bold transition-all text-left ${
                    activeTab === 'settings' ? 'bg-orange-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Settings className="w-5 h-5" />
                  <span>{t('profile.accountSettings')}</span>
                </button>
                <button 
                  onClick={() => auth.signOut()}
                  className="w-full p-6 flex items-center space-x-4 font-bold text-red-600 hover:bg-red-50 transition-all text-left"
                >
                  <LogOut className="w-5 h-5" />
                  <span>{t('profile.logout')}</span>
                </button>
              </>
            )}
          </div>
        </div>
        {/* Right: Content Area */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {activeTab === 'listings' && (
              <motion.div 
                key="listings"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-black text-gray-900 tracking-tight">{t('profile.myListings')}</h2>
                  <span className="text-sm font-bold text-gray-400">{listings.length} Ads</span>
                </div>

                {listings.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {listings.map((listing) => (
                      <ListingCard key={listing.id} listing={listing} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                    <LayoutGrid className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-xl font-bold text-gray-900">{t('profile.noAds')}</h3>
                    <p className="text-gray-500 mt-2">{t('profile.startSelling')}</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'health' && (
              <motion.div 
                key="health"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-black text-gray-900 tracking-tight">{t('nav.health')}</h2>
                  <span className="text-sm font-bold text-gray-400">{healthPosts.length} Posts</span>
                </div>

                {healthPosts.length > 0 ? (
                  <div className="grid grid-cols-1 gap-6">
                    {healthPosts.map((post) => (
                      <Link 
                        key={post.id} 
                        to={`/health/${post.id}`}
                        className="block bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:border-orange-500 transition-all group"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="text-xl font-black text-gray-900 group-hover:text-orange-600 transition-colors">{post.title}</h3>
                          <span className="bg-green-50 text-green-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                            {t(`createListing.petTypes.${post.animalType}`)}
                          </span>
                        </div>
                        <p className="text-gray-500 line-clamp-2 text-sm mb-4 font-medium italic">"{post.content}"</p>
                        <div className="flex items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          <Clock className="w-3 h-3 mr-1.5" />
                          {post.createdAt?.toDate ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : 'Recently'}
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                    <Stethoscope className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-xl font-bold text-gray-900">No health publications</h3>
                    <p className="text-gray-500 mt-2">Share your experiences with the community!</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'favorites' && (
              <motion.div 
                key="favorites"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-black text-gray-900 tracking-tight">{t('profile.savedItems')}</h2>
                </div>

                {favorites.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {favorites.map((listing) => (
                      <ListingCard key={listing.id} listing={listing} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                    <Heart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-xl font-bold text-gray-900">{t('profile.noFavorites')}</h3>
                    <p className="text-gray-500 mt-2">{t('profile.saveInterest')}</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">{t('profile.accountSettings')}</h2>
                
                <form onSubmit={handleUpdateProfile} className="space-y-8">
                  {/* Personal Info */}
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
                    <div className="flex items-center space-x-2 mb-2">
                      <UserIcon className="w-5 h-5 text-orange-600" />
                      <h3 className="text-xl font-bold text-gray-900">{t('profile.personalInfo')}</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-2">{t('profile.displayName')}</label>
                        <input 
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-2">{t('profile.phoneNumber')}</label>
                        <input 
                          type="tel" 
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-medium"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-2">{t('profile.location')}</label>
                            <input 
                              type="text" 
                              value={location}
                              onChange={(e) => setLocation(e.target.value)}
                              placeholder="e.g. Casablanca, Morocco"
                              className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-medium"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-2">{t('profile.whatsapp')}</label>
                            <div className="relative">
                              <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                              <input 
                                type="tel" 
                                value={whatsapp}
                                onChange={(e) => setWhatsapp(e.target.value)}
                                placeholder="WhatsApp Number"
                                className="w-full pl-12 pr-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-medium"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-2">{t('profile.aboutBio')}</label>
                        <textarea 
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          placeholder="Tell buyers about yourself or your farm..."
                          rows={4}
                          className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-medium resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Email Change */}
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
                    <div className="flex items-center space-x-2 mb-2">
                      <Mail className="w-5 h-5 text-orange-600" />
                      <h3 className="text-xl font-bold text-gray-900">Change Email</h3>
                    </div>
                    <p className="text-sm text-gray-500 font-medium">
                      Your current email is <span className="font-bold text-gray-700">{user?.email}</span>.
                      To change it, enter a new email below. We will send a verification link to the new address.
                    </p>
                    <div className="flex items-center space-x-4">
                      <input
                        type="email"
                        placeholder="Enter new email address"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        className="flex-grow px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-medium"
                      />
                      <button
                        type="button"
                        onClick={handleEmailChange}
                        disabled={isChangingEmail || !newEmail}
                        className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-4 rounded-2xl font-black text-sm transition-all disabled:opacity-50"
                      >
                        {isChangingEmail ? 'Sending...' : 'Verify New Email'}
                      </button>
                    </div>
                  </div>
                  {/* Privacy Settings */}
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
                    <div className="flex items-center space-x-2 mb-2">
                      <Shield className="w-5 h-5 text-orange-600" />
                      <h3 className="text-xl font-bold text-gray-900">{t('profile.privacyVisibility')}</h3>
                    </div>
                    <p className="text-sm text-gray-500 font-medium">{t('profile.privacyDesc')}</p>

                    <div className="space-y-4">
                      <label className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl cursor-pointer group">
                        <div className="flex items-center space-x-4">
                          <Mail className="w-5 h-5 text-gray-400 group-hover:text-orange-600 transition-colors" />
                          <span className="font-bold text-gray-700">{t('profile.showEmail')}</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={privacySettings.showEmail}
                          onChange={(e) => setPrivacySettings({...privacySettings, showEmail: e.target.checked})}
                          className="w-6 h-6 rounded-lg border-gray-300 text-orange-600 focus:ring-orange-500"
                        />
                      </label>
                      <label className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl cursor-pointer group">
                        <div className="flex items-center space-x-4">
                          <Phone className="w-5 h-5 text-gray-400 group-hover:text-orange-600 transition-colors" />
                          <span className="font-bold text-gray-700">{t('profile.showPhone')}</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={privacySettings.showPhone}
                          onChange={(e) => setPrivacySettings({...privacySettings, showPhone: e.target.checked})}
                          className="w-6 h-6 rounded-lg border-gray-300 text-orange-600 focus:ring-orange-500"
                        />
                      </label>
                      <label className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl cursor-pointer group">
                        <div className="flex items-center space-x-4">
                          <MapPin className="w-5 h-5 text-gray-400 group-hover:text-orange-600 transition-colors" />
                          <span className="font-bold text-gray-700">{t('profile.showLocation')}</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={privacySettings.showLocation}
                          onChange={(e) => setPrivacySettings({...privacySettings, showLocation: e.target.checked})}
                          className="w-6 h-6 rounded-lg border-gray-300 text-orange-600 focus:ring-orange-500"
                        />
                      </label>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-4">
                    <button 
                      type="submit"
                      className="bg-orange-600 hover:bg-orange-700 text-white px-12 py-4 rounded-2xl font-black text-lg transition-all shadow-xl hover:shadow-orange-200 disabled:opacity-50 flex items-center"
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-3"></div>
                          {t('profile.saving')}
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5 mr-3" />
                          {t('profile.saveChanges')}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}
