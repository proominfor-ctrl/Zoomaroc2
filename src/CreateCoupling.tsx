import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { db, collection, addDoc, Timestamp, auth, doc, getDoc } from './firebase';
import { uploadImage } from './storage';
import { toast } from 'sonner';
import { Camera, Upload, X, Heart, ArrowLeft, Loader2, Info, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDropzone } from 'react-dropzone';

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

export default function CreateCoupling() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [images, setImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [formData, setFormData] = useState({
    petName: '',
    petType: 'dog',
    breed: '',
    gender: 'male',
    age: '',
    city: '',
    description: '',
    targetBreed: '',
    price: 0
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!auth.currentUser) return;
      const snap = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (snap.exists()) setProfile(snap.data());
    };
    fetchProfile();
  }, []);

  const onDrop = (acceptedFiles: File[]) => {
    if (images.length + acceptedFiles.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }
    setImages(prev => [...prev, ...acceptedFiles]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 5,
    multiple: true
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return toast.error('Please login first');
    if (images.length === 0) return toast.error('Please upload at least one image');
    if (!formData.petName || !formData.city) return toast.error('Please fill required fields');

    setUploading(true);
    try {
      const imageUrls: string[] = [];
      for (const file of images) {
        const compressedBlob = await compressImage(file);
        const publicUrl = await uploadImage(compressedBlob, file.name, 'coupling');
        imageUrls.push(publicUrl);
      }

      await addDoc(collection(db, 'coupling_offers'), {
        ...formData,
        images: imageUrls,
        authorId: auth.currentUser.uid,
        authorName: auth.currentUser.displayName || 'Anonymous',
        createdAt: Timestamp.now(),
        status: profile?.role === 'admin' ? 'active' : 'pending',
        approvedAt: profile?.role === 'admin' ? Timestamp.now() : null,
        language: i18n.language
      });

      toast.success(t('coupling.success'));
      navigate('/coupling');
    } catch (error: any) {
      console.error('❌ Error creating coupling offer:', error);
      const errorMessage = error.message || 'Failed to post offer';

      if (errorMessage.toLowerCase().includes('permission-denied') || errorMessage.toLowerCase().includes('insufficient permissions')) {
        toast.error('Firestore Permission Error', {
          description: 'Your Firestore Security Rules are blocking this request. Please ensure the "coupling_offers" collection allows creation for authenticated users.',
          duration: 6000
        });
      } else if (errorMessage.includes('row-level security policy')) {
        toast.error('Storage Permission Error', {
          description: 'Check your Supabase RLS policies for the images bucket.'
        });
      } else if (error.name === 'TypeError' || !navigator.onLine) {
        toast.error('Network Error', {
          description: 'Check your internet connection and Supabase configuration.'
        });
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-500 hover:text-red-600 font-bold mb-8 transition-colors"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        {t('listingDetail.back')}
      </button>

      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center space-x-3 mb-10">
          <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600">
            <Heart className="w-6 h-6 fill-current" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">{t('coupling.postOffer')}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-2">{t('coupling.petName')}</label>
              <input 
                required
                value={formData.petName}
                onChange={e => setFormData({...formData, petName: e.target.value})}
                className="w-full px-5 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-medium"
              />
            </div>
            <div>
              <label className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-2">{t('coupling.petGender')}</label>
              <select 
                value={formData.gender}
                onChange={e => setFormData({...formData, gender: e.target.value})}
                className="w-full px-5 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold appearance-none"
              >
                <option value="male">{t('coupling.male')}</option>
                <option value="female">{t('coupling.female')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-2">{t('createListing.petType')}</label>
              <select 
                value={formData.petType}
                onChange={e => setFormData({...formData, petType: e.target.value})}
                className="w-full px-5 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-red-500 font-bold appearance-none"
              >
                <option value="dog">{t('createListing.petTypes.dog')}</option>
                <option value="cat">{t('createListing.petTypes.cat')}</option>
                <option value="bird">{t('createListing.petTypes.bird')}</option>
                <option value="sheep">{t('createListing.petTypes.sheep')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-2">{t('createListing.location')}</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select 
                  required
                  value={formData.city}
                  onChange={e => setFormData({...formData, city: e.target.value})}
                  className="w-full pl-12 pr-5 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-red-500 font-bold appearance-none"
                >
                  <option value="">Select City</option>
                  {MOROCCAN_CITIES.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-2">{t('createListing.price')} (MAD)</label>
              <input 
                type="number"
                value={formData.price}
                onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                className="w-full px-5 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-red-500 font-medium"
                placeholder="0 for free"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-2">{t('coupling.targetPet')} (Breed/Type)</label>
            <input 
              placeholder="e.g. Purebred Siberian Husky"
              value={formData.targetBreed}
              onChange={e => setFormData({...formData, targetBreed: e.target.value})}
              className="w-full px-5 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-red-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-2">{t('coupling.requirements')}</label>
            <textarea 
              rows={4}
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full px-5 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-red-500 font-medium resize-none"
            />
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-black text-gray-400 uppercase tracking-widest">{t('createListing.photos')}</label>
            <div {...getRootProps()} className="border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center cursor-pointer hover:bg-red-50/30 transition-all">
              <input {...getInputProps()} />
              <Upload className="w-10 h-10 text-red-600 mx-auto mb-4" />
              <p className="font-bold text-gray-900">{t('createListing.dragDrop')}</p>
            </div>
            
            <div className="flex flex-wrap gap-4">
              <AnimatePresence>
                {images.map((file, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative w-24 h-24 rounded-2xl overflow-hidden shadow-sm"
                  >
                    <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          <button 
            type="submit"
            disabled={uploading}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-5 rounded-3xl font-black text-xl transition-all shadow-xl shadow-red-100 disabled:opacity-50 flex items-center justify-center"
          >
            {uploading ? <Loader2 className="w-6 h-6 animate-spin mr-3" /> : <Heart className="w-6 h-6 mr-3 fill-current" />}
            {uploading ? 'Posting...' : t('createListing.publish')}
          </button>
        </form>
      </div>
    </div>
  );
}
