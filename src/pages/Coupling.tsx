import { useState, useEffect, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { db, collection, query, orderBy, onSnapshot, auth } from '../firebase';
import { Heart, MapPin, Plus, Search, Info, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

export default function Coupling() {
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [translatedOffers, setTranslatedOffers] = useState<Record<string, { petName: string; targetLang: string }>>({});
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = auth.currentUser;

  useEffect(() => {
    const q = query(collection(db, 'coupling_offers'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOffers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error('Coupling listener error:', error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredOffers = offers.filter(offer => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (offer.petType || '').toLowerCase().includes(searchLower) ||
      (offer.breed || '').toLowerCase().includes(searchLower) ||
      (offer.city || '').toLowerCase().includes(searchLower) ||
      (offer.petName || '').toLowerCase().includes(searchLower);
    
    const isVisible = offer.status === 'active' || offer.authorId === user?.uid;
    return isVisible && matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">
            {t('coupling.title')} <span className="text-red-600">Match</span>
          </h1>
          <p className="text-gray-500 mt-2">{t('coupling.subtitle')}</p>
        </div>
        <button 
          onClick={() => navigate('/coupling/create')}
          className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-2xl font-black text-lg transition-all shadow-xl hover:shadow-red-200 flex items-center justify-center"
        >
          <Plus className="w-6 h-6 mr-2" />
          {t('coupling.postOffer')}
        </button>
      </div>

      <div className="relative mb-12">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input 
          type="text"
          placeholder={t('health.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-red-500 font-medium transition-all"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-3xl h-96 animate-pulse border border-gray-100"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence>
            {filteredOffers.map((offer) => (
              <motion.div
                key={offer.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden group cursor-pointer"
                onClick={() => navigate(`/coupling/${offer.id}`)}
              >
                <div className="relative aspect-[4/5] overflow-hidden">
                  <img 
                    src={offer.images?.[0]} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                    alt={offer.breed}
                  />
                  {offer.status === 'pending' && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                      <span className="bg-orange-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl">
                        {t('coupling.pendingApproval')}
                      </span>
                    </div>
                  )}
                  <div className="absolute top-4 right-4 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-[10px] font-black uppercase tracking-widest text-red-600 shadow-sm">
                    {offer.gender === 'male' ? t('coupling.male') : t('coupling.female')}
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-black text-gray-900 truncate">{offer.petName}</h3>
                    <div className="flex flex-col items-end">
                      <div className="flex items-center text-red-600 font-black text-xs uppercase tracking-widest bg-red-50 px-2 py-1 rounded-lg mb-1">
                        <Heart className="w-3 h-3 mr-1 fill-current text-red-600" />
                        {offer.petType}
                      </div>
                      <span className="text-sm font-black text-red-600">
                        {offer.price > 0 ? `${offer.price} MAD` : 'FREE'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center text-gray-500 text-sm font-medium mb-4">
                    <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                    {offer.city}
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      {offer.createdAt?.toDate ? formatDistanceToNow(offer.createdAt.toDate(), { addSuffix: true }) : ''}
                    </span>
                    <div className="flex items-center text-xs font-bold text-gray-600">
                      <Info className="w-3.5 h-3.5 mr-1" />
                      {offer.targetBreed || 'Any Breed'}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}