import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Shield, Lock, Eye, Share2, Cookie, UserCheck, Database, Info, Scale, Clock, AlertCircle, RefreshCw } from 'lucide-react';

export default function Privacy() {
  const { t } = useTranslation();

  const sections = [
    { key: 'introduction', icon: Info },
    { key: 'controller', icon: UserCheck },
    { key: 'framework', icon: Shield },
    { key: 'collect', icon: Database },
    { key: 'purpose', icon: Eye },
    { key: 'basis', icon: Scale },
    { key: 'sharing', icon: Share2 },
    { key: 'retention', icon: Clock },
    { key: 'rights', icon: UserCheck },
    { key: 'cookies', icon: Cookie },
    { key: 'security', icon: Lock },
    { key: 'thirdparty', icon: Share2 },
    { key: 'disclaimer', icon: AlertCircle },
    { key: 'transfers', icon: RefreshCw },
    { key: 'changes', icon: RefreshCw },
  ];

  return (
    <div className="max-w-4xl mx-auto py-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 md:p-12"
      >
        <div className="flex items-center space-x-4 mb-8 rtl:space-x-reverse">
          <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
            {t('privacyPage.title')}
          </h1>
        </div>

        <p className="text-lg text-gray-600 mb-12 font-medium leading-relaxed">
          {t('privacyPage.welcome')}
        </p>

        <div className="space-y-12">
          {sections.map(({ key, icon: Icon }) => (
            <div key={key} className="relative">
              <div className="flex items-center space-x-3 mb-4 rtl:space-x-reverse">
                <Icon className="w-5 h-5 text-orange-600" />
                <h2 className="text-xl font-bold text-gray-900">{t(`privacyPage.sections.${key}.title`)}</h2>
              </div>
              <p className="text-gray-600 leading-relaxed pl-8 rtl:pl-0 rtl:pr-8">
                {t(`privacyPage.sections.${key}.content`)}
              </p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}