import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { db, collection, query, where, orderBy, onSnapshot, doc, updateDoc, User, writeBatch } from '../firebase';
import { Bell, CheckCircle2, Clock, MessageCircle, Heart, Stethoscope, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Props {
  user: User;
}

export default function Notifications({ user }: Props) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user.uid]);

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;

    const batch = writeBatch(db);
    unread.forEach(n => {
      batch.update(doc(db, 'notifications', n.id), { read: true });
    });

    try {
      await batch.commit();
      toast.success('All marked as read');
    } catch (error) {
      toast.error('Failed to update notifications');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'new_comment': return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'health_approved': return <Stethoscope className="w-5 h-5 text-green-500" />;
      case 'listing_approved': return <ShoppingBag className="w-5 h-5 text-orange-500" />;
      case 'like': return <Heart className="w-5 h-5 text-red-500" />;
      case 'coupling_response': return <Heart className="w-5 h-5 text-red-500" />;
      default: return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="flex items-center justify-between mb-8 px-4">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">{t('nav.notifications')}</h1>
        <button 
          onClick={markAllAsRead}
          className="text-sm font-bold text-orange-600 hover:underline flex items-center"
        >
          <CheckCircle2 className="w-4 h-4 mr-1" />
          Mark all as read
        </button>
      </div>

      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {notifications.map((n) => (
            <motion.div
              layout
              key={n.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => {
                if (n.listingId) navigate(`/listing/${n.listingId}`);
                if (n.postId) navigate(`/health/${n.postId}`);
                if (n.offerId) navigate(`/coupling/${n.offerId}`);
                updateDoc(doc(db, 'notifications', n.id), { read: true });
              }}
              className={`p-6 rounded-3xl border transition-all flex items-start space-x-4 cursor-pointer hover:bg-gray-50 ${
                n.read ? 'bg-white border-gray-100 opacity-70' : 'bg-orange-50 border-orange-100 shadow-sm'
              }`}
            >
              <div className="p-3 bg-white rounded-2xl shadow-sm">
                {getIcon(n.type)}
              </div>
              <div className="flex-grow">
                <h3 className="font-bold text-gray-900 mb-1">{n.title}</h3>
                <p className="text-sm text-gray-600 mb-2 leading-relaxed">{n.message}</p>
                <div className="flex items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <Clock className="w-3 h-3 mr-1" />
                  {n.createdAt?.toDate && formatDistanceToNow(n.createdAt.toDate(), { addSuffix: true })}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}