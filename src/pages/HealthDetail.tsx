import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { db, doc, onSnapshot, collection, query, orderBy, addDoc, Timestamp, updateDoc, arrayUnion, arrayRemove, getDoc, deleteDoc } from '../firebase';
import { ArrowLeft, User, Stethoscope, Clock, HeartPulse, Languages, Sparkles, MessageCircle, Send, Reply, Edit2, Trash2, Heart } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

function CommentList({ postId, user, isAdmin, onReply }: { postId: string; user: any; isAdmin: boolean; onReply: (name: string) => void }) {
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
              <Link to={`/profile/${comment.authorId}`} className="hover:text-green-600 transition-colors">
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

export default function HealthDetail({ user }: { user: any }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedContent, setTranslatedContent] = useState<{title: string, content: string} | null>(null);
  const [translatedLang, setTranslatedLang] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    if (user?.uid) {
      getDoc(doc(db, 'users', user.uid)).then(snap => {
        if (snap.exists()) setIsAdmin(snap.data().role === 'admin');
      });
    }
  }, [user?.uid]);

  const handleAddComment = async () => {
    if (!user) return toast.error('Login to comment');
    if (!commentText.trim()) return;

    try {
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      const authorName = userSnap.exists() ? userSnap.data().displayName : (user.displayName || 'Anonymous');

      await addDoc(collection(db, 'health_posts', id!, 'comments'), {
        text: commentText,
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
          message: `${authorName} commented on your post: "${commentText.substring(0, 30)}${commentText.length > 30 ? '...' : ''}"`,
          postId: post.id,
          read: false,
          createdAt: Timestamp.now()
        });
      }

      setCommentText('');
      toast.success('Comment added');
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  useEffect(() => {
    if (!id) return;

    const unsubscribe = onSnapshot(doc(db, 'health_posts', id), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const isAuthor = user?.uid === data.authorId;
        const isActive = data.status === 'active';

        if (!isActive && !isAuthor && !isAdmin) {
          toast.error('This health post is pending approval and is not yet public.');
          navigate('/health');
          return;
        }
        setPost({ id: snapshot.id, ...data });
      } else {
        toast.error('Post not found');
        navigate('/health');
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching post detail:", error);
      toast.error('Failed to load post');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id, navigate]);

  // Automatic Translation Logic
  useEffect(() => {
    if (post && post.language !== i18n.language) {
      handleTranslate();
    } else {
      setTranslatedContent(null);
      setTranslatedLang(null);
      setShowOriginal(true);
    }
  }, [post?.id, i18n.language, post?.language]);

  const handleTranslate = async () => {
    if (translatedContent && translatedLang === i18n.language) {
      setShowOriginal(!showOriginal);
      return;
    }

    setIsTranslating(true);
    try {
      // Helper function to call a translation service
      const fetchTranslation = async (text: string, target: string) => {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Translation service unavailable');
        const data = await response.json();
        return data[0].map((item: any) => item[0]).join('');
      };

      // Translate both the title and the main content
      const [translatedTitle, translatedBody] = await Promise.all([
        fetchTranslation(post.title, i18n.language),
        fetchTranslation(post.content, i18n.language)
      ]);

      setTranslatedContent({
        title: translatedTitle,
        content: translatedBody
      });
      setTranslatedLang(i18n.language);
      setShowOriginal(false);
      toast.success('Content translated');
    } catch (error) {
      console.error("Translation error:", error);
      toast.error('Translation failed');
    } finally {
      setIsTranslating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className="min-h-screen bg-green-50/30 -mt-8 -mx-4 px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-500 hover:text-green-600 font-bold mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          {t('listingDetail.back')}
        </button>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-green-100"
        >
          <div className="flex items-center justify-between mb-8">
            <span className="px-4 py-2 bg-green-50 text-green-600 rounded-xl text-xs font-black uppercase tracking-widest flex items-center">
              <Stethoscope className="w-4 h-4 mr-2" />
              {t(`createListing.petTypes.${post.animalType}`)}
            </span>
            <div className="flex items-center text-gray-400 text-sm font-medium">
              <Clock className="w-4 h-4 mr-1.5" />
              {post.createdAt?.toDate().toLocaleDateString()}
            </div>
          </div>

          {post.language && post.language !== i18n.language && (
            <button
              onClick={handleTranslate}
              disabled={isTranslating}
              className="mb-6 flex items-center space-x-2 px-4 py-2 bg-green-50 text-green-600 rounded-xl font-bold text-sm hover:bg-green-100 transition-all disabled:opacity-50"
            >
              {isTranslating ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-600/20 border-t-green-600 mr-2" />
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

          <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight mb-8">
            {!showOriginal && translatedContent ? translatedContent.title : post.title}
          </h1>
          <div className="flex items-center space-x-3 mb-12 p-4 bg-green-50/50 rounded-2xl w-fit border border-green-100">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-green-600 shadow-sm border border-green-50">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Author</p>
              <p className="text-sm font-bold text-gray-700">{post.authorName}</p>
            </div>
          </div>

          {post.images && post.images.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
              {post.images.map((url: string, idx: number) => (
                <div key={idx} className="relative aspect-video rounded-3xl overflow-hidden shadow-sm border border-green-50">
                  <img src={url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              ))}
            </div>
          )}

          <div className="prose prose-green max-w-none mb-12">
            <p className="text-gray-600 text-lg leading-relaxed whitespace-pre-wrap">
              {!showOriginal && translatedContent ? translatedContent.content : post.content}
            </p>
          </div>

          {/* Comments Section */}
          <div className="mt-12 pt-12 border-t border-gray-100">
            <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center">
              <MessageCircle className="w-6 h-6 mr-2 text-green-600" />
              {t('health.comment')}
            </h3>

            <CommentList 
              postId={post.id} 
              user={user} 
              isAdmin={isAdmin} 
              onReply={(name) => setCommentText(`@${name} `)} 
            />

            <div className="mt-8 flex items-center space-x-3">
              <input 
                type="text"
                placeholder={t('chat.typeMessage')}
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                className="flex-1 bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm outline-none focus:ring-2 focus:ring-green-500"
              />
              <button 
                onClick={handleAddComment}
                className="p-4 bg-green-600 text-white rounded-2xl hover:bg-green-700 transition-all shadow-lg shadow-green-100"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}