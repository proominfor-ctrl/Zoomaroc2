import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { db, collection, addDoc, Timestamp, User, auth, doc, getDoc } from '../firebase';
import { toast } from 'sonner';
import { Upload, X, MapPin, Tag, ShoppingBag, Tractor, PawPrint, Info, DollarSign, Camera, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDropzone } from 'react-dropzone';
import { uploadImage } from '../storage';

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

const DOG_BREEDS = [
  "Belgian Malinois",
  "German Shepherd",
  "Dutch Shepherd",
  "Rottweiler",
  "Doberman Pinscher",
  "Beauceron",
  "Labrador Retriever",
  "English Springer Spaniel",
  "Beagle",
  "Bloodhound",
  "Cane Corso",
  "Tibetan Mastiff",
  "Kangal",
  "Great Pyrenees",
  "Other"
];

const listingSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(100),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000),
  price: z.number().min(0, 'Price must be positive'),
  animalType: z.enum(['pet', 'livestock', 'accessory', 'adoption']),
  petType: z.string().optional(),
  breed: z.string().optional(),
  otherBreed: z.string().optional(),
  ageValue: z.number().min(0, 'Age must be 0 or greater').optional(),
  ageUnit: z.enum(['days', 'weeks', 'months', 'years']).optional(),
  location: z.string().min(2, 'Location is required'),
  contactPreference: z.enum(['chat', 'phone', 'email']),
}).superRefine((data, ctx) => {
  // Require petType if animalType is 'pet' or 'adoption'
  if ((data.animalType === 'pet' || data.animalType === 'adoption') && !data.petType) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Pet type is required",
      path: ["petType"],
    });
  }

  // Require breed and age for Pet, Adoption, and Livestock categories
  if (data.animalType !== 'accessory') {
    if (!data.breed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Breed / Type is required",
        path: ["breed"],
      });
    }
    
    if (data.petType === 'dog' && data.breed === 'Other' && !data.otherBreed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please specify the breed",
        path: ["otherBreed"],
      });
    }

    if (data.ageValue === undefined || data.ageValue === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Age is required",
        path: ["ageValue"],
      });
    }
  }
});

type ListingForm = z.infer<typeof listingSchema>;

interface Props {
  user: User;
}

