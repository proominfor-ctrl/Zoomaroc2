import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { db, collection, addDoc, onSnapshot, query, orderBy, Timestamp, User, doc, updateDoc, arrayUnion, arrayRemove, getDoc, deleteDoc } from '../firebase';
import { Heart, MessageCircle, UserPlus, UserCheck, Send, Sparkles, Search, Camera, Upload, X, Loader2, Languages, Edit2, Trash2, Reply, Clock, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { useDropzone } from 'react-dropzone';
import { supabase } from './supabase';
import { toast } from 'sonner';
import { uploadImage } from '../storage';

interface HealthPost {
  id: string;
  title: string;
  content: string;
  animalType: string;
  authorId: string;
  authorName: string;
  authorPhotoURL?: string;
  likes: string[];
  images?: string[];
  language?: string;
  status?: 'pending' | 'active' | 'rejected';
  approvedAt?: any;
  createdAt: any;
}

interface Props {
  user: User | null;
}

function CommentList({ postId, user, isAdmin, onReply }: { postId: string; user: User | null; isAdmin: boolean; onReply: (name: string) => void }) {
  const { t } = useTranslation();
  const [comments, setComments] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'health_posts', postId, 'comments'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [postId]);

  const handleLikeComment = async (commentId: string, likes: string[]) => {
    if (!user) return toast.error('Login to like');
    const commentRef = doc(db, 'health_posts', postId, 'comments', commentId);
    const isLiked = (likes || []).includes(user.uid);
    
    await updateDoc(commentRef, {
      likes: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
    });

    // Notify comment author
    if (!isLiked) {
      const commentSnap = await getDoc(commentRef);
      if (commentSnap.exists()) {
        const commentData = commentSnap.data();
        if (user.uid !== commentData.authorId) {
          await addDoc(collection(db, 'notifications'), {
            userId: commentData.authorId,
            type: 'comment_like',
            title: 'Comment Liked! ❤️',
            message: `${user.displayName || 'Someone'} liked your comment.`,
            postId: postId,
            read: false,
            createdAt: Timestamp.now()
          });
        }
      }
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (window.confirm('Delete this comment?')) {
      await deleteDoc(doc(db, 'health_posts', postId, 'comments', commentId));
      toast.success('Comment deleted');
    }
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editText.trim()) return;
    await updateDoc(doc(db, 'health_posts', postId, 'comments', commentId), {
      text: editText,
      updatedAt: Timestamp.now()
    });
    setEditingId(null);
    toast.success('Comment updated');
  };

  if (comments.length === 0) return null;

  return (
    <div className="mt-6 space-y-6 pl-4 border-l-2 border-gray-50">
      {comments.map((comment) => (
        <div key={comment.id} className="group">
          <div className="flex justify-between items-start">
            <div className="flex-grow">
              <Link to={`/profile/${comment.authorId}`} className="hover:text-orange-600 transition-colors">
                <span className="font-black text-xs text-gray-900 mr-2">{comment.authorName}</span>
              </Link>
              {editingId === comment.id ? (
                <div className="mt-2 flex items-center space-x-2">
                  <input 
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="flex-1 text-sm bg-gray-50 p-2 rounded-lg outline-none ring-1 ring-green-500"
                  />
                  <button onClick={() => handleUpdateComment(comment.id)} className="text-green-600 font-bold text-xs">Save</button>
                </div>
              ) : (
                <p className="text-sm text-gray-600 mt-1">{comment.text}</p>
              )}
            </div>
            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {(user?.uid === comment.authorId || isAdmin) && (
                <>
                  <button onClick={() => { setEditingId(comment.id); setEditText(comment.text); }} className="p-1 text-gray-400 hover:text-green-600"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDeleteComment(comment.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4 mt-2">
            <button 
              onClick={() => handleLikeComment(comment.id, comment.likes)}
              className={`flex items-center space-x-1 text-[10px] font-black uppercase tracking-widest ${(comment.likes || []).includes(user?.uid) ? 'text-red-500' : 'text-gray-400'}`}
            >
              <Heart className={`w-3 h-3 ${(comment.likes || []).includes(user?.uid) ? 'fill-current' : ''}`} />
              <span>{(comment.likes || []).length || ''} {t('health.like')}</span>
            </button>
            <button onClick={() => onReply(comment.authorName)} className="flex items-center space-x-1 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-green-600">
              <Reply className="w-3 h-3" />
              <span>{t('health.reply')}</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AuthorAvatar({ authorId, fallbackPhoto, fallbackName }: { authorId: string; fallbackPhoto?: string; fallbackName: string }) {
  const [photo, setPhoto] = useState<string | null>(fallbackPhoto || null);

  useEffect(() => {
    if (!authorId) return;
    // Reactive listener to the author's profile to get the latest photo
    const unsub = onSnapshot(doc(db, 'users', authorId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.photoURL) setPhoto(data.photoURL);
        else if (!fallbackPhoto) setPhoto(null);
      }
    });
    return () => unsub();
  }, [authorId, fallbackPhoto]);

  return (
    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center font-bold text-green-600 overflow-hidden border border-green-50 group-hover:border-green-300 transition-colors">
      {photo ? (
        <img src={photo} alt={fallbackName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        fallbackName ? fallbackName[0] : <UserIcon className="w-5 h-5" />
      )}
    </div>
  );
}

export default function Health({ user }: Props) {
  const { t, i18n } = useTranslation();
  const [posts, setPosts] = useState<HealthPost[]>([]);
  const [newPost, setNewPost] = useState({ title: '', content: '', animalType: 'dog' });
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [images, setImages] = useState<File[]>([]);
  const [translatedPosts, setTranslatedPosts] = useState<Record<string, { title: string; content: string; targetLang: string }>>({});
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [existingImages, setExistingImages] = useState<string[]>([]);

  useEffect(() => {
    // Sync user follow list
    if (user) {
      const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setCurrentUserData(data);
          setIsAdmin(data.role === 'admin');
        }
      });
      return () => unsub();
    }
  }, [user]);

  useEffect(() => {
    const q = query(collection(db, 'health_posts'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HealthPost));
      // Sort client-side by approval time (fallback to creation time)
      data.sort((a, b) => {
        const aTime = a.approvedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
        const bTime = b.approvedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });
      setPosts(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const onDrop = (acceptedFiles: File[]) => {
    if (images.length + acceptedFiles.length > 4) {
      toast.error('Maximum 4 images allowed for health posts');
      return;
    }
    setImages(prev => [...prev, ...acceptedFiles]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 4,
    multiple: true
  });

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleCancelEdit = () => {
    setNewPost({ title: '', content: '', animalType: 'dog' });
    setEditingPostId(null);
    setExistingImages([]);
    setImages([]);
  };

  const handleStartEdit = (post: HealthPost) => {
    setNewPost({ 
      title: post.title, 
      content: post.content, 
      animalType: post.animalType 
    });
    setEditingPostId(post.id);
    setExistingImages(post.images || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeletePost = async (postId: string) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        await deleteDoc(doc(db, 'health_posts', postId));
        toast.success('Post deleted successfully');
      } catch (error) {
        toast.error('Failed to delete post');
      }
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

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => resolve(blob || file), 'image/jpeg', 0.7);
        };
      };
    });
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error('Please login to publish');
    if (!newPost.title || !newPost.content) return toast.error('Fill in all fields');

    setUploading(true);
    try {
      const imageUrls: string[] = [];
      for (const file of images) {
        const compressedBlob = await compressImage(file);
        const publicUrl = await uploadImage(compressedBlob, file.name, 'health');
        imageUrls.push(publicUrl);
      }

      if (editingPostId) {
        const postRef = doc(db, 'health_posts', editingPostId);
        await updateDoc(postRef, {
          ...newPost,
          images: [...existingImages, ...imageUrls],
          status: 'pending',
          updatedAt: Timestamp.now()
        });
        setEditingPostId(null);
        setExistingImages([]);
        toast.success('Post updated and sent for re-approval');
      } else {
        await addDoc(collection(db, 'health_posts'), {
          ...newPost,
          authorId: user.uid,
          authorName: user.displayName || 'Anonymous',
          authorPhotoURL: currentUserData?.photoURL || user.photoURL || null,
          likes: [],
          images: imageUrls,
          createdAt: Timestamp.now(),
          language: i18n.language || 'en',
          status: 'pending'
        });
        toast.success(t('health.postSuccess'));
      }
      
      setImages([]);
      setNewPost({ title: '', content: '', animalType: 'dog' });
    } catch (error) {
      toast.error('Failed to publish post');
    } finally {
      setUploading(false);
    }
  };

  const handleTranslateFeedPost = async (post: HealthPost) => {
    if (translatedPosts[post.id] && translatedPosts[post.id].targetLang === i18n.language) {
      const updated = { ...translatedPosts };
      delete updated[post.id];
      setTranslatedPosts(updated);
      return;
    }

    setTranslatingId(post.id);
    try {
      const fetchTranslation = async (text: string, target: string) => {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;
        const response = await fetch(url);
        const data = await response.json();
        return data[0].map((item: any) => item[0]).join('');
      };

      const [tTitle, tContent] = await Promise.all([
        fetchTranslation(post.title, i18n.language),
        fetchTranslation(post.content, i18n.language)
      ]);

      setTranslatedPosts(prev => ({ 
        ...prev, 
        [post.id]: { title: tTitle, content: tContent, targetLang: i18n.language } 
      }));
    } catch (error) {
      toast.error('Translation failed');
    } finally {
      setTranslatingId(null);
    }
  };

  // Automatic Translation Logic for the Feed
  useEffect(() => {
    let active = true;
    const translateAll = async () => {
      const postsToTranslate = posts.filter(p => 
        p.status === 'active' &&
        p.language !== i18n.language && 
        translatedPosts[p.id]?.targetLang !== i18n.language
      );

      for (const post of postsToTranslate) {
        if (!active) break;
        await handleTranslateFeedPost(post);
      }
    };

    if (posts.length > 0) translateAll();
    return () => { active = false; };
  }, [posts, i18n.language]);

  const handleLike = async (postId: string, likes: string[]) => {
    if (!user) return toast.error('Login to like posts');
    const postRef = doc(db, 'health_posts', postId);
    const isLiked = (likes || []).includes(user.uid);
    
    try {
      await updateDoc(postRef, {
        likes: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });

      if (!isLiked && user.uid !== (posts.find(p => p.id === postId)?.authorId)) {
        const post = posts.find(p => p.id === postId);
        await addDoc(collection(db, 'notifications'), {
          userId: post?.authorId,
          type: 'post_like',
          title: 'New Like! ❤️',
          message: `${currentUserData?.displayName || user.displayName || 'Someone'} liked your post: "${post?.title}"`,
          postId: postId,
          read: false,
          createdAt: Timestamp.now()
        });
      }
    } catch (error) {
      toast.error('Operation failed');
    }
  };

  const handleFollow = async (targetUserId: string) => {
    if (!user) return toast.error('Login to follow users');
    if (user.uid === targetUserId) return toast.error("You can't follow yourself");

    const isFollowing = (currentUserData?.following || []).includes(targetUserId);
    const currentUserRef = doc(db, 'users', user.uid);
    const targetUserRef = doc(db, 'users', targetUserId);

    try {
      await updateDoc(currentUserRef, {
        following: isFollowing ? arrayRemove(targetUserId) : arrayUnion(targetUserId)
      });
      await updateDoc(targetUserRef, {
        followers: isFollowing ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
      
      if (!isFollowing) {
        await addDoc(collection(db, 'notifications'), {
          userId: targetUserId,
          type: 'new_follow',
          title: 'New Follower! 👤',
          message: `${currentUserData?.displayName || user.displayName || 'Someone'} started following you.`,
          read: false,
          createdAt: Timestamp.now()
        });
      }

      toast.success(isFollowing ? 'Unfollowed user' : 'Following user');
    } catch (error) {
      toast.error('Failed to update follow status');
    }
  };

  const handleAddComment = async (post: HealthPost) => {
    if (!user) return toast.error('Login to comment');
    const text = commentText[post.id];
    if (!text?.trim()) return;

    try {
      // Use the synced profile name for better consistency
      const authorName = currentUserData?.displayName || user.displayName || 'Anonymous';

      await addDoc(collection(db, 'health_posts', post.id, 'comments'), {
        text,
        authorId: user.uid,
        authorName: authorName,
        createdAt: Timestamp.now(),
        likes: []
      });

      // Send notification to post author if it's not the user's own post
      if (user.uid !== post.authorId) {
        await addDoc(collection(db, 'notifications'), {
          userId: post.authorId,
          type: 'new_comment',
          title: 'New Comment! 💬',
          message: `${authorName} commented on your post: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`,
          postId: post.id,
          read: false,
          createdAt: Timestamp.now()
        });
      }

      setCommentText({ ...commentText, [post.id]: '' });
      toast.success('Comment added');
    } catch (error: any) {
      toast.error('Failed to add comment');
    }
  };

  const filteredPosts = posts.filter(post => {
    const searchLower = searchTerm.toLowerCase();
    const isVisible = post.status === 'active' || post.authorId === user?.uid || isAdmin;
    return isVisible && ((post.title || '').toLowerCase().includes(searchLower) ||
           (post.content || '').toLowerCase().includes(searchLower) ||
           (post.animalType || '').toLowerCase().includes(searchLower));
  });

  const toggleExpand = (postId: string) => {
    const next = new Set(expandedPosts);
    if (next.has(postId)) next.delete(postId);
    else next.add(postId);
    setExpandedPosts(next);
  };

  return (
    <div className="min-h-screen bg-green-50/30 -mt-8 -mx-4 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">{t('health.title')}</h1>
          <p className="text-gray-500 mt-2">{t('health.subtitle')}</p>
        </div>

        {/* Search Bar */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text"
            placeholder={t('health.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-green-500 font-medium transition-all"
          />
        </div>

        {/* Publish Form */}
        {user && (
          <motion.form 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handlePublish}
            className="bg-white p-6 rounded-3xl shadow-sm border border-green-100 mb-12 space-y-4"
          >
            <div className="flex items-center space-x-2 mb-2">
              <Sparkles className="w-5 h-5 text-green-600" />
              <h2 className="font-bold text-gray-900">{t('health.shareExperience')}</h2>
            </div>
            <input 
              placeholder={t('health.postTitle')}
              value={newPost.title}
              onChange={e => setNewPost({...newPost, title: e.target.value})}
              className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-green-500"
            />
            <textarea 
              placeholder={t('health.postContent')}
              value={newPost.content}
              onChange={e => setNewPost({...newPost, content: e.target.value})}
              className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-green-500 min-h-[100px]"
            />

            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                isDragActive ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300 hover:bg-green-50/30'
              }`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center">
                <Upload className="w-6 h-6 text-green-600 mb-2" />
                <p className="text-sm font-bold text-gray-700">{t('createListing.photos')}</p>
                <p className="text-xs text-gray-400 mt-1">Up to 4 images</p>
              </div>
            </div>

            {existingImages.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {existingImages.map((url, index) => (
                  <div 
                    key={`existing-${index}`}
                    className="relative w-16 h-16 rounded-lg overflow-hidden group border border-green-100"
                  >
                    <img src={url} className="w-full h-full object-cover opacity-60" referrerPolicy="no-referrer" />
                    <button 
                      type="button"
                      onClick={() => removeExistingImage(url)}
                      className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-5 h-5 text-white bg-red-500 rounded-full p-0.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <AnimatePresence>
                  {images.map((file, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="relative w-16 h-16 rounded-lg overflow-hidden group"
                    >
                      <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-0.5 right-0.5 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            <div className="flex justify-between items-center">
              <select 
                value={newPost.animalType}
                onChange={e => setNewPost({...newPost, animalType: e.target.value})}
                className="bg-gray-50 px-4 py-2 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="dog">{t('createListing.petTypes.dog')}</option>
                <option value="cat">{t('createListing.petTypes.cat')}</option>
                <option value="bird">{t('createListing.petTypes.bird')}</option>
                <option value="sheep">{t('createListing.petTypes.sheep')}</option>
              </select>
              <div className="flex items-center space-x-3">
                {editingPostId && (
                  <button type="button" onClick={handleCancelEdit} className="text-gray-400 font-bold text-sm hover:text-gray-600">Cancel</button>
                )}
                <button 
                  type="submit" 
                  disabled={uploading}
                  className="bg-green-600 text-white px-8 py-2 rounded-xl font-bold shadow-lg hover:shadow-green-200 transition-all disabled:opacity-50 flex items-center"
                >
                  {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {uploading ? 'Uploading...' : editingPostId ? 'Update Post' : t('createListing.publish')}
                </button>
              </div>
            </div>
          </motion.form>
        )}

        {/* Posts List */}
        <div className="space-y-6">
          {filteredPosts.map((post) => (
            <motion.div 
              layout
              key={post.id}
              className="bg-white p-8 rounded-3xl shadow-sm border border-green-50 hover:border-green-100 transition-colors"
            >
              <div className="flex justify-between items-start mb-4">
                <Link to={`/profile/${post.authorId}`} className="flex items-center space-x-3 group">
                  <AuthorAvatar authorId={post.authorId} fallbackPhoto={post.authorPhotoURL} fallbackName={post.authorName} />
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-black text-gray-900 group-hover:text-green-600 transition-colors">{post.authorName}</h3>
                      {user?.uid === post.authorId && (
                        <div className="flex items-center space-x-1">
                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleStartEdit(post); }} className="p-1 text-gray-400 hover:text-green-600 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeletePost(post.id); }} className="p-1 text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">{post.animalType}</span>
                      <span className="text-gray-300">•</span>
                      <div className="flex items-center text-[10px] text-gray-400 font-bold">
                        <Clock className="w-3 h-3 mr-1" />
                        {post.approvedAt ? formatDistanceToNow(post.approvedAt.toDate(), { addSuffix: true }) : formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                </Link>
                
                <div className="flex items-center space-x-3">
                  {post.status === 'pending' && (
                    <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                      {t('health.pendingApproval')}
                    </span>
                  )}
                {user && user.uid !== post.authorId && (
                  <button 
                    onClick={() => handleFollow(post.authorId)}
                    className={`flex items-center space-x-1 px-4 py-1.5 rounded-full text-xs font-black transition-all ${
                      (currentUserData?.following || []).includes(post.authorId)
                        ? 'bg-gray-100 text-gray-500'
                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                    }`}
                  >
                    {(currentUserData?.following || []).includes(post.authorId) ? (
                      <><UserCheck className="w-3.5 h-3.5" /> <span>{t('health.following')}</span></>
                    ) : (
                      <><UserPlus className="w-3.5 h-3.5" /> <span>{t('health.follow')}</span></>
                    )}
                  </button>
                )}
                </div>
              </div>

              {post.language !== i18n.language && (
                <button
                  onClick={() => handleTranslateFeedPost(post)}
                  disabled={translatingId === post.id}
                  className="mb-4 flex items-center space-x-2 text-green-600 font-bold text-xs hover:underline disabled:opacity-50"
                >
                  {translatingId === post.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Languages className="w-3 h-3" />
                  )}
                  <span>
                    {translatingId === post.id 
                      ? t('health.translating') 
                      : translatedPosts[post.id] ? t('health.viewOriginal') : t('health.translateAction', { lang: i18n.language === 'ar' ? 'العربية' : i18n.language === 'fr' ? 'Français' : 'English' })}
                  </span>
                </button>
              )}

              <h2 className="text-xl font-black text-gray-900 mb-2">
                {translatedPosts[post.id]?.targetLang === i18n.language ? translatedPosts[post.id].title : post.title}
              </h2>
              <div className="mb-6">
                <p 
                  className={`text-gray-600 leading-relaxed whitespace-pre-wrap ${
                    !expandedPosts.has(post.id) ? 'line-clamp-[10]' : ''
                  }`}
                  style={!expandedPosts.has(post.id) ? { display: '-webkit-box', WebkitLineClamp: 10, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : {}}
                >
                  {translatedPosts[post.id]?.targetLang === i18n.language ? translatedPosts[post.id].content : (post.content || '')}
                </p>
                
                {post.content && (post.content.length > 500 || post.content.split('\n').length > 10) && (
                  <button 
                    onClick={() => toggleExpand(post.id)}
                    className="mt-2 text-green-600 font-bold text-sm hover:underline"
                  >
                    {expandedPosts.has(post.id) ? t('health.showLess') : t('health.continueReading')}
                  </button>
                )}
              </div>

              {post.images && post.images.length > 0 && (
                <div className={`grid gap-2 mb-6 ${post.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {post.images.map((url, idx) => (
                    <div key={idx} className="relative aspect-video rounded-2xl overflow-hidden border border-green-50 bg-gray-50">
                      <img 
                        src={url} 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center space-x-6 border-t border-gray-50 pt-4">
                <button 
                  onClick={() => handleLike(post.id, post.likes)}
                  className={`flex items-center space-x-2 font-bold transition-all ${
                    (post.likes || []).includes(user?.uid || '') ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${(post.likes || []).includes(user?.uid || '') ? 'fill-current' : ''}`} />
                  <span>{(post.likes || []).length}</span>
                </button>

                <div className="flex items-center space-x-2 text-gray-400 font-bold">
                  <MessageCircle className="w-5 h-5" />
                  <span>{t('health.comment')}</span>
                </div>
              </div>

              {/* Comments List */}
              <CommentList 
                postId={post.id} 
                user={user} 
                isAdmin={isAdmin} 
                onReply={(name) => setCommentText({...commentText, [post.id]: `@${name} `})} 
              />

              {/* Simple Comment Input */}
              <div className="mt-4 flex items-center space-x-2">
                <input 
                  type="text"
                  placeholder={t('chat.typeMessage')}
                  value={commentText[post.id] || ''}
                  onChange={e => setCommentText({...commentText, [post.id]: e.target.value})}
                  className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-green-500"
                />
                <button 
                  onClick={() => handleAddComment(post)} // Pass the full post object here
                  className="p-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
            </div>
    </div>
  );
}
