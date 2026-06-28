import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { db, collection, getDocs, query, where, orderBy, limit, User, doc, getDoc, updateDoc, deleteDoc, Timestamp, addDoc, setDoc } from '../firebase';
import { Shield, Users, LayoutGrid, AlertTriangle, BarChart3, Trash2, Ban, CheckCircle2, MoreVertical, Search, Filter, BadgeCheck, ExternalLink, MessageSquare, Settings, Image as ImageIcon, Stethoscope, Heart, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { uploadImage } from '../storage'; 

interface Props {
  user: User;
}

export default function Admin({ user }: Props) {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [statsError, setStatsError] = useState<string>('');
  const [activeTab, setActiveTab] = useState('stats');
  const [listings, setListings] = useState<any[]>([]);
  const [healthPosts, setHealthPosts] = useState<any[]>([]);
  const [couplingOffers, setCouplingOffers] = useState<any[]>([]);
  const [lostFoundPosts, setLostFoundPosts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [adminSearchTerm, setAdminSearchTerm] = useState('');
  const [reportFilter, setReportFilter] = useState('pending');
  const [heroImages, setHeroImages] = useState<string[]>([]);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    checkAdmin();
  }, [user.uid]);

  const checkAdmin = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.role === 'admin') {
          setIsAdmin(true);
        } else {
          console.log("User Access: Non-admin role detected.");
        }
      } else {
        console.warn("User profile not found in Firestore yet.");
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      setStatsError('');
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch stats from server.' }));
        throw new Error(errorData.error || `Server responded with ${response.status}`);
      }

      const data = await response.json();
      setStats(data);
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      setStatsError(error.message || 'An unknown error occurred while fetching stats.');
    }
  };

  const fetchListings = async () => {
    const snapshot = await getDocs(query(collection(db, 'listings'), limit(100)));
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Sort client-side to avoid index requirement
    data.sort((a: any, b: any) => {
      const aTime = a.approvedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
      const bTime = b.approvedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });
    setListings(data);
  };

  const fetchHealthPosts = async () => {
    const snapshot = await getDocs(query(collection(db, 'health_posts'), limit(100)));
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    data.sort((a: any, b: any) => {
      const aTime = a.approvedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
      const bTime = b.approvedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });
    setHealthPosts(data);
  };

  const fetchLostFoundPosts = async () => {
    const snapshot = await getDocs(query(collection(db, 'lost_and_found_posts'), limit(100)));
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    data.sort((a: any, b: any) => {
      const aTime = a.approvedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
      const bTime = b.approvedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });
    setLostFoundPosts(data);
  };

  const fetchUsers = async () => {
    const snapshot = await getDocs(query(collection(db, 'users'), limit(100)));
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    data.sort((a: any, b: any) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    setUsers(data);
  };

  const fetchReports = async () => {
    // Remove server-side orderBy to prevent "Database Error" (Missing Index)
    const q = query(
      collection(db, 'reports'), 
      where('status', '==', reportFilter), 
      limit(50)
    );
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    data.sort((a: any, b: any) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    setReports(data);
  };

  const fetchCouplingOffers = async () => {
    const snapshot = await getDocs(query(collection(db, 'coupling_offers'), limit(100)));
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    data.sort((a: any, b: any) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    setCouplingOffers(data);
  };

  const fetchHeroSettings = async () => {
    const docSnap = await getDoc(doc(db, 'settings', 'hero'));
    if (docSnap.exists()) {
      setHeroImages(docSnap.data().images || []);
    }
  };

  const handleAddHeroImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingHero(true);
    try {
      const url = await uploadImage(file, file.name, 'hero');

      const newImages = [...heroImages, url];
      await setDoc(doc(db, 'settings', 'hero'), { images: newImages }, { merge: true });
      setHeroImages(newImages);
      toast.success('Hero image added successfully');
    } catch (error: any) {
      console.error('❌ Hero upload error:', error);
      if (error.message?.includes('row-level security policy')) {
        toast.error('Permission Error', {
          description: 'Check your Supabase RLS policies for the images bucket.'
        });
      } else {
        toast.error('Failed to add hero image');
      }
    } finally {
      setUploadingHero(false);
    }
  };

  const handleRemoveHeroImage = async (index: number) => {
    if (!window.confirm('Remove this hero image?')) return;
    try {
      const newImages = heroImages.filter((_, i) => i !== index);
      await setDoc(doc(db, 'settings', 'hero'), { images: newImages }, { merge: true });
      setHeroImages(newImages);
      toast.success('Hero image removed');
    } catch (error) {
      toast.error('Failed to remove hero image');
    }
  };

  useEffect(() => {
    // Only fetch admin data if the user is confirmed as an admin
    if (!isAdmin) return;

    const tabActions: Record<string, () => Promise<void>> = {
      listings: fetchListings,
      health: fetchHealthPosts,
      users: fetchUsers,
      reports: fetchReports,
      stats: fetchStats,
      lostfound: fetchLostFoundPosts,
      settings: fetchHeroSettings,
      coupling: fetchCouplingOffers
    };

    const action = tabActions[activeTab];
    if (action) {
      action().catch(err => toast.error(`Failed to load ${activeTab}`));
    }
  }, [activeTab, isAdmin, reportFilter]); // Added reportFilter to ensure re-fetch when filter changes

  const handleDeleteListing = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this listing?')) {
      try {
        await deleteDoc(doc(db, 'listings', id));
        toast.success('Listing deleted');
        fetchListings();
      } catch (error) {
        toast.error('Failed to delete listing');
      }
    }
  };

  const handleApproveListing = async (listing: any) => {
    try {
      await updateDoc(doc(db, 'listings', listing.id), {
        status: 'active',
        approvedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      // Create notification for the author
      await addDoc(collection(db, 'notifications'), {
        userId: listing.authorId,
        type: 'listing_approved',
        title: 'Ad Approved! 🎉',
        message: `Your ad "${listing.title}" is now active on Su9.ma.`,
        listingId: listing.id,
        read: false,
        createdAt: Timestamp.now()
      });

      // Notify followers of the author
      const authorSnap = await getDoc(doc(db, 'users', listing.authorId));
      if (authorSnap.exists()) {
        const authorData = authorSnap.data();
        const followers = authorData.followers || [];
        
        for (const followerId of followers) {
          await addDoc(collection(db, 'notifications'), {
            userId: followerId,
            type: 'new_listing_followed',
            title: 'New Listing! 🐾',
            message: `${authorData.displayName} just posted a new ad: "${listing.title}"`,
            listingId: listing.id,
            read: false,
            createdAt: Timestamp.now()
          });
        }
      }

      toast.success('Listing approved and published');
      fetchListings();
    } catch (error: any) {
      console.error('❌ Approval Error:', error);
      toast.error('Failed to approve listing', {
        description: error.code === 'permission-denied' 
          ? 'Permissions denied. Check your Firestore rules and admin role.' 
          : error.message
      });
    }
  };

  const handleApproveHealthPost = async (post: any) => {
    try {
      await updateDoc(doc(db, 'health_posts', post.id), { 
        status: 'active',
        approvedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      await addDoc(collection(db, 'notifications'), {
        userId: post.authorId,
        type: 'health_approved',
        title: 'Experience Approved! ✨',
        message: `Your health post "${post.title}" is now public.`,
        postId: post.id,
        read: false,
        createdAt: Timestamp.now()
      });

      // Notify followers of the author
      const authorSnap = await getDoc(doc(db, 'users', post.authorId));
      if (authorSnap.exists()) {
        const authorData = authorSnap.data();
        const followers = authorData.followers || [];
        
        for (const followerId of followers) {
          await addDoc(collection(db, 'notifications'), {
            userId: followerId,
            type: 'new_post_followed',
            title: 'New Publication! ✨',
            message: `${authorData.displayName} shared a new experience: "${post.title}"`,
            postId: post.id,
            read: false,
            createdAt: Timestamp.now()
          });
        }
      }
    } catch (error) {
      toast.error('Failed to approve health post');
    }
    toast.success('Health post approved');
    fetchHealthPosts();
  };

  const handleApproveLostFoundPost = async (post: any) => {
    try {
      await updateDoc(doc(db, 'lost_and_found_posts', post.id), { 
        status: 'active',
        approvedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      await addDoc(collection(db, 'notifications'), {
        userId: post.authorId,
        type: 'lostfound_approved',
        title: 'Lost/Found Post Approved! ✨',
        message: `Your post "${post.title}" is now public.`,
        postId: post.id,
        read: false,
        createdAt: Timestamp.now()
      });
      toast.success('Lost/Found post approved');
      fetchLostFoundPosts();
    } catch (error) {
      toast.error('Failed to approve post');
    }
  };

  const handleRejectLostFoundPost = async (post: any) => {
    if (window.confirm('Reject this post?')) {
      await updateDoc(doc(db, 'lost_and_found_posts', post.id), {
        status: 'rejected',
        updatedAt: Timestamp.now()
      });
      toast.success('Post rejected');
      fetchLostFoundPosts();
    }
  };

  const handleRejectHealthPost = async (post: any) => {
    if (window.confirm('Reject this health post?')) {
      try {
        await updateDoc(doc(db, 'health_posts', post.id), {
          status: 'rejected',
          updatedAt: Timestamp.now()
        });

        // Create notification for the author
        await addDoc(collection(db, 'notifications'), {
          userId: post.authorId,
          type: 'health_rejected',
          title: 'Post Update',
          message: `Your health post "${post.title}" was not approved.`,
          postId: post.id,
          read: false,
          createdAt: Timestamp.now()
        });

        toast.success('Health post rejected');
        fetchHealthPosts();
      } catch (error: any) {
        toast.error('Failed to reject health post');
      }
    }
  };

  const handleApproveCouplingOffer = async (offer: any) => {
    try {
      await updateDoc(doc(db, 'coupling_offers', offer.id), {
        status: 'active',
        approvedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      await addDoc(collection(db, 'notifications'), {
        userId: offer.authorId,
        type: 'coupling_approved',
        title: 'Coupling Offer Approved! 🎉',
        message: `Your coupling offer for ${offer.petName} is now visible to all users.`,
        offerId: offer.id,
        read: false,
        createdAt: Timestamp.now()
      });

      toast.success('Coupling offer approved');
      fetchCouplingOffers();
    } catch (error: any) {
      console.error('❌ Coupling approval error:', error);
      toast.error('Failed to approve coupling offer');
    }
  };

  const handleRejectCouplingOffer = async (offer: any) => {
    if (!window.confirm('Reject this coupling offer?')) return;

    try {
      await updateDoc(doc(db, 'coupling_offers', offer.id), {
        status: 'rejected',
        updatedAt: Timestamp.now()
      });

      await addDoc(collection(db, 'notifications'), {
        userId: offer.authorId,
        type: 'coupling_rejected',
        title: 'Coupling Offer Update',
        message: `Your coupling offer for ${offer.petName} was not approved.`,
        offerId: offer.id,
        read: false,
        createdAt: Timestamp.now()
      });

      toast.success('Coupling offer rejected');
      fetchCouplingOffers();
    } catch (error: any) {
      console.error('❌ Coupling rejection error:', error);
      toast.error('Failed to reject coupling offer');
    }
  };

  const handleToggleTrusted = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        isTrusted: !currentStatus,
        updatedAt: Timestamp.now()
      });
      toast.success(`User updated: ${!currentStatus ? 'Marked as Trusted' : 'Removed Trusted status'}`);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  const handleToggleAdmin = async (targetUserId: string, currentRole: string) => {
    if (targetUserId === user.uid) {
      toast.error("You cannot change your own admin status.");
      return;
    }

    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;

    try {
      await updateDoc(doc(db, 'users', targetUserId), {
        role: newRole,
        updatedAt: Timestamp.now()
      });
      toast.success(`User role updated to ${newRole}`);
      fetchUsers();
    } catch (error) {
      console.error('Error toggling admin status:', error);
      toast.error('Failed to update user role');
    }
  };

  const handleUpdateReportStatus = async (reportId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'reports', reportId), {
        status: newStatus,
        updatedAt: Timestamp.now()
      });
      toast.success(`Report marked as ${newStatus}`);
      fetchReports();
    } catch (error) {
      toast.error('Failed to update report status');
    }
  };

  const handleContactUser = async (targetUser: any) => {
    if (user.uid === targetUser.id) {
      toast.error("You can't message yourself!");
      return;
    }

    setIsStartingChat(true);
    try {
      const chatsRef = collection(db, 'chats');
      const q = query(
        chatsRef,
        where('participants', 'array-contains', user.uid)
      );
      const snapshot = await getDocs(q);
      
      let existingChat = snapshot.docs.find(doc => 
        doc.data().participants.includes(targetUser.id)
      );

      if (existingChat) {
        navigate(`/chat/${existingChat.id}`);
      } else {
        // Create new chat
        const newChat = {
          participants: [user.uid, targetUser.id],
          lastMessage: '',
          lastMessageAt: Timestamp.now(),
          unreadCount: {
            [user.uid]: 0,
            [targetUser.id]: 0
          },
          participantDetails: {
            [user.uid]: { 
              displayName: user.displayName || 'Admin', 
              photoURL: user.photoURL || null 
            },
            [targetUser.id]: { 
              displayName: targetUser.displayName || 'User', 
              photoURL: targetUser.photoURL || null 
            }
          },
          listingId: 'admin_support',
          listingTitle: 'Admin Support'
        };
        const docRef = await addDoc(chatsRef, newChat);
        navigate(`/chat/${docRef.id}`);
      }
    } catch (error: any) {
      console.error('Error starting chat from admin:', error);
      toast.error('Failed to start chat', {
        description: error.message || 'Check your internet connection and Firestore rules.'
      });
    } finally {
      setIsStartingChat(false);
    }
  };

  const handleBanUser = async (targetUserId: string, isCurrentlyBanned: boolean) => {
    if (targetUserId === user.uid) {
      toast.error("You cannot ban yourself.");
      return;
    }

    const action = isCurrentlyBanned ? 'unban' : 'ban';
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/admin/users/${targetUserId}/${action}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let serverMessage = errorText;
        try {
          const errorBody = JSON.parse(errorText);
          serverMessage = errorBody?.error || errorBody?.message || errorText;
        } catch {
          serverMessage = errorText;
        }
        throw new Error(serverMessage || 'Server returned an error.');
      }

      toast.success(`User has been ${action}ned.`);
      fetchUsers(); // Refresh the user list
    } catch (error: any) {
      toast.error(`Failed to ${action} user`, { description: error.message });
    }
  };

  const handleDeleteUser = async (targetUserId: string) => {
    if (targetUserId === user.uid) {
      toast.error("You cannot delete yourself.");
      return;
    }

    if (!window.confirm(`Are you sure you want to PERMANENTLY DELETE this user? This action cannot be undone.`)) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/admin/users/${targetUserId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        let serverMessage = 'Server returned an error.';
        try {
          const errorBody = await response.json();
          serverMessage = errorBody?.error || errorBody?.message || serverMessage;
        } catch {
          // If parsing fails, the original message is fine.
        }
        throw new Error(serverMessage);
      }

      toast.success(`User has been deleted.`);
      fetchUsers(); // Refresh the user list
    } catch (error: any) {
      toast.error(`Failed to delete user`, { description: error.message });
    }
  };

  const handleRejectListing = async (listing: any) => {
    if (window.confirm('Reject this listing?')) {
      try {
        await updateDoc(doc(db, 'listings', listing.id), {
          status: 'rejected',
          updatedAt: Timestamp.now()
        });

        // Create notification for the author
        await addDoc(collection(db, 'notifications'), {
          userId: listing.authorId,
          type: 'listing_rejected',
          title: 'Ad Update',
          message: `Your listing "${listing.title}" was not approved. Please check our guidelines.`,
          listingId: listing.id,
          read: false,
          createdAt: Timestamp.now()
        });

        toast.success('Listing rejected');
        fetchListings();
      } catch (error: any) {
        console.error('❌ Rejection Error:', error);
        toast.error('Failed to reject listing', {
          description: error.code === 'permission-denied' 
            ? 'Permissions denied. Check your Firestore rules.' 
            : error.message
        });
      }
    }
  };

  // Filter listings based on search term
  const filteredAdminListings = listings.filter(l => 
    l.title?.toLowerCase().includes(adminSearchTerm.toLowerCase()) ||
    l.authorName?.toLowerCase().includes(adminSearchTerm.toLowerCase()) ||
    l.id?.includes(adminSearchTerm)
  );

  // Filter users based on search term
  const filteredAdminUsers = users.filter(u => 
    u.displayName?.toLowerCase().includes(adminSearchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(adminSearchTerm.toLowerCase()) ||
    u.id?.includes(adminSearchTerm)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mb-6">
          <Shield className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">Access Denied</h2>
        <p className="text-gray-500 font-medium max-w-sm">You do not have the administrator permissions required to view the dashboard.</p>
        <Link to="/" className="mt-8 text-orange-600 font-bold hover:underline">Return to Home</Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">{t('admin.title')} <span className="text-orange-600">{t('admin.dashboard')}</span></h1>
          <p className="text-gray-500 mt-2">{t('admin.subtitle')}</p>
        </div>
        <div className="bg-orange-100 text-orange-600 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest flex items-center">
          <Shield className="w-4 h-4 mr-2" />
          Admin Access
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Tabs */}
        <div className="space-y-4">
          <button 
            onClick={() => setActiveTab('stats')}
            className={`w-full p-6 flex items-center space-x-4 font-bold transition-all text-left rounded-3xl ${
              activeTab === 'stats' ? 'bg-orange-600 text-white shadow-xl shadow-orange-200' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span>{t('admin.overview')}</span>
          </button>
          <button 
            onClick={() => setActiveTab('coupling')}
            className={`w-full p-6 flex items-center space-x-4 font-bold transition-all text-left rounded-3xl ${
              activeTab === 'coupling' ? 'bg-red-600 text-white shadow-xl shadow-red-200' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
            }`}
          >
            <Heart className="w-5 h-5" />
            <span>Coupling Offers</span>
          </button>
          <button 
            onClick={() => setActiveTab('listings')}
            className={`w-full p-6 flex items-center space-x-4 font-bold transition-all text-left rounded-3xl ${
              activeTab === 'listings' ? 'bg-orange-600 text-white shadow-xl shadow-orange-200' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
            }`}
          >
            <LayoutGrid className="w-5 h-5" />
            <span>{t('admin.listings')}</span>
          </button>
          <button 
            onClick={() => setActiveTab('health')}
            className={`w-full p-6 flex items-center space-x-4 font-bold transition-all text-left rounded-3xl ${
              activeTab === 'health' ? 'bg-green-600 text-white shadow-xl shadow-green-200' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
            }`}
          >
            <Stethoscope className="w-5 h-5" />
            <span>Health Posts</span>
          </button>
          <button 
            onClick={() => setActiveTab('lostfound')}
            className={`w-full p-6 flex items-center space-x-4 font-bold transition-all text-left rounded-3xl ${
              activeTab === 'lostfound' ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
            }`}
          >
            <HelpCircle className="w-5 h-5" />
            <span>Lost & Found</span>
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`w-full p-6 flex items-center space-x-4 font-bold transition-all text-left rounded-3xl ${
              activeTab === 'users' ? 'bg-orange-600 text-white shadow-xl shadow-orange-200' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
            }`}
          >
            <Users className="w-5 h-5" />
            <span>{t('admin.users')}</span>
          </button>
          <button 
            onClick={() => setActiveTab('reports')}
            className={`w-full p-6 flex items-center space-x-4 font-bold transition-all text-left rounded-3xl ${
              activeTab === 'reports' ? 'bg-orange-600 text-white shadow-xl shadow-orange-200' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
            <span>{t('admin.reports')}</span>
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full p-6 flex items-center space-x-4 font-bold transition-all text-left rounded-3xl ${
              activeTab === 'settings' ? 'bg-orange-600 text-white shadow-xl shadow-orange-200' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span>{t('admin.settings')}</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {activeTab === 'stats' && (
              <motion.div 
                key="stats"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {statsError && (
                  <div className="rounded-3xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">
                    {statsError}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-6">
                    <Users className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-black text-gray-400 uppercase tracking-widest mb-1 block">{t('admin.totalUsers')}</span>
                  <h3 className="text-4xl font-black text-gray-900 tracking-tight">{stats?.users || 0}</h3>
                </div>
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
                  <div>
                  <div className="w-12 h-12 rounded-2xl bg-[#006d2c]/10 text-[#006d2c] flex items-center justify-center mb-6">
                    <LayoutGrid className="w-6 h-6" />
                  </div>
                    <span className="text-sm font-black text-gray-400 uppercase tracking-widest mb-1 block">Listings</span>
                    <h3 className="text-4xl font-black text-gray-900 tracking-tight">{stats?.listings || 0}</h3>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between text-xs font-black uppercase tracking-widest">
                    <span className="text-orange-600">Pending: {stats?.pendingListings || 0}</span>
                  </div>
                </div>
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
                  <div>
                  <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-6">
                    <Heart className="w-6 h-6" />
                  </div>
                    <span className="text-sm font-black text-gray-400 uppercase tracking-widest mb-1 block">Coupling</span>
                    <h3 className="text-4xl font-black text-gray-900 tracking-tight">{stats?.couplingCount || 0}</h3>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between text-xs font-black uppercase tracking-widest">
                    <span className="text-red-600">Pending: {stats?.pendingCoupling || 0}</span>
                  </div>
                </div>
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
                  <div>
                  <div className="w-12 h-12 rounded-2xl bg-green-100 text-green-600 flex items-center justify-center mb-6">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                    <span className="text-sm font-black text-gray-400 uppercase tracking-widest mb-1 block">Health</span>
                    <h3 className="text-4xl font-black text-gray-900 tracking-tight">{stats?.healthCount || 0}</h3>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between text-xs font-black uppercase tracking-widest">
                    <span className="text-green-600">Pending: {stats?.pendingHealth || 0}</span>
                  </div>
                </div>
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
                  <div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-6">
                    <HelpCircle className="w-6 h-6" />
                  </div>
                    <span className="text-sm font-black text-gray-400 uppercase tracking-widest mb-1 block">Lost & Found</span>
                    <h3 className="text-4xl font-black text-gray-900 tracking-tight">{stats?.lostFoundCount || 0}</h3>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between text-xs font-black uppercase tracking-widest">
                    <span className="text-blue-600">Pending: {stats?.pendingLostFound || 0}</span>
                  </div>
                </div>
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                  <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-6">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-black text-gray-400 uppercase tracking-widest mb-1 block">{t('admin.pendingReports')}</span>
                  <h3 className="text-4xl font-black text-gray-900 tracking-tight">{stats?.pendingReports || 0}</h3>
                </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'lostfound' && (
              <motion.div 
                key="lostfound"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div className="p-6 border-b flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">Manage Lost & Found Posts</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <th className="px-6 py-4">Title</th>
                        <th className="px-6 py-4">Author</th>
                        <th className="px-6 py-4">Type</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {lostFoundPosts.map((post) => (
                        <tr key={post.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <span className="font-bold text-gray-900 text-sm truncate max-w-[200px] block">{post.title}</span>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-500">
                            <Link to={`/profile/${post.authorId}`} className="hover:text-orange-600 transition-colors">
                              {post.authorName}
                            </Link>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-500 capitalize">{post.postType}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              post.status === 'active' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {post.status || 'pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              {(post.status === 'pending' || !post.status) && (
                                <>
                                  <button 
                                    onClick={() => handleApproveLostFoundPost(post)}
                                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                    title="Approve"
                                  >
                                    <CheckCircle2 className="w-5 h-5" />
                                  </button>
                                  <button 
                                    onClick={() => handleRejectLostFoundPost(post)}
                                    className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                    title="Reject"
                                  >
                                    <Ban className="w-5 h-5" />
                                  </button>
                                </>
                              )}
                              <button 
                                onClick={async () => {
                                  if (window.confirm('Delete this post permanently?')) {
                                    await deleteDoc(doc(db, 'lost_and_found_posts', post.id));
                                    toast.success('Post deleted');
                                    fetchLostFoundPosts();
                                  }
                                }}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {lostFoundPosts.length === 0 && (
                    <div className="p-20 text-center text-gray-400">
                      <HelpCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p className="font-bold">No lost & found posts found.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'coupling' && (
              <motion.div 
                key="coupling"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div className="p-6 border-b flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">Manage Coupling Offers</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <th className="px-6 py-4">Pet</th>
                        <th className="px-6 py-4">Author</th>
                        <th className="px-6 py-4">Type</th>
                        <th className="px-6 py-4">Price</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {couplingOffers.map((offer) => (
                        <tr key={offer.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                                <img src={offer.images?.[0]} className="w-full h-full object-cover" />
                              </div>
                              <span className="font-bold text-gray-900 text-sm truncate max-w-[150px]">{offer.petName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-500">
                            {offer.authorName}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-500 capitalize">{offer.petType}</td>
                          <td className="px-6 py-4 text-sm font-black text-red-600">
                            {offer.price > 0 ? `${offer.price} MAD` : 'FREE'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              offer.status === 'active' ? 'bg-[#006d2c]/10 text-[#006d2c]' : 
                              offer.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {offer.status || 'pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              {(offer.status === 'pending' || !offer.status) && (
                                <>
                                  <button 
                                    onClick={() => handleApproveCouplingOffer(offer)}
                                    className="p-2 text-[#006d2c] hover:bg-[#006d2c]/10 rounded-lg transition-colors"
                                    title="Approve"
                                  >
                                    <CheckCircle2 className="w-5 h-5" />
                                  </button>
                                  <button 
                                    onClick={() => handleRejectCouplingOffer(offer)}
                                    className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                    title="Reject"
                                  >
                                    <Ban className="w-5 h-5" />
                                  </button>
                                </>
                              )}
                              <Link 
                                to={`/coupling/${offer.id}`}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <ExternalLink className="w-5 h-5" />
                              </Link>
                              <button 
                                onClick={async () => {
                                  if (window.confirm('Delete this coupling offer?')) {
                                    await deleteDoc(doc(db, 'coupling_offers', offer.id));
                                    toast.success('Offer deleted');
                                    fetchCouplingOffers();
                                  }
                                }}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete offer"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {couplingOffers.length === 0 && (
                    <div className="p-20 text-center text-gray-400">
                      <Heart className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p className="font-bold">No coupling offers found.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Hero Section Images</h3>
                      <p className="text-sm text-gray-500 mt-1">Manage the background images for the home page slideshow.</p>
                    </div>
                    <label className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-2xl font-black text-sm transition-all shadow-lg hover:shadow-orange-200 cursor-pointer flex items-center">
                      <ImageIcon className="w-4 h-4 mr-2" />
                      {uploadingHero ? 'Adding...' : 'Add Image'}
                      <input type="file" accept="image/*" className="hidden" onChange={handleAddHeroImage} disabled={uploadingHero} />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {heroImages.map((url, index) => (
                      <div key={index} className="relative group aspect-video rounded-2xl overflow-hidden border border-gray-100">
                        <img src={url} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button 
                            onClick={() => handleRemoveHeroImage(index)}
                            className="p-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors shadow-lg"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'listings' && (
              <motion.div 
                key="listings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div className="p-6 border-b flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">Manage Listings</h3>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input 
                      type="text" 
                      placeholder="Search ads or authors..." 
                      value={adminSearchTerm}
                      onChange={(e) => setAdminSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500" 
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <th className="px-6 py-4">Listing</th>
                        <th className="px-6 py-4">Author</th>
                        <th className="px-6 py-4">Price</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredAdminListings.map((listing) => (
                        <tr key={listing.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                                <img src={listing.images?.[0]} className="w-full h-full object-cover" />
                              </div>
                              <span className="font-bold text-gray-900 text-sm truncate max-w-[150px]">{listing.title}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-500">
                            <Link to={`/profile/${listing.authorId}`} className="hover:text-orange-600 transition-colors">
                              {listing.authorName}
                            </Link>
                          </td>
                          <td className="px-6 py-4 text-sm font-black text-orange-600">{listing.price} MAD</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              listing.status === 'active' ? 'bg-[#006d2c]/10 text-[#006d2c]' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {listing.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              {listing.status === 'pending' && (
                                <>
                                  <button 
                                    onClick={() => handleApproveListing(listing)}
                                    className="p-2 text-[#006d2c] hover:bg-[#006d2c]/10 rounded-lg transition-colors"
                                    title="Approve and publish"
                                  >
                                    <CheckCircle2 className="w-5 h-5" />
                                  </button>
                                  <button 
                                    onClick={() => handleRejectListing(listing)}
                                    className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                    title="Reject listing"
                                  >
                                    <Ban className="w-5 h-5" />
                                  </button>
                                </>
                              )}
                              <button 
                                onClick={() => handleDeleteListing(listing.id)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete listing"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'health' && (
              <motion.div 
                key="health"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div className="p-6 border-b flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">Manage Health Posts</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <th className="px-6 py-4">Title</th>
                        <th className="px-6 py-4">Author</th>
                        <th className="px-6 py-4">Animal</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {healthPosts.map((post) => (
                        <tr key={post.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <span className="font-bold text-gray-900 text-sm truncate max-w-[200px] block">{post.title}</span>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-500">
                            <Link to={`/profile/${post.authorId}`} className="hover:text-orange-600 transition-colors">
                              {post.authorName}
                            </Link>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-500 capitalize">{post.animalType}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              post.status === 'active' ? 'bg-[#006d2c]/10 text-[#006d2c]' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {post.status || 'pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              {(post.status === 'pending' || !post.status) && (
                                <>
                                  <button 
                                    onClick={() => handleApproveHealthPost(post)}
                                    className="p-2 text-[#006d2c] hover:bg-[#006d2c]/10 rounded-lg transition-colors"
                                    title="Approve"
                                  >
                                    <CheckCircle2 className="w-5 h-5" />
                                  </button>
                                  <button 
                                    onClick={() => handleRejectHealthPost(post)}
                                    className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                    title="Reject"
                                  >
                                    <Ban className="w-5 h-5" />
                                  </button>
                                </>
                              )}
                              <button 
                                onClick={async () => {
                                  if (window.confirm('Delete this health post permanently?')) {
                                    try {
                                      await deleteDoc(doc(db, 'health_posts', post.id));
                                      toast.success('Post deleted');
                                      fetchHealthPosts();
                                    } catch (error) {
                                      toast.error('Failed to delete post');
                                    }
                                  }
                                }}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {healthPosts.length === 0 && (
                    <div className="p-20 text-center text-gray-400">
                      <Stethoscope className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p className="font-bold">No health posts found.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'users' && (
              <motion.div 
                key="users"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div className="p-6 border-b flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">Manage Users</h3>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input 
                      type="text" 
                      placeholder="Search users by name or email..." 
                      value={adminSearchTerm}
                      onChange={(e) => setAdminSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500" 
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <th className="px-6 py-4">User</th>
                        <th className="px-6 py-4">Email</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredAdminUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <Link to={`/profile/${u.id}`} className="flex items-center space-x-3 group">
                              <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 group-hover:ring-2 group-hover:ring-orange-500 transition-all">
                                {u.photoURL ? (
                                  <img 
                                    src={u.photoURL} 
                                    className="w-full h-full object-cover" 
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <Shield className="w-5 h-5 m-2.5 text-gray-300" />
                                )}
                              </div>
                              <span className="font-bold text-gray-900 text-sm group-hover:text-orange-600 transition-colors">{u.displayName}</span>
                            </Link>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-500">{u.email}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              u.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button 
                                onClick={() => handleToggleAdmin(u.id, u.role)}
                                className={`p-2 transition-colors rounded-lg ${u.role === 'admin' ? 'text-purple-600 hover:bg-purple-50' : 'text-gray-400 hover:bg-gray-50'}`}
                                title={u.role === 'admin' ? "Remove Admin Role" : "Make Admin"}
                              >
                                <Shield className="w-5 h-5" />
                              </button>
                              <button 
                                type="button"
                                onClick={() => handleToggleTrusted(u.id, u.isTrusted)}
                                className={`p-2 transition-colors rounded-lg ${u.isTrusted ? 'text-[#006d2c] hover:bg-[#006d2c]/10' : 'text-gray-400 hover:bg-gray-50'}`}
                                title={u.isTrusted ? "Remove Trusted Status" : "Mark as Trusted Seller"}
                              >
                                <BadgeCheck className="w-5 h-5" />
                              </button>
                              <button 
                                type="button"
                                onClick={() => handleContactUser(u)}
                                className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                title="Message User"
                              >
                                <MessageSquare className="w-5 h-5" />
                              </button>
                              <button 
                                type="button"
                                onClick={() => handleBanUser(u.id, u.disabled)}
                                className={`p-2 transition-colors rounded-lg ${u.disabled ? 'text-red-600 hover:bg-red-50' : 'text-gray-400 hover:bg-gray-50'}`}
                                title={u.disabled ? 'Unban User' : 'Ban User'}>
                                <Ban className="w-5 h-5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete User Permanently">
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'reports' && (
              <motion.div
                key="reports"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div className="p-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Content Moderation</h3>
                    <p className="text-sm text-gray-500">Manage reported listings and user complaints.</p>
                  </div>
                  <div className="flex bg-gray-50 p-1 rounded-xl">
                    {['pending', 'resolved', 'dismissed'].map((status) => (
                      <button
                        key={status}
                        onClick={() => setReportFilter(status)}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                          reportFilter === status 
                          ? 'bg-white text-orange-600 shadow-sm' 
                          : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  {reports.length === 0 ? (
                    <div className="p-20 text-center">
                      <AlertTriangle className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                      <p className="text-gray-500 font-medium text-sm">No {reportFilter} reports at the moment.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          <th className="px-6 py-4">Report</th>
                          <th className="px-6 py-4">Reported By</th>
                          <th className="px-6 py-4">Date</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {reports.map((report) => (
                          <tr key={report.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="max-w-xs">
                                <p className="text-sm font-bold text-gray-900 truncate">{report.listingTitle || 'Unknown Listing'}</p>
                                <p className="text-xs text-gray-500 line-clamp-2 mt-1 italic">"{report.reason}"</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-bold text-gray-900 block">{report.reportedByName || 'Anonymous'}</span>
                              <span className="text-[10px] font-mono text-gray-400">{report.reportedBy?.substring(0, 8)}...</span>
                            </td>
                            <td className="px-6 py-4 text-xs font-bold text-gray-500">
                              {report.createdAt?.toDate ? report.createdAt.toDate().toLocaleDateString() : 'Unknown'}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                {report.listingId && (
                                  <Link 
                                    to={`/listing/${report.listingId}`}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="View Reported Ad"
                                  >
                                    <ExternalLink className="w-5 h-5" />
                                  </Link>
                                )}
                                {report.status === 'pending' && (
                                  <>
                                    <button 
                                      onClick={() => handleUpdateReportStatus(report.id, 'resolved')} 
                                      className="p-2 text-[#006d2c] hover:bg-[#006d2c]/10 rounded-lg transition-colors"
                                      title="Resolve"
                                    >
                                      <CheckCircle2 className="w-5 h-5" />
                                    </button>
                                    <button 
                                      onClick={() => handleUpdateReportStatus(report.id, 'dismissed')} 
                                      className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                                      title="Dismiss"
                                    >
                                      <Ban className="w-5 h-5" />
                                    </button>
                                  </>
                                )}
                                <button 
                                  onClick={async () => {
                                    if(window.confirm('Delete this report record permanently?')) {
                                      await deleteDoc(doc(db, 'reports', report.id));
                                      fetchReports();
                                    }
                                  }}
                                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete Record"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
