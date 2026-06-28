import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { HelmetProvider } from 'react-helmet-async';
import './i18n';
import { onAuthStateChanged, User, db, collection, query, where, onSnapshot } from './firebase';
import { auth } from './firebase';
import { Toaster, toast } from 'sonner';
import { Mail, MapPin, Facebook, Instagram, Twitter, MessageSquare, PlusCircle, Languages, Heart, Stethoscope, AlertTriangle } from 'lucide-react';

// Pages
import Home from './pages/Home';
const Login = lazy(() => import('./pages/Login'));
const Profile = lazy(() => import('./pages/Profile'));
const CreateListing = lazy(() => import('./pages/CreateListing'));
const ListingDetail = lazy(() => import('./pages/ListingDetail'));
const Chat = lazy(() => import('./pages/Chat'));
const Admin = lazy(() => import('./pages/Admin'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Safety = lazy(() => import('./pages/Safety'));
const Health = lazy(() => import('./pages/Health'));
const CreateHealthPost = lazy(() => import('./pages/CreateHealthPost'));
const HealthDetail = lazy(() => import('./pages/HealthDetail'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Coupling = lazy(() => import('./pages/Coupling'));
const CreateCoupling = lazy(() => import('./CreateCoupling'));
const CouplingDetail = lazy(() => import('./pages/CouplingDetail'));
const LostAndFound = lazy(() => import('./pages/LostAndFound'));

// Components
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';
import Logo from './components/Logo';

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-orange-500" />
    </div>
  );
}

function AuthGuard({ children }: { children: JSX.Element }) {
  const { user, authReady } = useAuth();
  const location = useLocation();

  if (!authReady) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsCount, setNotificationsCount] = useState(0);
  const { t, i18n } = useTranslation();
  const isInitialNotificationsLoad = useRef(true);

  // Handle RTL layout for Arabic
  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Global listener for unread messages
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(
      q, 
      (snapshot) => {
        const total = snapshot.docs.reduce((acc, docSnap) => {
          const data = docSnap.data();
          return acc + (data.unreadCount?.[user.uid] || 0);
        }, 0);
        setUnreadCount(total);
      },
      (error) => console.error("Unread messages listener error:", error)
    );

    return () => unsubscribe();
  }, [user]);

  // Notification listener
  useEffect(() => {
    if (!user) {
      setNotificationsCount(0);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(
      q, 
      (snapshot) => {
        setNotificationsCount(snapshot.size);
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added' && !isInitialNotificationsLoad.current) {
            const notification = change.doc.data();
            toast.success(notification.title, {
              description: notification.message,
            });
            // Temporarily comment out marking as read to ensure notifications are received
            // updateDoc(doc(db, 'notifications', change.doc.id), { read: true });
          }
        });
        isInitialNotificationsLoad.current = false;
      },
      (error) => console.error("Notifications listener error:", error)
    );

    return () => unsubscribe();
  }, [user]);

  return (
    <ErrorBoundary>
      <HelmetProvider>
        <Router>
          <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <Navbar user={user} unreadCount={unreadCount} notificationsCount={notificationsCount} />
            <main className="flex-grow container mx-auto px-4 py-8">
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/buy-sell" element={<Home initialCategory="buy-sell" />} />
                  <Route path="/adoption" element={<Home initialCategory="adoption" />} />
                  <Route path="/login" element={!authReady ? <PageLoader /> : !user ? <Login /> : <Navigate to="/" />} />
                  <Route path="/profile" element={<AuthGuard><Profile user={user} /></AuthGuard>} />
                  <Route path="/profile/:userId" element={<Profile user={user} />} />
                  <Route path="/create" element={<AuthGuard><CreateListing user={user!} /></AuthGuard>} />
                  <Route path="/listing/:id" element={<ListingDetail user={user} />} />
                  <Route path="/chat" element={<AuthGuard><Chat user={user!} /></AuthGuard>} />
                  <Route path="/chat/:chatId" element={<AuthGuard><Chat user={user!} /></AuthGuard>} />
                  <Route path="/admin" element={<AuthGuard><Admin user={user!} /></AuthGuard>} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/safety" element={<Safety />} />
                  <Route path="/health" element={<Health user={user} />} />
                  <Route path="/health/:id" element={<HealthDetail user={user} />} />
                  <Route path="/health/create" element={<AuthGuard><CreateHealthPost user={user!} /></AuthGuard>} />
                  <Route path="/notifications" element={<AuthGuard><Notifications user={user!} /></AuthGuard>} />
                  <Route path="/coupling" element={<Coupling />} />
                  <Route path="/coupling/create" element={<AuthGuard><CreateCoupling /></AuthGuard>} />
                  <Route path="/coupling/:id" element={<CouplingDetail user={user} />} />
                  <Route path="/lost-and-found" element={<LostAndFound user={user} />} />
                </Routes>
              </Suspense>
            </main>

          {/* Enhanced Footer */}
          <footer className="bg-white border-t mt-auto">
            <div className="container mx-auto px-4 pt-16 pb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
                {/* Brand Column */}
                <div className="space-y-6">
                  <Link to="/" className="flex items-center space-x-2">
                    <Logo className="text-3xl" />
                  </Link>
                  <p className="text-gray-500 text-sm leading-relaxed font-medium">
                    {t('footer.description')}
                  </p>
                  <div className="flex items-center space-x-4">
                    <a href="https://www.facebook.com/profile.php?id=61591265847297" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-all">
                      <Facebook className="w-5 h-5" />
                    </a>
                    <a href="#" className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-all">
                      <Instagram className="w-5 h-5" />
                    </a>
                    <a href="#" className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-all">
                      <Twitter className="w-5 h-5" />
                    </a>
                  </div>
                </div>

                {/* Browse Column */}
                <div>
                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6">{t('footer.browse')}</h4>
                  <ul className="space-y-4">
                    <li>
                      <Link to="/buy-sell" className="text-gray-500 hover:text-orange-600 font-bold text-sm transition-colors">
                        {t('nav.buySell')}
                      </Link>
                    </li>
                    <li>
                      <Link to="/adoption" className="text-gray-500 hover:text-orange-600 font-bold text-sm transition-colors">
                        {t('nav.adoption')}
                      </Link>
                    </li>
                    <li>
                      <Link to="/coupling" className="text-gray-500 hover:text-orange-600 font-bold text-sm transition-colors">
                        {t('nav.coupling')}
                      </Link>
                    </li>
                  </ul>
                </div>

                {/* Quick Links Column */}
                <div>
                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6">{t('footer.quickLinks')}</h4>
                  <ul className="space-y-4">
                    <li>
                      <Link to="/lost-and-found" className="text-gray-500 hover:text-blue-600 font-bold text-sm transition-colors flex items-center rtl:space-x-reverse">
                        <AlertTriangle className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0 text-blue-500" /> {t('nav.lostAndFound')}
                      </Link>
                    </li>
                    <li>
                      <Link to="/create" className="text-gray-500 hover:text-orange-600 font-bold text-sm transition-colors flex items-center rtl:space-x-reverse">
                        <PlusCircle className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" /> {t('nav.postAd')}
                      </Link>
                    </li>
                    <li>
                      <Link to="/coupling" className="text-gray-500 hover:text-red-600 font-bold text-sm transition-colors flex items-center rtl:space-x-reverse">
                        <Heart className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0 text-red-500" /> {t('nav.coupling')}
                      </Link>
                    </li>
                    <li>
                      <Link to="/health" className="text-gray-500 hover:text-green-600 font-bold text-sm transition-colors flex items-center rtl:space-x-reverse">
                        <Stethoscope className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0 text-green-500" /> {t('nav.health')}
                      </Link>
                    </li>
                    <li>
                      <Link to="/profile" className="text-gray-500 hover:text-orange-600 font-bold text-sm transition-colors">{t('nav.profile')}</Link>
                    </li>
                    <li>
                      <Link to="/chat" className="text-gray-500 hover:text-orange-600 font-bold text-sm transition-colors flex items-center relative rtl:space-x-reverse">
                        <MessageSquare className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" /> {t('nav.messages')}
                        {unreadCount > 0 && <span className="ml-2 w-2 h-2 bg-orange-600 rounded-full animate-pulse"></span>}
                      </Link>
                    </li>
                    <li>
                      <Link to="/login" className="text-gray-500 hover:text-orange-600 font-bold text-sm transition-colors">{t('nav.login')}</Link>
                    </li>
                  </ul>
                </div>

                {/* Support Column */}
                <div>
                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6">{t('footer.support')}</h4>
                  <ul className="space-y-4">
                    <li className="flex items-start space-x-3 text-sm">
                      <Mail className="w-5 h-5 text-orange-600 flex-shrink-0" />
                      <span className="text-gray-500 font-medium">Contact@su9.ma</span>
                    </li>
                    <li className="flex items-start space-x-3 text-sm">
                      <MapPin className="w-5 h-5 text-orange-600 flex-shrink-0" />
                      <span className="text-gray-500 font-medium">Casablanca, Morocco</span>
                    </li>
                  </ul>

                  {/* Language Switcher moved to Footer */}
                  <div className="mt-8 pt-8 border-t border-gray-50">
                    <div className="flex items-center space-x-2 mb-4 text-gray-400">
                      <Languages className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">{t('footer.language')}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { code: 'en', label: 'English' },
                        { code: 'fr', label: 'Français' },
                        { code: 'ar', label: 'العربية' }
                      ].map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => i18n.changeLanguage(lang.code)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                            i18n.language === lang.code 
                            ? 'bg-orange-600 text-white shadow-lg shadow-orange-100' 
                            : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                          }`}
                        >
                          {lang.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-gray-50 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                  &copy; {new Date().getFullYear()} Su9.ma. {t('footer.rights')}
                </p>
                <div className="flex items-center space-x-6 text-xs font-bold text-gray-400 uppercase tracking-widest">
                  <Link to="/terms" className="hover:text-orange-600 transition-colors">{t('footer.terms')}</Link>
                  <Link to="/privacy" className="hover:text-orange-600 transition-colors">{t('footer.privacy')}</Link>
                  <Link to="/safety" className="hover:text-orange-600 transition-colors">{t('footer.safety')}</Link>
                </div>
              </div>
            </div>
          </footer>

          <Toaster position="top-right" richColors />
          </div>
        </Router>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

function useAuth() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => onAuthStateChanged(auth, (u) => {
    setUser(u);
    setAuthReady(true);
  }), []);

  return { user, authReady };
}
