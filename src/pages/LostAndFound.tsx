import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { db, collection, addDoc, onSnapshot, query, orderBy, Timestamp, User, doc, updateDoc, arrayUnion, arrayRemove, getDoc, deleteDoc } from '../firebase';
import { Heart, MessageCircle, UserPlus, UserCheck, Send, Sparkles, Search, Upload, X, Loader2, Languages, Edit2, Trash2, Reply, Clock, User as UserIcon, MapPin, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { uploadImage } from '../storage';

interface LostFoundPost {
  id: string;
  title: string;
  content: string;
  postType: 'lost' | 'found';
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
  location: string;
}

const MOROCCAN_CITIES = [
  "Agadir", "Al Hoceima", "Azrou", "Beni Mellal", "Benslimane", "Berkane", "Berrechid", 
  "Boujdour", "Boulemane", "Casablanca", "Chefchaouen", "Dakhla", "El Jadida", "El Kelaa des Sraghna", 
  "Errachidia", "Essaouira", "Fes", "Figuig", "Fquih Ben Salah", "Guelmim", "Guercif", 
  "Ifrane", "Inezgane", "Jerada", "Kenitra", "Khemisset", "Khenifra", "Khouribga", 
  "Ksar El Kebir", "Laayoune", "Larache", "Marrakech", "Martil", "Meknes", "Midelt", 
  "Mohammedia", "Nador", "Ouarzazate", "Ouazzane", "Oujda", "Rabat", "Safi", "Saidia", 
  "Salé", "Sefrou", "Settat", "Sidi Bennour", "Sidi Ifni", "Sidi Kacem", "Sidi Slimane", 
  "Skhirat", "Tan-Tan", "Tangier", "Taounate", "Taourirt", "Taroudant", "Taza", "Temara", 
  "Tetouan", "Tinghir", "Tiznit", "Youssoufia", "Zagora"
];

const PET_TYPES = ['dog', 'cat', 'bird', 'fish', 'sheep', 'other'];


interface Props {
  user: User | null;
}

function CommentList({ postId, user, isAdmin, onReply }: { postId: string; user: User | null; isAdmin: boolean; onReply: (name: string) => void }) {
  const { t } = useTranslation();
  const [comments, setComments] = useState<any[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'lost_and_found_posts', postId, 'comments'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [postId]);

  const handleLikeComment = async (commentId: string, likes: string[]) => {
    if (!user) return toast.error('Login to like');
    const commentRef = doc(db, 'lost_and_found_posts', postId, 'comments', commentId);
    const isLiked = (likes || []).includes(user.uid);
    
    await updateDoc(commentRef, {
      likes: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
    });
  };

  if (comments.length === 0) return null;

  return (
    <div className="mt-6 space-y-6 pl-4 border-l-2 border-gray-50">
      {comments.map((comment) => (
        <div key={comment.id} className="group">
          <div className="flex justify-between items-start">
            <div className="flex-grow">
              <Link to={`/profile/${comment.authorId}`} className="hover:text-blue-600 transition-colors">
                <span className="font-black text-xs text-gray-900 mr-2">{comment.authorName}</span>
              </Link>
              <p className="text-sm text-gray-600 mt-1">{comment.text}</p>
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
            <button onClick={() => onReply(comment.authorName)} className="flex items-center space-x-1 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-blue-600">
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
    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600 overflow-hidden border border-blue-50 group-hover:border-blue-300 transition-colors">
      {photo ? (
        <img src={photo} alt={fallbackName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        fallbackName ? fallbackName[0] : <UserIcon className="w-5 h-5" />
      )}
    </div>
  );
}

export default function LostAndFound({ user }: Props) {
  const { t, i18n } = useTranslation();
  const [posts, setPosts] = useState<LostFoundPost[]>([]);
  const [newPost, setNewPost] = useState({ title: '', content: '', animalType: 'dog', postType: 'lost' as 'lost' | 'found', location: '' });
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [images, setImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    const q = query(collection(db, 'lost_and_found_posts'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LostFoundPost));
      data.sort((a, b) => (b.approvedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0) - (a.approvedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0));
      setPosts(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const onDrop = (acceptedFiles: File[]) => {
    if (images.length + acceptedFiles.length > 4) {
      toast.error('Maximum 4 images allowed');
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
    if (!newPost.title || !newPost.content || !newPost.location) return toast.error('Fill in all required fields');
    if (images.length === 0) return toast.error('Please upload at least one image');

    setUploading(true);
    try {
      const imageUrls: string[] = [];
      for (const file of images) {
        const compressedBlob = await compressImage(file);
        const publicUrl = await uploadImage(compressedBlob, file.name, 'lost-found');
        imageUrls.push(publicUrl);
      }

      const postData = {
        title: newPost.title,
        content: newPost.content,
        animalType: newPost.animalType,
        postType: newPost.postType,
        location: newPost.location,
      };

      await addDoc(collection(db, 'lost_and_found_posts'), {
        ...postData,
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous',
        authorPhotoURL: currentUserData?.photoURL || user.photoURL || null,
        likes: [],
        images: imageUrls,
        createdAt: Timestamp.now(),
        language: i18n.language || 'en',
        status: 'pending'
      });
      toast.success(t('lostAndFound.postSuccess'));
      
      setImages([]);
      setNewPost({ title: '', content: '', animalType: 'dog', postType: 'lost', location: '' });
    } catch (error: any) {
      console.error('Failed to publish lost and found post:', error);
      toast.error(error?.message || 'Failed to publish post');
    } finally {
      setUploading(false);
    }
  };

  const handleLike = async (postId: string, likes: string[]) => {
    if (!user) return toast.error('Login to like posts');
    const postRef = doc(db, 'lost_and_found_posts', postId);
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

  const handleAddComment = async (post: LostFoundPost) => {
    if (!user) return toast.error('Login to comment');
    const text = commentText[post.id];
    if (!text?.trim()) return;

    try {
      const authorName = currentUserData?.displayName || user.displayName || 'Anonymous';

      await addDoc(collection(db, 'lost_and_found_posts', post.id, 'comments'), {
        text,
        authorId: user.uid,
        authorName: authorName,
        createdAt: Timestamp.now(),
        likes: []
      });

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
           (post.animalType || '').toLowerCase().includes(searchLower) ||
           (post.location || '').toLowerCase().includes(searchLower));
  });

  const toggleExpand = (postId: string) => {
    const next = new Set(expandedPosts);
    if (next.has(postId)) next.delete(postId);
    else next.add(postId);
    setExpandedPosts(next);
  };

  return (
    <div className="min-h-screen bg-blue-50/30 -mt-8 -mx-4 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">{t('lostAndFound.title')}</h1>
          <p className="text-gray-500 mt-2">{t('lostAndFound.subtitle')}</p>
        </div>

        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text"
            placeholder={t('lostAndFound.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all"
          />
        </div>

        {user && (
          <motion.form 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handlePublish}
            className="bg-white p-6 rounded-3xl shadow-sm border border-blue-100 mb-12 space-y-4"
          >
            <div className="flex items-center space-x-2 mb-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <h2 className="font-bold text-gray-900">{t('lostAndFound.createPost')}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input 
                placeholder={t('lostAndFound.postTitle')}
                value={newPost.title}
                onChange={e => setNewPost({...newPost, title: e.target.value})}
                className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select 
                value={newPost.postType}
                onChange={e => setNewPost({...newPost, postType: e.target.value as 'lost' | 'found'})}
                className="bg-gray-50 px-4 py-2 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="lost">{t('lostAndFound.status.lost')}</option>
                <option value="found">{t('lostAndFound.status.found')}</option>
              </select>
            </div>
            <textarea 
              placeholder={t('lostAndFound.postContent')}
              value={newPost.content}
              onChange={e => setNewPost({...newPost, content: e.target.value})}
              className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
            />

            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'
              }`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center">
                <Upload className="w-6 h-6 text-blue-600 mb-2" />
                <p className="text-sm font-bold text-gray-700">{t('createListing.photos')}</p>
                <p className="text-xs text-gray-400 mt-1">Up to 4 images</p>
              </div>
            </div>

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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select 
                value={newPost.animalType}
                onChange={e => setNewPost({...newPost, animalType: e.target.value})}
                className="bg-gray-50 px-4 py-2 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="dog">{t('createListing.petTypes.dog')}</option>
                <option value="cat">{t('createListing.petTypes.cat')}</option>
                <option value="bird">{t('createListing.petTypes.bird')}</option>
                <option value="fish">{t('createListing.petTypes.fish')}</option>
                <option value="sheep">{t('createListing.petTypes.sheep')}</option>
                <option value="other">{t('createListing.petTypes.other')}</option>
              </select>
              <select 
                value={newPost.location}
                onChange={e => setNewPost({...newPost, location: e.target.value})}
                className="bg-gray-50 px-4 py-2 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">{t('createListing.location')}</option>
                {MOROCCAN_CITIES.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end items-center">
              <button 
                type="submit" 
                disabled={uploading}
                className="bg-blue-600 text-white px-8 py-2 rounded-xl font-bold shadow-lg hover:shadow-blue-200 transition-all disabled:opacity-50 flex items-center"
              >
                {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {uploading ? 'Uploading...' : t('createListing.publish')}
              </button>
            </div>
          </motion.form>
        )}

        <div className="space-y-6">
          {filteredPosts.map((post) => (
            <motion.div 
              layout
              key={post.id}
              className="bg-white p-8 rounded-3xl shadow-sm border border-blue-50 hover:border-blue-100 transition-colors"
            >
              <div className="flex justify-between items-start mb-4">
                <Link to={`/profile/${post.authorId}`} className="flex items-center space-x-3 group">
                  <AuthorAvatar authorId={post.authorId} fallbackPhoto={post.authorPhotoURL} fallbackName={post.authorName} />
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-black text-gray-900 group-hover:text-blue-600 transition-colors">{post.authorName}</h3>
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
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    post.postType === 'lost' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                  }`}>
                    {t(`lostAndFound.status.${post.postType}`)}
                  </span>
                  {post.status === 'pending' && (
                    <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                      {t('health.pendingApproval')}
                    </span>
                  )}
                </div>
              </div>

              <h2 className="text-xl font-black text-gray-900 mb-2">
                {post.title}
              </h2>
              <div className="mb-6">
                <p 
                  className={`text-gray-600 leading-relaxed whitespace-pre-wrap ${
                    !expandedPosts.has(post.id) ? 'line-clamp-[10]' : ''
                  }`}
                  style={!expandedPosts.has(post.id) ? { display: '-webkit-box', WebkitLineClamp: 10, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : {}}
                >
                  {post.content || ''}
                </p>
                
                {post.content && (post.content.length > 500 || post.content.split('\n').length > 10) && (
                  <button 
                    onClick={() => toggleExpand(post.id)}
                    className="mt-2 text-blue-600 font-bold text-sm hover:underline"
                  >
                    {expandedPosts.has(post.id) ? t('health.showLess') : t('health.continueReading')}
                  </button>
                )}
              </div>

              {post.images && post.images.length > 0 && (
                <div className={`grid gap-2 mb-6 ${post.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {post.images.map((url, idx) => (
                    <div key={idx} className="relative aspect-video rounded-2xl overflow-hidden border border-blue-50 bg-gray-50">
                      <img 
                        src={url} 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between border-t border-gray-50 pt-4">
                <div className="flex items-center space-x-6">
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
                <div className="flex items-center text-sm font-bold text-gray-500">
                  <MapPin className="w-4 h-4 mr-2 text-blue-500" />
                  {post.location}
                </div>
              </div>

              <CommentList 
                postId={post.id} 
                user={user} 
                isAdmin={isAdmin} 
                onReply={(name) => setCommentText({...commentText, [post.id]: `@${name} `})} 
              />

              <div className="mt-4 flex items-center space-x-2">
                <input 
                  type="text"
                  placeholder={t('chat.typeMessage')}
                  value={commentText[post.id] || ''}
                  onChange={e => setCommentText({...commentText, [post.id]: e.target.value})}
                  className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button 
                  onClick={() => handleAddComment(post)}
                  className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
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
