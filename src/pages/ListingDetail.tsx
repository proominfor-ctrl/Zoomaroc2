import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { db, doc, getDoc, auth, collection, addDoc, query, where, getDocs, Timestamp, onSnapshot, arrayUnion, arrayRemove, updateDoc, setDoc, deleteDoc } from '../firebase';
import { MapPin, Tag, Clock, Heart, MessageSquare, Phone, Mail, ChevronLeft, ChevronRight, Share2, ShieldAlert, User as UserIcon, BadgeCheck, Star, X, AlertTriangle, Trash2, Languages, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from './supabase';

export default function ListingDetail({ user }: { user: any }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState<any>(null);
  const [author, setAuthor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [removeReason, setRemoveReason] = useState('');
  const [isRemoving, setIsRemoving] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [translatedContent, setTranslatedContent] = useState<{title: string, description: string} | null>(null);
  const [translatedLang, setTranslatedLang] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(true);
  const { t, i18n } = useTranslation();

  useEffect(() => {
    if (!id) return;
    
    setLoading(true);
    const docRef = doc(db, 'listings', id);
    let notFoundTimeout: any;

    const unsubscribe = onSnapshot(docRef, async (snapshot) => {
      if (snapshot.exists()) {
        clearTimeout(notFoundTimeout);
        const data = snapshot.data();

        // Check if the listing is active or if the current user is the author
        const isActive = data.status === 'active';
        const isAuthor = user?.uid === data.authorId;

        if (!isActive && !isAuthor) {
          toast.error('This listing is pending approval and is not yet public.');
          navigate('/');
          return;
        }

        setListing({ id: snapshot.id, ...data });
        // Pre-fill edit fields
        setEditTitle(data.title || '');
        setEditPrice(String(data.price || ''));
        setEditDescription(data.description || '');
        setExistingImages(data.images || []);
        
        setLoading(false);
      } else {
        // Fallback: Check if this is actually a coupling offer ID
        const couplingRef = doc(db, 'coupling_offers', id);
        const couplingSnap = await getDoc(couplingRef);
        if (couplingSnap.exists()) {
          navigate(`/coupling/${id}`, { replace: true });
          return;
        }

        // If not found in either collection, handle eventual consistency
        notFoundTimeout = setTimeout(() => {
          toast.error('Listing not found');
          navigate('/');
        }, 3000);
      }
    }, (error) => {
      console.error('Listing listener error:', error);
      toast.error('Failed to load listing');
      setLoading(false);
    });

    return () => {
      unsubscribe();
      clearTimeout(notFoundTimeout);
    };
  }, [id, navigate]);

  // Reactive author profile listener
  useEffect(() => {
    if (!listing?.authorId) return;
    const unsubscribe = onSnapshot(doc(db, 'users', listing.authorId), (snap) => {
      if (snap.exists()) setAuthor(snap.data());
    });
    return () => unsubscribe();
  }, [listing?.authorId]);

  // Reactive favorites listener
  useEffect(() => {
    if (!id) return;
    let unsubscribe = () => {};
    
    if (user) {
      unsubscribe = onSnapshot(doc(db, 'users', user.uid), (snap) => {
        if (snap.exists()) {
          const favorites = snap.data().favorites || [];
          setIsFavorited(favorites.includes(id));
        }
      });
    }
    return () => unsubscribe();
  }, [id, user]);

  const handleStartChat = async () => {
    if (!user) {
      toast.error('Please login to message the seller');
      navigate('/login');
      return;
    }

    if (user.uid === listing.authorId) {
      toast.error("You can't message yourself!");
      return;
    }

    if (!author) {
      toast.error("Seller information is not available.");
      return;
    }

    setIsStartingChat(true);
    try {
      // Check if chat already exists
      const chatsRef = collection(db, 'chats');
      const q = query(
        chatsRef, 
        where('participants', 'array-contains', user.uid)
      );
      const snapshot = await getDocs(q);
      
      let existingChat = snapshot.docs.find(chatSnap => 
        chatSnap.data().participants.includes(listing.authorId)
      );

      if (existingChat) {
        navigate(`/chat/${existingChat.id}`);
      } else {
        // Create new chat
        const newChat = {
          participants: [user.uid, listing.authorId],
          lastMessage: '',
          lastMessageAt: Timestamp.now(),
          unreadCount: {
            [user.uid]: 0,
            [listing.authorId]: 0
          },
          participantDetails: {
            [user.uid]: { 
              displayName: user.displayName || 'Buyer', 
              photoURL: user.photoURL || null 
            },
            [listing.authorId]: { 
              displayName: author.displayName || 'Seller', 
              photoURL: author.photoURL || null 
            }
          },
          listingId: listing.id,
          listingTitle: listing.title
        };
        const docRef = await addDoc(chatsRef, newChat);
        navigate(`/chat/${docRef.id}`);
      }
    } catch (error: any) {
      console.error('Error starting chat:', error);
      toast.error('Failed to start chat', {
        description: error.message || 'Check your internet connection and Firestore rules.'
      });
    } finally {
      setIsStartingChat(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!user) {
      toast.error('Please login to save favorites');
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    try {
      if (isFavorited) {
        await setDoc(userRef, {
          favorites: arrayRemove(listing.id)
        }, { merge: true });
        setIsFavorited(false);
        toast.success('Removed from favorites');
      } else {
        await setDoc(userRef, {
          favorites: arrayUnion(listing.id)
        }, { merge: true });
        setIsFavorited(true);
        toast.success('Added to favorites');
      }
    } catch (error) {
      toast.error('Failed to update favorites');
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: listing.title,
      text: `Check out this ${listing.breed || listing.animalType} on Su9.ma!`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  // Automatic Translation Logic
  useEffect(() => {
    if (listing && listing.language !== i18n.language) {
      handleTranslate();
    } else {
      setTranslatedContent(null);
      setTranslatedLang(null);
      setShowOriginal(true);
    }
  }, [listing?.id, i18n.language, listing?.language]);

  const handleTranslate = async () => {
    if (translatedContent && translatedLang === i18n.language) {
      setShowOriginal(!showOriginal);
      return;
    }

    setIsTranslating(true);
    try {
      const fetchTranslation = async (text: string, target: string) => {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Translation service unavailable');
        const data = await response.json();
        return data[0].map((item: any) => item[0]).join('');
      };

      const [translatedTitle, translatedDesc] = await Promise.all([
        fetchTranslation(listing.title, i18n.language),
        fetchTranslation(listing.description, i18n.language)
      ]);

      setTranslatedContent({
        title: translatedTitle,
        description: translatedDesc
      });
      setTranslatedLang(i18n.language);
      setShowOriginal(false);
      toast.success('Listing translated');
    } catch (error: any) {
      if (error.message.includes('Failed to fetch')) {
        toast.info('Translation service may be blocked by your browser extensions.');
      }
      toast.error('Translation failed');
    } finally {
      setIsTranslating(false);
    }
  };

  const removeExistingImage = async (url: string) => {
    setExistingImages(prev => prev.filter(img => img !== url));
    try {
      const path = url.split('/storage/v1/object/public/images/')[1];
      if (path && supabase) {
        await supabase.storage.from('images').remove([path]);
      }
    } catch (error) {
      console.error('Failed to remove image from storage:', error);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listing?.id) return;
    
    setIsSavingEdit(true);
    try {
      await updateDoc(doc(db, 'listings', listing.id), {
        title: editTitle,
        price: Number(editPrice),
        description: editDescription,
        images: existingImages,
        status: 'pending',
        updatedAt: Timestamp.now()
      });
      toast.success('Listing updated and sent for re-approval.');
      setShowEditModal(false);
    } catch (error) {
      toast.error('Failed to update listing');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please login to report a listing');
      return;
    }

    setIsSubmittingReport(true);
    try {
      await addDoc(collection(db, 'reports'), {
        listingId: listing.id,
        listingTitle: listing.title,
        reportedBy: user.uid,
        reportedByName: user.displayName || 'Anonymous',
        reason: reportReason,
        status: 'pending',
        createdAt: Timestamp.now()
      });
      toast.success('Report submitted. Thank you for keeping Su9.ma safe.');
      setShowReportModal(false);
      setReportReason('');
    } catch (error: any) {
      console.error('❌ Report Submission Error:', error);
      toast.error('Failed to submit report', {
        description: error.code === 'permission-denied' 
          ? 'Permissions denied. Update your Firestore rules to allow creating reports.' 
          : 'An unexpected error occurred.'
      });
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleRemoveListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || user.uid !== listing.authorId) return;

    setIsRemoving(true);
    try {
      // 1. Send the removal reason as a report to the admin
      try {
        await addDoc(collection(db, 'reports'), {
          listingId: listing.id,
          listingTitle: listing.title,
          reportedBy: user.uid,
          reportedByName: user.displayName || 'Anonymous',
          reason: `[User Self-Removal] ${removeReason}`,
          status: 'pending',
          createdAt: Timestamp.now()
        });
      } catch (logError) {
        // We log the error but don't stop the deletion process 
        // if the user has permission to delete the listing itself.
        console.warn('Failed to log removal reason:', logError);
      }

      // 2. Perform the actual deletion
      await deleteDoc(doc(db, 'listings', listing.id));
      toast.success('Listing removed successfully');
      navigate('/profile');
    } catch (error: any) {
      console.error('❌ Error removing listing:', error);
      toast.error('Failed to remove listing', {
        description: error.message || 'Please check your permissions.'
      });
    } finally {
      setIsRemoving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!listing || !listing.images || listing.images.length === 0) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <Helmet>
        <title>{`${listing.title} | ${listing.location} | Su9.ma`}</title>
        <meta name="description" content={`Buy ${listing.breed} in ${listing.location} for ${listing.price} MAD. Check out this and more animal listings on Su9.ma.`} />
        <meta property="og:title" content={listing.title} />
        <meta property="og:image" content={listing.images[0]} />
        <meta property="og:type" content="website" />
      </Helmet>

      <button 
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-500 hover:text-gray-900 font-bold mb-8 transition-colors"
      >
        <ChevronLeft className="w-5 h-5 mr-1" />
        {t('listingDetail.back')}
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left: Images & Description */}
        <div className="lg:col-span-2 space-y-8">
          {/* Image Gallery */}
          <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
            <div className="relative aspect-video bg-gray-100">
              <AnimatePresence mode="wait">
                <motion.img 
                  key={activeImage}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  src={listing.images[activeImage]} 
                  alt={listing.title}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </AnimatePresence>
              
              {listing.images.length > 1 && (
                <>
                  <button 
                    onClick={() => setActiveImage((prev) => (prev > 0 ? prev - 1 : listing.images.length - 1))}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 backdrop-blur-sm text-gray-900 hover:bg-white transition-all shadow-lg"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={() => setActiveImage((prev) => (prev < listing.images.length - 1 ? prev + 1 : 0))}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 backdrop-blur-sm text-gray-900 hover:bg-white transition-all shadow-lg"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>
            
            {listing.images.length > 1 && (
              <div className="p-4 flex space-x-4 overflow-x-auto scrollbar-hide">
                {listing.images.map((img: string, i: number) => (
                  <button 
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`relative w-24 aspect-square rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all ${
                      activeImage === i ? 'border-orange-500 scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            {listing.language !== i18n.language && (
              <button
                onClick={handleTranslate}
                disabled={isTranslating}
                className="mb-6 flex items-center space-x-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-xl font-bold text-sm hover:bg-orange-100 transition-all disabled:opacity-50"
              >
                {isTranslating ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-600/20 border-t-orange-600 mr-2" />
                ) : (
                  <Languages className="w-4 h-4 mr-2" />
                )}
                <span>
                  {isTranslating 
                    ? t('health.translating') 
                    : showOriginal ? t('health.translateAction', { lang: i18n.language === 'ar' ? 'العربية' : i18n.language === 'fr' ? 'Français' : 'English' }) : t('health.viewOriginal')}
                </span>
                {!isTranslating && <Sparkles className="w-3 h-3 ml-1" />}
              </button>
            )}

            <h1 className="text-3xl font-black text-gray-900 mb-6 tracking-tight">
              {!showOriginal && translatedContent ? translatedContent.title : listing.title}
            </h1>

            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">{t('listingDetail.description')}</h2>
              <div className="flex items-center text-gray-400 text-sm font-medium">
                <Clock className="w-4 h-4 mr-1.5" />
                {t('listingDetail.posted', { time: formatDistanceToNow(listing.createdAt.toDate()) })}
              </div>
            </div>
            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap text-lg">
              {!showOriginal && translatedContent ? translatedContent.description : listing.description}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-12 pt-8 border-t border-gray-50">
              <div>
                <span className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{t('listingDetail.breed')}</span>
                <span className="text-lg font-bold text-gray-900">{listing.breed || 'N/A'}</span>
              </div>
              <div>
                <span className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{t('listingDetail.age')}</span>
                <span className="text-lg font-bold text-gray-900">{listing.age || 'N/A'}</span>
              </div>
              <div>
                <span className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{t('listingDetail.category')}</span>
                <span className="text-lg font-bold text-orange-600 capitalize">{t(`categories.${listing.animalType}`)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Actions & Seller Info */}
        <div className="space-y-8">
          {/* Price & Actions */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <div className="mb-8">
              <span className="text-sm font-black text-gray-400 uppercase tracking-widest mb-1 block">{t('listingDetail.price')}</span>
              <h1 className="text-5xl font-black text-orange-600 tracking-tighter">{listing.price} <span className="text-2xl">MAD</span></h1>
            </div>

            <div className="space-y-4">
              <button 
                onClick={() => !isStartingChat && handleStartChat()}
                disabled={isStartingChat}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white py-4 rounded-2xl font-black text-lg transition-all shadow-xl hover:shadow-orange-200 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isStartingChat ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white mr-3"></div>
                ) : (
                  <MessageSquare className="w-6 h-6 mr-3" />
                )}
                {isStartingChat ? 'Connecting...' : t('listingDetail.chat')}
              </button>
              
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={handleToggleFavorite}
                  className={`flex items-center justify-center space-x-2 py-4 rounded-2xl font-bold transition-all ${isFavorited ? 'bg-red-50 text-red-600' : 'bg-gray-50 hover:bg-gray-100 text-gray-700'}`}
                >
                  <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
                  <span>{isFavorited ? t('listingDetail.saved') : t('listingDetail.favorite')}</span>
                </button>
                <button onClick={handleShare} className="flex items-center justify-center space-x-2 py-4 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-2xl transition-all">
                  <Share2 className="w-5 h-5" />
                  <span>{t('listingDetail.share')}</span>
                </button>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-gray-50">
              <div className="flex items-center text-gray-500 mb-4 font-medium">
                <MapPin className="w-5 h-5 mr-2 text-orange-600" />
                {listing.location}
              </div>
              {user?.uid === listing.authorId && (
                <div className="space-y-2 mb-2">
                  <button 
                    onClick={() => setShowEditModal(true)}
                    className="w-full bg-gray-900 text-white font-bold text-sm flex items-center justify-center hover:bg-gray-800 py-3 rounded-xl transition-all"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Edit Listing
                  </button>
                  <button 
                    onClick={() => setShowRemoveModal(true)}
                    className="w-full text-gray-500 font-bold text-sm flex items-center justify-center hover:bg-gray-50 py-3 rounded-xl transition-all border border-gray-100"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('listingDetail.removeAd')}
                  </button>
                </div>
              )}
              <button 
                onClick={() => setShowReportModal(true)}
                className="w-full text-red-500 font-bold text-sm flex items-center justify-center hover:bg-red-50 py-2 rounded-xl transition-all"
              >
                <ShieldAlert className="w-4 h-4 mr-2" />
                {t('listingDetail.report')}
              </button>
            </div>
          </div>

          {/* Seller Info */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6 block">{t('listingDetail.sellerInfo')}</h3>
            <Link to={`/profile/${listing.authorId}`} className="flex items-center space-x-4 mb-8 group">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 border overflow-hidden flex-shrink-0 group-hover:border-orange-500 transition-colors">
                {(author?.photoURL || listing.authorPhotoURL) ? (
                  <img src={author?.photoURL || listing.authorPhotoURL} alt={author?.displayName || listing.authorName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <UserIcon className="w-8 h-8" />
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h4 className="text-xl font-black text-gray-900 tracking-tight group-hover:text-orange-600 transition-colors">{author?.displayName || listing.authorName || 'Anonymous'}</h4>
                  {author?.isTrusted && <BadgeCheck className="w-5 h-5 text-[#006d2c]" />}
                </div>
                <div className="flex items-center space-x-1 mt-0.5">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < Math.round(author?.rating ?? 5) ? 'fill-orange-400 text-orange-400' : 'text-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-gray-500">({author?.reviewCount || 0})</span>
                </div>
                <p className="text-sm text-gray-500 font-medium">{t('listingDetail.memberSince', { year: author?.createdAt?.toDate ? new Date(author.createdAt.toDate()).getFullYear() : '2026' })}</p>
              </div>
            </Link>

            <div className="space-y-4">
              {author?.privacySettings?.showPhone && author.phoneNumber && (
                <div className="flex items-center p-4 bg-gray-50 rounded-2xl">
                  <Phone className="w-5 h-5 text-orange-600 mr-4" />
                  <span className="font-bold text-gray-900">{author.phoneNumber}</span>
                </div>
              )}
              {author?.privacySettings?.showEmail && (
                <div className="flex items-center p-4 bg-gray-50 rounded-2xl">
                  <Mail className="w-5 h-5 text-orange-600 mr-4" />
                  <span className="font-bold text-gray-900">{author.email}</span>
                </div>
              )}
              <Link to={`/profile/${listing.authorId}`} className="block text-center text-orange-600 font-bold hover:underline py-2">
                {t('listingDetail.viewOtherAds')}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Report Modal */}
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <button 
                    onClick={() => setShowReportModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-900 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Report Listing</h3>
                <p className="text-gray-500 font-medium text-sm mb-6">
                  Please describe the issue with this listing. Our team will review it shortly.
                </p>

                <form onSubmit={handleReportSubmit} className="space-y-6">
                  <textarea
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="Why are you reporting this? (e.g., fraudulent, incorrect category, sold...)"
                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-medium text-sm min-h-[120px] resize-none"
                    required
                  />

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => setShowReportModal(false)}
                      className="flex-1 py-4 text-gray-500 font-bold hover:text-gray-900 transition-colors text-center"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingReport || !reportReason.trim()}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-black transition-all shadow-lg hover:shadow-red-200 disabled:opacity-50"
                    >
                      {isSubmittingReport ? (
                        <span className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white mr-2" />
                          Submitting...
                        </span>
                      ) : 'Submit Report'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Listing Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <button 
                    onClick={() => setShowEditModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-900 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Edit Listing</h3>
                <p className="text-gray-500 font-medium text-sm mb-6">
                  Updating your listing will set it to pending for admin re-approval.
                </p>

                <form onSubmit={handleSaveEdit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Title</label>
                    <input 
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-5 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-medium"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Price (MAD)</label>
                    <input 
                      type="number"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className="w-full px-5 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-medium"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Description</label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={5}
                      className="w-full px-5 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-medium resize-none"
                      required
                    />
                  </div>
                  
                  {existingImages.length > 0 && (
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Existing Images</label>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {existingImages.map((url, i) => (
                          <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden group border border-gray-100">
                            <img src={url} className="w-full h-full object-cover" />
                            <button 
                              type="button"
                              onClick={() => removeExistingImage(url)}
                              className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-4 h-4 text-white" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end space-x-4 pt-4">
                    <button type="button" onClick={() => setShowEditModal(false)} className="px-6 py-3 text-gray-500 font-bold hover:text-gray-900 transition-colors">Cancel</button>
                    <button 
                      type="submit" 
                      disabled={isSavingEdit}
                      className="bg-orange-600 hover:bg-orange-700 text-white px-10 py-3 rounded-2xl font-black transition-all shadow-lg hover:shadow-orange-200 disabled:opacity-50"
                    >
                      {isSavingEdit ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Removal Modal */}
      <AnimatePresence>
        {showRemoveModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <button 
                    onClick={() => setShowRemoveModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-900 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-2">{t('listingDetail.removeTitle')}</h3>
                <p className="text-gray-500 font-medium text-sm mb-6">
                  {t('listingDetail.removeDesc')}
                </p>

                <form onSubmit={handleRemoveListing} className="space-y-6">
                  <textarea
                    value={removeReason}
                    onChange={(e) => setRemoveReason(e.target.value)}
                    placeholder={t('listingDetail.removePlaceholder')}
                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-medium text-sm min-h-[120px] resize-none"
                    required
                  />

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => setShowRemoveModal(false)}
                      className="flex-1 py-4 text-gray-500 font-bold hover:text-gray-900 transition-colors text-center"
                    >
                      {t('createListing.cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={isRemoving || !removeReason.trim()}
                      className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-4 rounded-2xl font-black transition-all shadow-lg hover:shadow-orange-200 disabled:opacity-50"
                    >
                      {isRemoving ? (
                        <span className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white mr-2" />
                          {t('profile.saving')}
                        </span>
                      ) : t('listingDetail.confirmRemove')}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
