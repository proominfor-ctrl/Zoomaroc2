import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  auth,
  googleProvider,
  signInWithPopup, 
  db, 
  doc, 
  getDoc, 
  setDoc, 
  Timestamp,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from '../firebase';
import { toast } from 'sonner';
import { LogIn, Mail, Lock, ShieldCheck, Github, User as UserIcon, Phone } from 'lucide-react';
import { motion } from 'motion/react';
export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const { t } = useTranslation();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    if (isSignUp && !displayName) {
      toast.error('Please enter your name');
      return;
    }
    if (isSignUp && !phoneNumber) {
      toast.error('Please enter your phone number');
      return;
    }

    setLoading(true);
    try {
      let user;
      if (isSignUp) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        user = result.user;
        await updateProfile(user, { displayName });
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);
        user = result.user;
      }

      // Check if user exists in Firestore, if not create profile
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || displayName,
          photoURL: user.photoURL,
          phoneNumber: phoneNumber || '',
          role: 'user',
          rating: 5,
          reviewCount: 0,
          createdAt: Timestamp.now(),
          privacySettings: {
            showEmail: false,
            showPhone: true,
            showLocation: true
          }
        });
      }
      
      toast.success(isSignUp ? 'Account created successfully!' : 'Welcome back!');
      navigate('/');
    } catch (error: any) {
      console.error('Email auth error:', error);
      let errorMessage = 'Authentication failed. Please try again.';
      switch (error.code) {
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          errorMessage = 'Incorrect email or password. Please check your credentials.';
          break;
        case 'auth/email-already-in-use':
          errorMessage = 'This email is already registered. Please sign in or use a different email.';
          break;
        case 'auth/weak-password':
          errorMessage = 'The password is too weak. It must be at least 6 characters long.';
          break;
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Check if user exists in Firestore, if not create profile
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: 'user',
          rating: 5,
          reviewCount: 0,
          createdAt: Timestamp.now(),
          privacySettings: {
            showEmail: false,
            showPhone: true,
            showLocation: true
          }
        });
      }
      
      toast.success('Welcome to Su9.ma!');
      navigate('/');
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 text-orange-600 mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">{t('login.welcome')}</h1>
          <p className="text-gray-500 mt-2">{t('login.subtitle')}</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center space-x-3 bg-white border-2 border-gray-100 hover:border-orange-200 hover:bg-orange-50 text-gray-700 font-bold py-3.5 rounded-xl transition-all disabled:opacity-50"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
            <span>{t('login.google')}</span>
          </button>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-400 font-medium uppercase tracking-widest text-xs">{t('login.secureAccess')}</span>
            </div>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {isSignUp && (
              <>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="text"
                    placeholder={t('profile.displayName')}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-orange-500 transition-all outline-none font-medium"
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="tel"
                    placeholder={t('profile.phoneNumber')}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-orange-500 transition-all outline-none font-medium"
                  />
                </div>
              </>
            )}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="email" 
                placeholder={t('login.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-orange-500 transition-all outline-none"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="password" 
                placeholder={t('login.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-orange-500 transition-all outline-none"
              />
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50"
            >
              {loading ? t('profile.saving') : (isSignUp ? t('login.signUp') : t('login.signIn'))}
            </button>
          </form>
        </div>

        <button 
          onClick={() => setIsSignUp(!isSignUp)}
          className="w-full mt-6 text-sm font-bold text-gray-500 hover:text-orange-600 transition-colors"
        >
          {isSignUp ? t('login.hasAccount') : t('login.noAccount')}
        </button>

        <p className="text-center mt-8 text-sm text-gray-500">
          {t('login.agreement')} <br />
          <Link to="/terms" className="text-orange-600 font-semibold hover:underline">{t('footer.terms')}</Link> {t('login.and')} <Link to="/privacy" className="text-orange-600 font-semibold hover:underline">{t('footer.privacy')}</Link>.
        </p>
      </motion.div>
    </div>
  );
}
