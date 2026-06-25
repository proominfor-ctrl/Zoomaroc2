import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { db, collection, query, where, orderBy, limit, onSnapshot, doc, auth, getDocs } from '../firebase';
import { Search, MapPin, ChevronRight, LayoutGrid, PawPrint, ShoppingBag, Tractor, AlertCircle, Heart, HeartPulse, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import ListingCard from '../components/ListingCard';

const CATEGORIES = [
  { id: 'all', name: 'All', icon: LayoutGrid },
  { id: 'pet', name: 'Pet for sell', icon: PawPrint },
  { id: 'livestock', name: 'Livestock', icon: Tractor },
  { id: 'adoption', name: 'Pet for adoption (free)', icon: Heart },
  { id: 'accessory', name: 'Accessories', icon: ShoppingBag },
];

const DEFAULT_HERO_IMAGES = [
  'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=70&w=1200', // Puppies
  'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=70&w=1200', // Cat
  'https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&q=70&w=1200', // Livestock
  'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=70&w=1200', // Pets & Accessories
];

export default function Home({ initialCategory = 'all' }: { initialCategory?: string }) {
  const [listings, setListings] = useState<any[]>([]);
  const [couplingOffers, setCouplingOffers] = useState<any[]>([]);
  const [lostFoundPosts, setLostFoundPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState(initialCategory);
  const [location, setLocation] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heroImages, setHeroImages] = useState<string[]>(DEFAULT_HERO_IMAGES);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [translatedListings, setTranslatedListings] = useState<Record<string, { title: string; targetLang: string }>>({});
  const { t, i18n } = useTranslation();
  const user = auth.currentUser;

  useEffect(() => {
    setCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    console.log('📍 Home: Setting up listings listener');
    setLoading(true);
    setError(null);
    
    // Fetch all listings (limited to 100) to ensure we get data even if status is missing
    const q = query(
      collection(db, 'listings'),
      limit(100)
    );

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log('📍 Home: Listener fired! Got', snapshot.docs.length, 'listings');
        let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        
        // Client-side sorting: newest first
        data.sort((a: any, b: any) => {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return bTime - aTime;
        });

        console.log('📍 Home: Setting listings:', data.length);
        setListings(data);
        setLoading(false);
      },
      (error) => {
        console.error('❌ Home: Error fetching listings:', error);
        setError(error.message);
        setLoading(false);
      }
    );

    return () => {
      console.log('📍 Home: Unsubscribing from listener');
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, 'coupling_offers'),
      limit(4)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      // Client-side sort to avoid index requirements
      data.sort((a: any, b: any) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setCouplingOffers(data.filter(o => o.status === 'active'));
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, 'lost_and_found_posts'),
      limit(4)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      // Client-side sort to avoid index requirements
      data.sort((a: any, b: any) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setLostFoundPosts(data.filter(o => o.status === 'active'));
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Sync hero images from settings in real-time
    const unsubscribe = onSnapshot(doc(db, 'settings', 'hero'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.images && data.images.length > 0) {
          setHeroImages(data.images);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (heroImages.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 6000); // Change image every 6 seconds
    return () => clearInterval(timer);
  }, [heroImages.length]);

  const handleTranslateListing = async (listing: any) => {
    try {
      const fetchTranslation = async (text: string, target: string) => {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;
        const response = await fetch(url);
        const data = await response.json();
        return data[0].map((item: any) => item[0]).join('');
      };

      const sourceText = listing.title || listing.petName;
      if (!sourceText) return;

      const tTitle = await fetchTranslation(sourceText, i18n.language);
      setTranslatedListings(prev => ({ 
        ...prev, 
        [listing.id]: { title: tTitle, targetLang: i18n.language } 
      }));
    } catch (error) {
      console.error('Home translation failed for listing:', listing.id, error);
    }
  };

  // Generate pools for suggestions from current listings
  const keywordPool = Array.from(new Set(listings.flatMap(l => [
    l.title,
    l.breed,
    l.animalType
  ]).filter(val => typeof val === 'string' && val.length > 0)));

  const cityPool = Array.from(new Set(listings.map(l => l.location).filter(Boolean)));

  const filteredSearchSuggestions = searchTerm.trim() 
    ? keywordPool.filter(k => k.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 5)
    : [];

  const filteredLocationSuggestions = location.trim()
    ? cityPool.filter(c => c.toLowerCase().includes(location.toLowerCase())).slice(0, 5)
    : [];

  // Client-side filtering for category, search and location (doesn't require complex indexes)
  const filteredListings = listings.filter(listing => {
    const searchLower = searchTerm.trim().toLowerCase();
    const locationLower = location.trim().toLowerCase();
    const title = (listing.title || '').toLowerCase();
    const description = (listing.description || '').toLowerCase();
    const listingLocation = (listing.location || '').toLowerCase();
    const breed = (listing.breed || '').toLowerCase();
    const animalType = (listing.animalType || '').toLowerCase();

    // Category and Status filter: only show approved listings
    // Note: admins and authors can see their own pending posts in Home for preview
    const matchesCategory = (listing.status === 'active' || listing.authorId === user?.uid) && (
      category === 'all' || 
      (category === 'buy-sell' ? ['pet', 'livestock', 'accessory'].includes(listing.animalType) : listing.animalType === category)
    );
    
    // Search filter
    const matchesSearch = !searchLower || 
      title.includes(searchLower) || 
      description.includes(searchLower) ||
      breed.includes(searchLower) ||
      animalType.includes(searchLower);
    
    // Location filter
    const matchesLocation = !locationLower || 
      listingLocation.includes(locationLower);
    
    return matchesCategory && matchesSearch && matchesLocation;
  });

  // Automatic Translation Logic for Listings
  useEffect(() => {
    let active = true;
    const translateAll = async () => {
      // Find listings that need translation and aren't already translated to the current language
      const listingsToTranslate = filteredListings.filter(l => 
        (l.language || 'en') !== i18n.language && 
        translatedListings[l.id]?.targetLang !== i18n.language
      );

      const itemsToTranslate = [...listingsToTranslate, ...couplingOffers, ...lostFoundPosts].filter(o => 
        (o.language || 'en') !== i18n.language && 
        translatedListings[o.id]?.targetLang !== i18n.language
      );
      
      for (const item of itemsToTranslate) {
        if (!active) break;
        await handleTranslateListing(item);
      }
    };

    if (filteredListings.length > 0 || couplingOffers.length > 0) translateAll();
    return () => { active = false; };
  }, [filteredListings, couplingOffers, lostFoundPosts, i18n.language]);

  return (
    <div className="space-y-12">
      <Helmet>
        <title>Morocco's Animal Marketplace | Su9.ma</title>
        <meta name="description" content="Buy and sell pets, livestock, and accessories in Morocco. Find dogs, cats, sheep, and more on Su9.ma - the secure marketplace for animal lovers." />
        <meta property="og:title" content="Su9.ma - Animals Marketplace Morocco" />
        <meta property="og:description" content="Find your perfect companion. Browse thousands of listings for pets and livestock across Morocco." />
        <meta name="keywords" content="pets morocco, dogs for sale casablanca, sheep market morocco, animals marketplace" />
      </Helmet>

      {/* Hero Section (Elegant) */}
      <section className="relative h-[420px] rounded-3xl overflow-hidden bg-[var(--cream-50)] flex items-center justify-center text-center px-4">
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <AnimatePresence mode="wait">
            <motion.img
              key={currentSlide}
              src={heroImages[currentSlide]}
              alt=""
              loading={currentSlide === 0 ? 'eager' : 'lazy'}
              decoding="async"
              fetchPriority={currentSlide === 0 ? 'high' : 'auto'}
              sizes="(max-width: 768px) 100vw, 1200px"
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
              className="absolute inset-0 w-full h-full object-cover opacity-50"
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--cream-50)]" />
        </div>
        <div className="relative z-10 max-w-3xl w-full">
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-5xl font-extrabold text-[var(--navy-900)] tracking-tight mb-4"
            style={{fontFamily: 'Playfair Display, serif'}}
          >
            {t('home.heroTitle')} <br /> <span className="text-[var(--gold-500)] font-semibold">{t('home.heroSubtitle')}</span>
          </motion.h1>
          
          <motion.form 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            onSubmit={(e) => e.preventDefault()}
            className="bg-white p-3 rounded-2xl shadow-md flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-3 border border-gray-100"
          >
            <div className="relative flex-grow w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-400)] w-5 h-5" />
              <input 
                type="text" 
                placeholder={t('home.searchPlaceholder')}
                className="w-full pl-12 pr-4 py-3 bg-transparent border border-transparent rounded-xl focus:border-[var(--navy-700)] outline-none font-medium text-[var(--navy-900)]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setShowSearchDropdown(true)}
                onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
              />
              <AnimatePresence>
                {showSearchDropdown && filteredSearchSuggestions.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden z-50 text-left"
                  >
                    {filteredSearchSuggestions.map((suggestion, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setSearchTerm(suggestion);
                          setShowSearchDropdown(false);
                        }}
                        className="w-full px-6 py-3 hover:bg-gray-50 text-[var(--navy-900)] font-medium text-sm transition-colors flex items-center"
                      >
                        <Search className="w-3 h-3 mr-3 text-[var(--muted-400)]" />
                        {suggestion}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="relative w-full md:w-48">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-400)] w-5 h-5" />
              <input 
                type="text" 
                placeholder={t('home.locationPlaceholder')}
                className="w-full pl-12 pr-4 py-3 bg-transparent border border-transparent rounded-xl focus:border-[var(--navy-700)] outline-none font-medium text-[var(--navy-900)]"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onFocus={() => setShowLocationDropdown(true)}
                onBlur={() => setTimeout(() => setShowLocationDropdown(false), 200)}
              />
              <AnimatePresence>
                {showLocationDropdown && filteredLocationSuggestions.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden z-50 text-left"
                  >
                    {filteredLocationSuggestions.map((suggestion, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setLocation(suggestion);
                          setShowLocationDropdown(false);
                        }}
                        className="w-full px-6 py-3 hover:bg-gray-50 text-[var(--navy-900)] font-medium text-sm transition-colors flex items-center"
                      >
                        <MapPin className="w-3 h-3 mr-3 text-[var(--muted-400)]" />
                        {suggestion}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button 
              type="submit"
              className="w-full md:w-auto btn-primary px-6 py-3 rounded-lg"
              style={{borderColor: 'var(--gold-500)'}}
            >
              {t('home.searchButton')}
            </button>
          </motion.form>
        </div>
      </section>

      {/* Categories */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-gray-900 tracking-tight">{t('home.browseCategories')}</h2>
          <Link to="/" className="text-orange-600 font-bold text-sm flex items-center hover:underline">
            {t('home.viewAll')} <ChevronRight className="w-3 h-3 ml-1" />
          </Link>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center text-center space-y-2 group ${
                category === cat.id 
                ? 'border-orange-600 bg-orange-50 text-orange-600' 
                : 'border-gray-100 bg-white hover:border-orange-200 hover:bg-orange-50/50'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                category === cat.id ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-orange-100 group-hover:text-orange-600'
              }`}>
                <cat.icon className="w-5 h-5" />
              </div>
              <span className="font-bold text-xs tracking-tight">{t(`categories.${cat.id}`)}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Listings Grid */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">{t('home.latestListings')}</h2>
          <div className="flex items-center space-x-2 text-sm font-medium text-gray-500">
            <span>{t('home.showingResults', { count: filteredListings.length })}</span>
          </div>
        </div>

        <div className="min-h-[400px]">
          {error && (
            <div className="mb-8 p-6 bg-red-50 border border-red-100 rounded-3xl flex items-start space-x-4 text-red-700">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <div>
                <p className="font-bold">Database Error</p>
                <p className="text-sm opacity-90">{error.includes('permissions') ? 'You do not have permission to view this data. Please log in.' : 'Something went wrong while loading listings.'}</p>
                <p className="text-xs mt-2 font-mono bg-white/50 p-2 rounded">Check browser console for the Index Creation link.</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl h-80 animate-pulse border border-gray-100"></div>
              ))}
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {searchTerm.trim() || location.trim() || category !== 'all' ? (
                <motion.div
                  key="search-results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {filteredListings.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {filteredListings.map((listing) => (
                        <ListingCard 
                          key={listing.id}
                          listing={{
                            ...listing,
                            title: translatedListings[listing.id]?.targetLang === i18n.language 
                              ? translatedListings[listing.id].title 
                              : listing.title
                          }} 
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState t={t} />
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="categorized-view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-12"
                >
                  {lostFoundPosts.length > 0 && (
                    <section>
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center">
                          <AlertTriangle className="w-5 h-5 text-blue-600 mr-3" />
                          {t('nav.lostAndFound')}
                        </h3>
                        <Link to="/lost-and-found" className="text-orange-600 font-bold text-xs hover:underline">
                          {t('home.viewAll')}
                        </Link>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {lostFoundPosts.map(post => (
                          <Link to={`/lost-and-found`} key={post.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4 hover:shadow-md hover:border-blue-200 transition-all group">
                            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-gray-50">
                              <img src={post.images?.[0]} className="w-full h-full object-cover" alt={post.title} />
                            </div>
                            <div className="flex-grow">
                              <div className="flex items-center justify-between">
                                <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                                  {translatedListings[post.id]?.targetLang === i18n.language 
                                    ? translatedListings[post.id].title 
                                    : post.title}
                                </h4>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                  post.postType === 'lost' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                                }`}>
                                  {post.postType}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 font-medium mt-1">{post.location}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </section>
                  )}
                  {couplingOffers.length > 0 && (
                    <section>
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center">
                          <HeartPulse className="w-5 h-5 text-[#006d2c] mr-3" />
                          {t('coupling.title')}
                        </h3>
                        <Link to="/coupling" className="text-orange-600 font-bold text-xs hover:underline">
                          {t('home.viewAll')}
                        </Link>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {couplingOffers.map(offer => (
                          <ListingCard 
                            key={offer.id}
                            listing={{
                              ...offer,
                              title: translatedListings[offer.id]?.targetLang === i18n.language 
                                ? translatedListings[offer.id].title 
                                : offer.petName,
                              location: offer.city,
                              animalType: 'adoption', // Shows the Heart icon
                              price: offer.price || 0
                            }} 
                          />
                        ))}
                      </div>
                    </section>
                  )}

                  {[
                    { id: 'adoption', type: 'animalType', label: t('categories.adoption') },
                    { id: 'dog', type: 'pet', label: t('createListing.petTypes.dog') },
                    { id: 'cat', type: 'pet', label: t('createListing.petTypes.cat') },
                    { id: 'bird', type: 'pet', label: t('createListing.petTypes.bird') },
                    { id: 'livestock', type: 'animalType', label: t('categories.livestock') },
                    { id: 'accessory', type: 'animalType', label: t('categories.accessories') }
                  ].map(section => {
                    const sectionListings = listings.filter(l => 
                      (l.status === 'active') && 
                      (section.type === 'pet' ? l.petType === section.id : l.animalType === section.id)
                    ).slice(0, 4);

                    if (sectionListings.length === 0) return null;

                    return (
                      <section key={section.id}>
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center">
                            <span className="w-1.5 h-6 bg-orange-600 rounded-full mr-3"></span>
                            {section.label}
                          </h3>
                          <button 
                            onClick={() => {
                              if (section.type === 'animalType') setCategory(section.id);
                              else {
                                setCategory('pet');
                                setSearchTerm(section.id);
                              }
                            }}
                            className="text-orange-600 font-bold text-xs hover:underline"
                          >
                            {t('home.viewAll')}
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                          {sectionListings.map(listing => (
                            <ListingCard 
                              key={listing.id}
                              listing={{
                                ...listing,
                                title: translatedListings[listing.id]?.targetLang === i18n.language 
                                  ? translatedListings[listing.id].title 
                                  : listing.title
                              }} 
                            />
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </section>
    </div>
  );
}

function EmptyState({ t }: { t: any }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 text-gray-400 mb-4">
                    <Search className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">{t('home.noListingsFound')}</h3>
                  <p className="text-gray-500 mt-2">{t('home.adjustFilters')}</p>
    </motion.div>
  );
}