export default function CreateListing({ user }: Props) {
  const navigate = useNavigate();
  const [images, setImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [profile, setProfile] = useState<any>(null);
  const { t, i18n } = useTranslation();
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<ListingForm>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      animalType: 'pet',
      contactPreference: 'chat',
      price: 0,
      petType: '',
      ageValue: undefined,
      ageUnit: 'months'
    }
  });

  const selectedAnimalType = watch('animalType');
  const selectedPetType = watch('petType');
  const selectedBreed = watch('breed');

  useEffect(() => {
    const fetchProfile = async () => {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) setProfile(snap.data());
    };
    fetchProfile();
  }, [user.uid]);

  useEffect(() => {
    if (selectedAnimalType === 'adoption') {
      setValue('price', 0);
    }
  }, [selectedAnimalType, setValue]);

  const handleAIAssist = async () => {
    const values = watch();
    if (!values.animalType) {
      toast.error('Please select a category first');
      return;
    }

    if (!values.title || values.title.trim().length < 5) {
      toast.error('Please write a title first so the AI can help you better');
      return;
    }

    setIsGeneratingAI(true);
    try {
      // Simulate AI processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      const breedInfo = values.breed === 'Other' ? values.otherBreed : values.breed;
      const ageInfo = values.ageValue !== undefined ? `${values.ageValue} ${t(`createListing.ageUnits.${values.ageUnit}`)}` : '';
      const categoryLabel = t(`categories.${values.animalType}`);
      // Only use petType if the category is 'pet' to avoid mixing logic
      const breedLabel = breedInfo || (values.animalType === 'pet' ? values.petType : '') || categoryLabel;
      const currentLang = i18n.language;
      const userTitle = values.title;

      let suggestedDesc = '';
      const isDog = values.animalType === 'pet' && values.petType === 'dog';

      const templates: any = {
        ar: {
          pet: `أعرض لكم "${userTitle}". هذا الـ ${breedLabel}${ageInfo ? ' بعمر ' + ageInfo : ''} حيوان أليف ذكي، مطعم، وبصحة ممتازة. رفيق مثالي للعائلة.`,
          dog: `أعرض لكم "${userTitle}". هذا الـ ${breedLabel}${ageInfo ? ' بعمر ' + ageInfo : ''} ممتاز للحراسة والأمن، يتميز بالذكاء واليقظة، مطعم وبصحة جيدة جداً. رفيق مخلص ويقظ.`,
          livestock: `للبيع: "${userTitle}". ${breedLabel}${ageInfo ? ' بعمر ' + ageInfo : ''} من سلالة ممتازة، صحة جيدة ومثالي للتربية، التسمين أو الإنتاج الحيواني.`,
          adoption: `حالة تبني: "${userTitle}". ${breedLabel}${ageInfo ? ' بعمر ' + ageInfo : ''} يبحث عن منزل جديد. بصحة جيدة ويحتاج لعائلة تعتني به. التبني مجاني تماماً للهواة.`,
          accessory: `معروض للبيع: "${userTitle}". ${breedLabel}${ageInfo ? ' تم استخدامه لمدة ' + ageInfo : ''} في حالة جيدة جداً، نظيف وعملي وجاهز للاستخدام.`
        },
        fr: {
          pet: `Je vous propose "${userTitle}". Ce ${breedLabel}${ageInfo ? ' âgé de ' + ageInfo : ''} est en excellente santé, vacciné et très sociable. Un compagnon idéal pour votre foyer.`,
          dog: `Je vous propose "${userTitle}". Ce ${breedLabel}${ageInfo ? ' âgé de ' + ageInfo : ''} est excellent pour la garde et la sécurité. Intelligent, vigilant, vacciné et en parfaite santé. Un protecteur fidèle.`,
          livestock: `À vendre : "${userTitle}". Ce ${breedLabel}${ageInfo ? ' âgé de ' + ageInfo : ''} est issu d'une excellente lignée, en parfaite santé et idéal pour l'élevage ou la production.`,
          adoption: `Urgent - Adoption : "${userTitle}". Ce ${breedLabel}${ageInfo ? ' âgé de ' + ageInfo : ''} cherche une famille responsable. Santé certifiée. L'adoption est gratuite et solidaire.`,
          accessory: `À vendre : "${userTitle}". Cet accessoire (${breedLabel})${ageInfo ? ' utilisé pendant ' + ageInfo : ''} est très bien entretenu, fonctionnel et prêt pour un nouvel usage.`
        },
        en: {
          pet: `I am offering "${userTitle}". This ${breedLabel}${ageInfo ? ' aged ' + ageInfo : ''} is healthy, vaccinated, and very friendly. A perfect companion for any home.`,
          dog: `I am offering "${userTitle}". This ${breedLabel}${ageInfo ? ' aged ' + ageInfo : ''} is excellent for security and protection purposes. Intelligent, alert, fully vaccinated, and in top health.`,
          livestock: `For sale: "${userTitle}". This ${breedLabel}${ageInfo ? ' aged ' + ageInfo : ''} is from a high-quality lineage, healthy, and ideal for farming, breeding, or production.`,
          adoption: `Looking for a forever home: "${userTitle}". This ${breedLabel}${ageInfo ? ' aged ' + ageInfo : ''} is healthy and needs a loving owner. Available for free adoption to a good home.`,
          accessory: `Selling this ${breedLabel}: "${userTitle}". It's ${ageInfo ? 'been used for ' + ageInfo : 'in top condition'}, well-maintained, and ready for immediate use.`
        }
      };

      const langTemplates = templates[currentLang] || templates['en'];
      const baseDesc = isDog ? langTemplates.dog : (langTemplates[values.animalType] || langTemplates['pet']);
      
      if (currentLang === 'ar') {
        suggestedDesc = `${baseDesc}\n\nالموقع: ${values.location || 'المغرب'}\nالفئة: ${categoryLabel}\nالسعر: ${values.price} درهم\nالتواصل: ${values.contactPreference}`;
      } else if (currentLang === 'fr') {
        suggestedDesc = `${baseDesc}\n\nLocalisation : ${values.location || 'Maroc'}\nCatégorie : ${categoryLabel}\nPrix : ${values.price} MAD\nContact : ${values.contactPreference}`;
      } else {
        suggestedDesc = `${baseDesc}\n\nLocation: ${values.location || 'Morocco'}\nCategory: ${categoryLabel}\nPrice: ${values.price} MAD\nContact: ${values.contactPreference}`;
      }

      setValue('description', suggestedDesc);
      
      toast.success('AI suggestions applied! Feel free to customize.');
    } catch (error) {
      toast.error('Failed to generate suggestions');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const onDrop = (acceptedFiles: File[]) => {
    if (images.length + acceptedFiles.length > 10) {
      toast.error('Maximum 10 images allowed');
      return;
    }
    setImages(prev => [...prev, ...acceptedFiles]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 10,
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
          canvas.toBlob((blob) => {
            resolve(blob || file);
          }, 'image/jpeg', 0.7); // 70% quality jpeg
        };
      };
    });
  };

  const onSubmit = async (data: ListingForm) => {
    // Ensure user is still authenticated
    if (!auth.currentUser) {
      toast.error('Your session has expired. Please log in again.');
      navigate('/login');
      return;
    }

    if (images.length === 0) {
      toast.error('Please upload at least one image');
      return;
    }

    setUploading(true);
    console.log('🚀 Starting listing creation for user:', user.uid);
    
    try {
      // 1. Upload images to Supabase via backend API sequentially
      const imageUrls: string[] = [];
      setUploadProgress({ current: 0, total: images.length });

      for (let i = 0; i < images.length; i++) {
        const file = images[i];
        setUploadProgress({ current: i + 1, total: images.length });
        
        const compressedBlob = await compressImage(file);
        const publicUrl = await uploadImage(compressedBlob, file.name, 'listings');
        imageUrls.push(publicUrl);
      }

      if (imageUrls.length === 0) {
        throw new Error('No images were successfully uploaded. Please try again.');
      }

      console.log('✅ Images uploaded. Creating Firestore document...');

      // 2. Create listing in Firestore
      const { ageValue, ageUnit, otherBreed, ...formData } = data;
      const formattedAge = ageValue ? `${ageValue} ${t(`createListing.ageUnits.${ageUnit}`)}` : '';
      const finalBreed = (formData.breed === 'Other' && otherBreed) ? otherBreed : formData.breed;

      const listingData = {
        ...formData,
        breed: finalBreed,
        age: formattedAge,
        price: Number(formData.price),
        images: imageUrls,
        authorId: user.uid,
        authorName: profile?.displayName || user.displayName || 'Anonymous',
        authorPhotoURL: profile?.photoURL || user.photoURL || null,
        language: i18n.language,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        status: profile?.role === 'admin' ? 'active' : 'pending',
        approvedAt: profile?.role === 'admin' ? Timestamp.now() : null
      };

      const docRef = await addDoc(collection(db, 'listings'), listingData);
      console.log('🎉 Listing created successfully with ID:', docRef.id);
      
      toast.success('Listing published successfully!');
      navigate(`/listing/${docRef.id}`);
    } catch (error: any) {
      console.error('❌ Error creating listing:', error);
      const errorMessage = error.message || 'Failed to create listing';
      
      // Specific check for Supabase RLS violations
      if (errorMessage.includes('row-level security policy')) {
        toast.error('Storage Permission Error', {
          description: 'The storage service is blocking the upload. Please check your Supabase RLS policies.',
          duration: 8000
        });
      } else if (error.name === 'TypeError' || !navigator.onLine) {
        toast.error('Network Error', {
          description: 'Could not connect to Supabase Storage. Check your internet connection and Supabase configuration.',
          duration: 6000
        });
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-12">
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">{t('createListing.title')}</h1>
        <p className="text-gray-500 mt-2">{t('createListing.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Image Upload */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-2 mb-6">
            <Camera className="w-5 h-5 text-orange-600" />
            <h2 className="text-xl font-bold text-gray-900">{t('createListing.photos')}</h2>
          </div>
          
          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
              isDragActive ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/30'
            }`}
          >
            <input {...getInputProps()} />
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 text-orange-600 mb-4">
              <Upload className="w-8 h-8" />
            </div>
            <p className="text-lg font-bold text-gray-900">{t('createListing.dragDrop')}</p>
            <p className="text-gray-500 mt-1">{t('createListing.orClick')}</p>
          </div>

          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-8">
              <AnimatePresence>
                {images.map((file, index) => (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="relative aspect-square rounded-xl overflow-hidden group"
                  >
                    <img 
                      src={URL.createObjectURL(file)} 
                      alt="Preview" 
                      className="w-full h-full object-cover" 
                    />
                    <button 
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Basic Info */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center space-x-2 mb-6">
              <Info className="w-5 h-5 text-orange-600" />
              <h2 className="text-xl font-bold text-gray-900">{t('createListing.basicInfo')}</h2>
            </div>
            
            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-widest">{t('createListing.listingTitle')}</label>
            <input 
              {...register('title')}
              placeholder="e.g. Beautiful Golden Retriever Puppy"
              className={`w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-medium ${errors.title ? 'ring-2 ring-red-500' : ''}`}
            />
            {errors.title && <p className="text-red-500 text-sm mt-1 font-medium">{errors.title.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-widest">{t('createListing.category')}</label>
            <select 
              {...register('animalType')}
              className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-bold appearance-none"
            >
              <option value="pet">Pet for sell</option>
              <option value="livestock">Livestock</option>
              <option value="adoption">Pet for adoption (free)</option>
              <option value="accessory">Accessory</option>
            </select>
          </div>

          {(selectedAnimalType === 'pet' || selectedAnimalType === 'adoption') && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-widest">{t('createListing.petType')}</label>
              <select 
                {...register('petType')}
                className={`w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-bold appearance-none ${errors.petType ? 'ring-2 ring-red-500' : ''}`}
              >
                <option value="">{t('createListing.selectPetType')}</option>
                {PET_TYPES.map(type => (
                  <option key={type} value={type}>
                    {t(`createListing.petTypes.${type}`)}
                  </option>
                ))}
              </select>
              {errors.petType && <p className="text-red-500 text-sm mt-1 font-medium">{errors.petType.message}</p>}
            </div>
          )}

          {selectedAnimalType !== 'adoption' && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-widest">{t('createListing.price')}</label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input 
                  type="number"
                  {...register('price', { valueAsNumber: true })}
                  placeholder="0.00"
                  className={`w-full pl-12 pr-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-bold ${errors.price ? 'ring-2 ring-red-500' : ''}`}
                />
              </div>
              {errors.price && <p className="text-red-500 text-sm mt-1 font-medium">{errors.price.message}</p>}
            </div>
          )}

          {selectedAnimalType !== 'accessory' && (
            <>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-widest">{t('createListing.breed')}</label>
                {(selectedAnimalType === 'pet' || selectedAnimalType === 'adoption') && selectedPetType === 'dog' ? (
                  <div className="space-y-4">
                    <select 
                      {...register('breed')}
                      className={`w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-bold appearance-none ${errors.breed ? 'ring-2 ring-red-500' : ''}`}
                    >
                      <option value="">{t('createListing.selectBreed')}</option>
                      {DOG_BREEDS.map(breed => (
                        <option key={breed} value={breed}>{breed}</option>
                      ))}
                    </select>
                    
                    {selectedBreed === 'Other' && (
                      <input 
                        {...register('otherBreed')}
                        placeholder="Please specify the breed"
                        className={`w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-medium ${errors.otherBreed ? 'ring-2 ring-red-500' : ''}`}
                      />
                    )}
                  </div>
                ) : (
                  <input 
                    {...register('breed')}
                    placeholder="e.g. German Shepherd"
                    className={`w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-medium ${errors.breed ? 'ring-2 ring-red-500' : ''}`}
                  />
                )}
                {errors.breed && <p className="text-red-500 text-sm mt-1 font-medium">{errors.breed.message}</p>}
                {errors.otherBreed && <p className="text-red-500 text-sm mt-1 font-medium">{errors.otherBreed.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-widest">{t('createListing.age')}</label>
                <div className="flex space-x-2">
                  <input 
                    type="number"
                    {...register('ageValue', { valueAsNumber: true })}
                    placeholder="0"
                    className={`w-1/3 px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-bold ${errors.ageValue ? 'ring-2 ring-red-500' : ''}`}
                  />
                  <select 
                    {...register('ageUnit')}
                    className="w-2/3 px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-bold appearance-none"
                  >
                    <option value="days">{t('createListing.ageUnits.days')}</option>
                    <option value="weeks">{t('createListing.ageUnits.weeks')}</option>
                    <option value="months">{t('createListing.ageUnits.months')}</option>
                    <option value="years">{t('createListing.ageUnits.years')}</option>
                  </select>
                </div>
                {errors.ageValue && <p className="text-red-500 text-sm mt-1 font-medium">{errors.ageValue.message}</p>}
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-widest">{t('createListing.location')}</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select 
                {...register('location')}
                className={`w-full pl-12 pr-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-bold appearance-none ${errors.location ? 'ring-2 ring-red-500' : ''}`}
              >
                <option value="">Select City</option>
                {MOROCCAN_CITIES.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
            {errors.location && <p className="text-red-500 text-sm mt-1 font-medium">{errors.location.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-widest">{t('createListing.contactPreference')}</label>
            <select 
              {...register('contactPreference')}
              className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-bold appearance-none"
            >
              <option value="chat">In-app Chat</option>
              <option value="phone">Phone Call</option>
              <option value="email">Email</option>
            </select>
          </div>

          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-bold text-gray-700 uppercase tracking-widest">{t('createListing.description')}</label>
              <button
                type="button"
                onClick={handleAIAssist}
                disabled={isGeneratingAI}
                className="flex items-center space-x-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-xl font-bold text-sm hover:bg-orange-100 transition-all disabled:opacity-50"
              >
                {isGeneratingAI ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>{isGeneratingAI ? t('createListing.aiGenerating') : t('createListing.aiAssist')}</span>
              </button>
            </div>
            
            <textarea 
              {...register('description')}
              rows={5}
              placeholder="Describe the animal's personality, health, and history..."
              className={`w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-medium resize-none ${errors.description ? 'ring-2 ring-red-500' : ''}`}
            />
            {errors.description && <p className="text-red-500 text-sm mt-1 font-medium">{errors.description.message}</p>}
          </div>
        </div>

        <div className="flex items-center justify-end space-x-4 pt-8">
          <button 
            type="button" 
            onClick={() => navigate('/')}
            className="px-8 py-4 text-gray-500 font-bold hover:text-gray-900 transition-colors"
          >
            {t('createListing.cancel')}
          </button>
          <button 
            type="submit"
            disabled={uploading}
            className="bg-orange-600 hover:bg-orange-700 text-white px-12 py-4 rounded-2xl font-black text-lg transition-all shadow-xl hover:shadow-orange-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-3"></div>
                Uploading {uploadProgress.current} of {uploadProgress.total}...
              </>
            ) : t('createListing.publish')}
          </button>
        </div>
      </form>
    </div>
  );
}
