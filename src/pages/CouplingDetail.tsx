import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { db, collection, query, where, orderBy, onSnapshot, addDoc, Timestamp, auth, doc, getDoc, getDocs, deleteDoc, updateDoc } from '../firebase';
import { Heart, MapPin, Camera, Upload, X, ArrowLeft, Loader2, MessageCircle, User as UserIcon, Trash2, Languages, Sparkles, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useDropzone } from 'react-dropzone';
import { uploadImage } from '../storage';

export default function CouplingDetail({ user }: { user: any }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [offer, setOffer] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingResponse, setSendingResponse] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedContent, setTranslatedContent] = useState<{petName: string, description: string} | null>(null);
  const [translatedLang, setTranslatedLang] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(true);
  const [resImages, setResImages] = useState<File[]>([]);
  const [resData, setResData] = useState({ petName: '', breed: '', gender: 'male', description: '' });

  // Modal States
  const [selectedResponse, setSelectedResponse] = useState<any>(null);
  const [isEditingResponse, setIsEditingResponse] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    const unsubOffer = onSnapshot(doc(db, 'coupling_offers', id), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const isAuthor = user?.uid === data.authorId;
        const isActive = data.status === 'active';

        if (!isActive && !isAuthor) {
          toast.error('This offer is not currently public');
          navigate('/coupling');
          return;
        }
        setOffer({ id: snap.id, ...data });
      } else {
        navigate('/coupling');
      }
      setLoading(false);
    }, (error) => {
      console.error('Offer listener error:', error);
      setLoading(false);
    });

    // Removed orderBy from the server-side query to prevent "Missing Index" errors.
    // We now fetch all responses for this offer and sort them in the browser.
    const q = query(collection(db, 'coupling_responses'), where('offerId', '==', id));
    const unsubRes = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Client-side sorting: newest first
      data.sort((a: any, b: any) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });
      setResponses(data);
    }, (error) => {
      console.error('Responses listener error:', error);
    });

    return () => { unsubOffer(); unsubRes(); };
  }, [id, user?.uid]);

  // Automatic Translation Logic
  useEffect(() => {
    if (offer && (offer.language || 'en') !== i18n.language) {
      handleTranslate();
    } else {
      setTranslatedContent(null);
      setTranslatedLang(null);
      setShowOriginal(true);
    }
  }, [offer?.id, i18n.language, offer?.language]);

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

      const [translatedName, translatedDesc] = await Promise.all([
        fetchTranslation(offer.petName, i18n.language),
        fetchTranslation(offer.description, i18n.language)
      ]);

      setTranslatedContent({
        petName: translatedName,
        description: translatedDesc
      });
      setTranslatedLang(i18n.language);
      setShowOriginal(false);
      toast.success('Offer translated');
    } catch (error: any) {
      if (error.message.includes('Failed to fetch')) {
        toast.info('Translation service may be blocked by your browser extensions.');
      }
      console.error('Translation error:', error);
      toast.error('Translation failed');
    } finally {
      setIsTranslating(false);
    }
  };

  useEffect(() => {
    if (user?.uid) {
      getDoc(doc(db, 'users', user.uid)).then(snap => {
        if (snap.exists()) setIsAdmin(snap.data().role === 'admin');
      });
    }
  }, [user?.uid]);

  const handleDeleteOffer = async () => {
    if (!id || !offer) return;
    if (!window.confirm('Are you sure you want to delete this offer?')) return;

    try {
      await deleteDoc(doc(db, 'coupling_offers', id));
      toast.success('Offer removed successfully');
      navigate('/coupling');
    } catch (error) {
      console.error('Error deleting offer:', error);
      toast.error('Failed to remove offer');
    }
  };

  const handleAcceptResponse = async (response: any) => {
    if (!user || user.uid !== offer.authorId) return;
    
    setIsStartingChat(true);
    try {
      const chatsRef = collection(db, 'chats');
      const q = query(
        chatsRef,
        where('participants', 'array-contains', user.uid)
      );
      const snapshot = await getDocs(q);
      
      let existingChat = snapshot.docs.find(doc => 
        doc.data().participants.includes(response.authorId)
      );

      if (existingChat) {
        navigate(`/chat/${existingChat.id}`);
      } else {
        const respondentSnap = await getDoc(doc(db, 'users', response.authorId));
        const respondentData = respondentSnap.exists() ? respondentSnap.data() : {};

        const newChat = {
          participants: [user.uid, response.authorId],
          lastMessage: `Coupling Discussion: ${offer.petName} & ${response.petName}`,
          lastMessageAt: Timestamp.now(),
          unreadCount: {
            [user.uid]: 0,
            [response.authorId]: 1
          },
          participantDetails: {
            [user.uid]: { 
              displayName: user.displayName || 'Owner', 
              photoURL: user.photoURL || null 
            },
            [response.authorId]: { 
              displayName: response.authorName || 'Pet Owner', 
              photoURL: respondentData.photoURL || null 
            }
          },
          listingId: offer.id,
          listingTitle: `Coupling: ${offer.petName}`
        };
        const docRef = await addDoc(chatsRef, newChat);
        
        await addDoc(collection(db, `chats/${docRef.id}/messages`), {
          chatId: docRef.id,
          senderId: user.uid,
          text: `Hi ${response.authorName}, I've accepted your coupling response for ${offer.petName}. Let's discuss more details about our pets!`,
          createdAt: Timestamp.now()
        });

        navigate(`/chat/${docRef.id}`);
      }
    } catch (error: any) {
      console.error('Error starting chat:', error);
      toast.error('Failed to start discussion');
    } finally {
      setIsStartingChat(false);
    }
  };

  const onDrop = (files: File[]) => {
    if (resImages.length + files.length > 3) return toast.error('Max 3 images');
    setResImages(prev => [...prev, ...files]);
  };
  const { getRootProps, getInputProps } = useDropzone({ onDrop, accept: { 'image/*': [] } });

  const handleResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error('Please login');
    if (resImages.length === 0) return toast.error('Upload your pet photo');

    setSendingResponse(true);
    try {
      const imageUrls = [];
      for (const file of resImages) {
        const publicUrl = await uploadImage(file, file.name, 'coupling_res');
        imageUrls.push(publicUrl);
      }

      await addDoc(collection(db, 'coupling_responses'), {
        ...resData,
        offerId: id,
        images: imageUrls,
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous',
        createdAt: Timestamp.now()
      });

      // Notify the offer owner
      await addDoc(collection(db, 'notifications'), {
        userId: offer.authorId,
        type: 'coupling_response',
        title: 'New Coupling Interest! ❤️',
        message: `${user.displayName} is interested in coupling with ${offer.petName}.`,
        offerId: id,
        read: false,
        createdAt: Timestamp.now()
      });

      toast.success(t('coupling.responseSuccess'));
      setResImages([]);
      setResData({ petName: '', breed: '', gender: 'male', description: '' });
    } catch (err) {
      toast.error('Failed to send response');
    } finally {
      setSendingResponse(false);
    }
  };

  const handleDeleteResponse = async (e: React.MouseEvent, responseId: string) => {
    e.stopPropagation();
    if (!window.confirm('Delete your response?')) return;
    try {
      await deleteDoc(doc(db, 'coupling_responses', responseId));
      toast.success('Response deleted');
      if (selectedResponse?.id === responseId) setSelectedResponse(null);
    } catch (error) {
      toast.error('Failed to delete response');
    }
  };

  const handleUpdateResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResponse) return;
    
    setEditLoading(true);
    try {
      await updateDoc(doc(db, 'coupling_responses', selectedResponse.id), {
        petName: selectedResponse.petName,
        breed: selectedResponse.breed,
        gender: selectedResponse.gender,
        description: selectedResponse.description,
        updatedAt: Timestamp.now()
      });
      toast.success('Response updated');
      setIsEditingResponse(false);
    } catch (error) {
      toast.error('Failed to update response');
    } finally {
      setEditLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-orange-600" /></div>;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 font-bold hover:text-red-600 transition-colors">
          <ArrowLeft className="w-5 h-5 mr-2" /> {t('listingDetail.back')}
        </button>
        
        {(user?.uid === offer?.authorId || isAdmin) && (
          <button 
            onClick={handleDeleteOffer}
            className="flex items-center text-red-500 font-bold hover:text-red-700 transition-colors"
          >
            <Trash2 className="w-5 h-5 mr-2" />
            {t('listingDetail.removeAd')}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
        <div className="space-y-6">
          <div className="aspect-square rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
            <img src={offer.images[0]} className="w-full h-full object-cover" alt="" />
          </div>
          <div className="flex gap-4">
            {offer.images.slice(1).map((img: string, i: number) => (
              <img key={i} src={img} className="w-24 h-24 rounded-2xl object-cover border" alt="" />
            ))}
          </div>
        </div>

        <div className="space-y-8">
          <div>
            {(offer.language || 'en') !== i18n.language && (
              <button
                onClick={handleTranslate}
                disabled={isTranslating}
            className="mb-6 flex items-center space-x-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 transition-all disabled:opacity-50"
              >
                {isTranslating ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-600/20 border-t-red-600 mr-2" />
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
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                {!showOriginal && translatedContent ? translatedContent.petName : offer.petName}
              </h1>
              <span className="bg-red-100 text-red-600 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">
                {offer.gender === 'male' ? t('coupling.male') : t('coupling.female')}
              </span>
            </div>
            <div className="flex items-center text-gray-500 font-bold">
              <MapPin className="w-5 h-5 mr-2 text-red-600" /> {offer.city}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 p-6 bg-gray-50 rounded-3xl">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('coupling.petBreed')}</p>
              <p className="font-bold text-gray-900">{offer.breed || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('coupling.targetPet')}</p>
              <p className="font-bold text-red-600">{offer.targetBreed || 'Any'}</p>
            </div>
            <div className="mt-4 col-span-2">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('listingDetail.price')}</p>
              <p className="text-2xl font-black text-red-600">{offer.price > 0 ? `${offer.price} MAD` : 'FREE'}</p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-3">{t('coupling.requirements')}</h3>
            <p className="text-gray-600 leading-relaxed font-medium bg-white p-6 rounded-2xl border border-gray-100">
              {!showOriginal && translatedContent ? translatedContent.description : (offer.description || 'No specific requirements mentioned.')}
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-16">
        <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-12 flex items-center">
          <MessageCircle className="w-8 h-8 mr-3 text-red-600" />
          {t('coupling.viewResponses', { count: responses.length })}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {responses.map((res) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              key={res.id} 
              onClick={() => setSelectedResponse(res)}
              className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex gap-6 cursor-pointer hover:border-red-400 hover:shadow-md transition-all relative group z-10"
            >
              <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 border">
                <img src={res.images[0]} className="w-full h-full object-cover" alt="" />
              </div>
              <div className="flex-grow">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-black text-gray-900">{res.petName}</h4>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">{res.gender}</span>
                    {user?.uid === res.authorId && (
                      <div className="flex items-center space-x-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setSelectedResponse(res); setIsEditingResponse(true); }}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={(e) => handleDeleteResponse(e, res.id)} className="p-1 text-gray-400 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 font-bold mb-2">{res.breed}</p>
                <p className="text-sm text-gray-600 line-clamp-2 italic">"{res.description}"</p>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center text-[10px] font-bold text-gray-400">
                    <UserIcon className="w-3 h-3 mr-1" /> {res.authorName}
                  </div>
                  {user?.uid === offer?.authorId && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleAcceptResponse(res); }}
                      disabled={isStartingChat}
                      className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all flex items-center disabled:opacity-50"
                    >
                      {isStartingChat ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <MessageCircle className="w-3 h-3 mr-1" />}
                      {t('chat.startConversation')}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {user && user.uid !== offer.authorId && (
          <div className="bg-red-50/50 p-8 md:p-12 rounded-[40px] border border-red-100">
            <div className="max-w-2xl mx-auto">
              <h3 className="text-2xl font-black text-gray-900 mb-2">{t('coupling.respond')}</h3>
              <p className="text-gray-500 font-medium mb-8">{t('coupling.respondDesc')}</p>

              <form onSubmit={handleResponse} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input 
                    placeholder={t('coupling.petName')}
                    value={resData.petName}
                    onChange={e => setResData({...resData, petName: e.target.value})}
                    className="px-5 py-4 bg-white rounded-2xl border-none outline-none focus:ring-2 focus:ring-red-500 font-medium"
                    required
                  />
                  <input 
                    placeholder={t('coupling.petBreed')}
                    value={resData.breed}
                    onChange={e => setResData({...resData, breed: e.target.value})}
                    className="px-5 py-4 bg-white rounded-2xl border-none outline-none focus:ring-2 focus:ring-red-500 font-medium"
                    required
                  />
                  <select 
                    value={resData.gender}
                    onChange={e => setResData({...resData, gender: e.target.value})}
                    className="px-5 py-4 bg-white rounded-2xl border-none outline-none focus:ring-2 focus:ring-red-500 font-bold"
                  >
                    <option value="male">{t('coupling.male')}</option>
                    <option value="female">{t('coupling.female')}</option>
                  </select>
                </div>
                <textarea 
                  placeholder={t('coupling.myPetInfo')}
                  value={resData.description}
                  onChange={e => setResData({...resData, description: e.target.value})}
                  rows={3}
                  className="w-full px-5 py-4 bg-white rounded-2xl border-none outline-none focus:ring-2 focus:ring-red-500 font-medium resize-none"
                />

                <div className="space-y-4">
                  <div {...getRootProps()} className="border-2 border-dashed border-red-200 rounded-2xl p-6 text-center cursor-pointer hover:bg-white transition-all">
                    <input {...getInputProps()} />
                    <Camera className="w-6 h-6 text-red-600 mx-auto mb-2" />
                    <p className="text-sm font-bold text-gray-700">Add Pet Photos (Max 3)</p>
                  </div>
                  <div className="flex gap-2">
                    {resImages.map((file, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border">
                        <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="" />
                        <button type="button" onClick={() => setResImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-0 right-0 bg-red-500 text-white p-0.5"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={sendingResponse}
                  className="w-full bg-red-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-red-100 hover:bg-red-700 transition-all flex items-center justify-center disabled:opacity-50"
                >
                  {sendingResponse ? <Loader2 className="animate-spin mr-2" /> : <Heart className="w-5 h-5 mr-2 fill-current" />}
                  {t('coupling.respond')}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Response Detail / Edit Modal */}
      <AnimatePresence>
        {selectedResponse && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-8 border-b flex items-center justify-between">
                <h3 className="text-2xl font-black text-gray-900">
                  {isEditingResponse ? 'Edit Response' : 'Response Details'}
                </h3>
                <button onClick={() => { setSelectedResponse(null); setIsEditingResponse(false); }} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto">
                {isEditingResponse ? (
                  <form onSubmit={handleUpdateResponse} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input 
                        value={selectedResponse.petName}
                        onChange={e => setSelectedResponse({...selectedResponse, petName: e.target.value})}
                        className="px-5 py-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Pet Name"
                      />
                      <input 
                        value={selectedResponse.breed}
                        onChange={e => setSelectedResponse({...selectedResponse, breed: e.target.value})}
                        className="px-5 py-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Breed"
                      />
                    </div>
                    <select 
                      value={selectedResponse.gender}
                      onChange={e => setSelectedResponse({...selectedResponse, gender: e.target.value})}
                      className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                    <textarea 
                      value={selectedResponse.description}
                      onChange={e => setSelectedResponse({...selectedResponse, description: e.target.value})}
                      rows={4}
                      className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-red-500 resize-none"
                      placeholder="Description"
                    />
                    <div className="flex space-x-4">
                      <button type="button" onClick={() => setIsEditingResponse(false)} className="flex-1 py-4 font-bold text-gray-500">Cancel</button>
                      <button type="submit" disabled={editLoading} className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-black shadow-lg">
                        {editLoading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-8">
                    <div className="grid grid-cols-3 gap-4">
                      {selectedResponse.images?.map((url: string, i: number) => (
                        <img key={i} src={url} className="aspect-square rounded-2xl object-cover border" alt="" />
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Pet Name</p>
                        <p className="font-bold text-gray-900">{selectedResponse.petName}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Breed</p>
                        <p className="font-bold text-gray-900">{selectedResponse.breed}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Information</p>
                      <p className="text-gray-600 leading-relaxed bg-gray-50 p-6 rounded-2xl italic">"{selectedResponse.description}"</p>
                    </div>
                    <div className="flex items-center justify-between pt-6 border-t">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <UserIcon className="w-5 h-5 text-gray-400" />
                        </div>
                        <span className="font-bold text-gray-900">{selectedResponse.authorName}</span>
                      </div>
                      {user?.uid === selectedResponse.authorId && (
                        <button onClick={() => setIsEditingResponse(true)} className="text-red-600 font-bold flex items-center">
                          <Edit2 className="w-4 h-4 mr-2" /> Edit Details
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
