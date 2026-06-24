import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Shield, Info, Heart, AlertTriangle, Scale, UserCheck, PawPrint, Ban, Lock, Trash2, Flag, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function Terms() {
  const { t } = useTranslation();

  const sections = [
    { key: 'purpose', icon: Info },
    { key: 'role', icon: Shield },
    { key: 'user', icon: UserCheck },
    { key: 'allowed', icon: PawPrint },
    { key: 'prohibitedAnimals', icon: Ban },
    { key: 'prohibitedContent', icon: AlertTriangle },
    { key: 'liability', icon: Scale },
    { key: 'data', icon: Lock },
    { key: 'removal', icon: Trash2 },
    { key: 'reporting', icon: Flag },
    { key: 'changes', icon: RefreshCw },
    { key: 'acceptance', icon: CheckCircle2 },
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
            <Info className="w-6 h-6" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
            {t('termsPage.title')}
          </h1>
        </div>

        <p className="text-lg text-gray-600 mb-12 font-medium leading-relaxed">
          {t('termsPage.welcome')}
        </p>

        <div className="space-y-12">
          {sections.map(({ key, icon: Icon }) => (
            <div key={key} className="relative">
              <div className="flex items-center space-x-3 mb-4 rtl:space-x-reverse">
                <Icon className="w-5 h-5 text-orange-600" />
                <h2 className="text-xl font-bold text-gray-900">{t(`termsPage.sections.${key}.title`)}</h2>
              </div>
              <p className="text-gray-600 leading-relaxed pl-8 rtl:pl-0 rtl:pr-8">
                {t(`termsPage.sections.${key}.content`)}
              </p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}