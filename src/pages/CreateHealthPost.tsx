import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { db, collection, addDoc, Timestamp, User, doc, getDoc } from '../firebase';
import { toast } from 'sonner';
import { HeartPulse, ArrowLeft } from 'lucide-react';

interface Props { user: User; }

export default function CreateHealthPost({ user }: Props) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [animalType, setAnimalType] = useState('dog');
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) setProfile(snap.data());
    };
    fetchProfile();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.exists() ? userDoc.data() : null;

      await addDoc(collection(db, 'health_posts'), {
        title,
        content,
        animalType,
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous',
        authorPhotoURL: userData?.photoURL || user.photoURL || null,
        createdAt: Timestamp.now(),
        language: i18n.language,
        status: profile?.role === 'admin' ? 'active' : 'pending',
        approvedAt: profile?.role === 'admin' ? Timestamp.now() : null
      });
      toast.success(t('health.postSuccess'));
      navigate('/health');
    } catch (error) {
      toast.error('Failed to post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-green-50/30 -mt-8 -mx-4 px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 font-bold hover:text-green-600 mb-8 transition-colors">
          <ArrowLeft className="w-5 h-5 mr-2" /> {t('listingDetail.back')}
        </button>
        
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-green-100">
          <div className="flex items-center space-x-3 mb-8">
            <HeartPulse className="w-8 h-8 text-green-600" />
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">{t('health.shareExperience')}</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-2">{t('health.postTitle')}</label>
              <input 
                required value={title} onChange={(e) => setTitle(e.target.value)}
                className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-green-500 outline-none font-medium"
              />
            </div>

            <div>
              <label className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-2">{t('health.selectAnimal')}</label>
              <select 
                value={animalType} onChange={(e) => setAnimalType(e.target.value)}
                className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-green-500 outline-none font-bold appearance-none"
              >
                {['dog', 'cat', 'bird', 'fish', 'sheep', 'other'].map(type => (
                  <option key={type} value={type}>{t(`createListing.petTypes.${type}`)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-2">{t('health.postContent')}</label>
              <textarea 
                required rows={8} value={content} onChange={(e) => setContent(e.target.value)}
                className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-green-500 outline-none font-medium resize-none"
              />
            </div>

            <button disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white py-5 rounded-2xl font-black text-lg transition-all shadow-xl shadow-green-100 disabled:opacity-50">
              {loading ? 'Posting...' : t('health.shareExperience')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}