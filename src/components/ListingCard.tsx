import { Link } from 'react-router-dom';
import { MapPin, Tag, Clock, Heart, ShoppingBag, Tractor, PawPrint } from 'lucide-react';
import { motion } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  listing: any;
}

const CATEGORY_ICONS: { [key: string]: any } = {
  pet: PawPrint,
  livestock: Tractor,
  adoption: Heart,
  accessory: ShoppingBag,
};

export default function ListingCard({ listing }: Props) {
  const Icon = CATEGORY_ICONS[listing.animalType] || Tag;
  const isFree = listing.animalType === 'adoption' || listing.price === 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group bg-white rounded-2xl shadow-sm transition-all border border-gray-100 overflow-hidden flex flex-col card-dynamic"
    >
      <Link to={`/listing/${listing.id}`} className="relative h-56 overflow-hidden">
        <img 
          src={listing.images?.[0] || 'https://picsum.photos/seed/animal/800/600'} 
          alt={listing.title}
          loading="lazy"
          decoding="async"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
        {/* Subtle gradient overlay for elegant look */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-4 left-4">
          <span className={`bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest shadow-sm flex items-center ${
            listing.animalType === 'adoption' ? 'text-[#006d2c]' : 'text-orange-600'
          }`}>
            <Icon className="w-3 h-3 mr-1.5" />
            {listing.animalType}
          </span>
        </div>
        {listing.status && listing.status !== 'active' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2">
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg backdrop-blur-md ${
              listing.status === 'pending' 
                ? 'bg-yellow-500/90 text-white' 
                : 'bg-red-600/90 text-white'
            }`}>
              {listing.status === 'pending' ? '⌛ Pending Approval' : '❌ Rejected'}
            </span>
          </div>
        )}
        <button className="absolute top-4 right-4 p-2 rounded-full bg-white/90 backdrop-blur-sm text-gray-400 hover:text-red-500 transition-colors shadow-sm">
          <Heart className="w-4 h-4" />
        </button>
      </Link>

      <div className="p-5 flex-grow flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <span className={`text-2xl font-black tracking-tight ${isFree ? 'text-[var(--navy-900)]' : 'text-[var(--navy-900)]'}`} style={{fontFamily: 'Playfair Display, serif'}}>
            {isFree 
              ? 'FREE' 
              : `${listing.price} MAD`}
          </span>
          <div className="flex items-center text-xs text-gray-400 font-medium">
            <Clock className="w-3 h-3 mr-1" />
            {listing.createdAt?.toDate ? formatDistanceToNow(listing.createdAt.toDate()) : 'Recently'} ago
          </div>
        </div>

          <Link to={`/listing/${listing.id}`} className="block mb-4">
          <h3 className="text-lg font-bold text-[var(--navy-900)] leading-tight group-hover:text-[var(--gold-500)] transition-colors line-clamp-1" style={{fontFamily: 'Playfair Display, serif'}}>
            {listing.title}
          </h3>
          <p className="text-sm text-gray-500 line-clamp-2 mt-1">
            {listing.description}
          </p>
        </Link>

        <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between text-sm text-gray-500 font-medium">
          <div className="flex items-center">
            <MapPin className="w-4 h-4 mr-1 text-gray-400" />
            {listing.location}
          </div>
          <div className="flex items-center text-gray-400">
            <span className="text-xs uppercase tracking-widest font-black">{listing.breed || 'Mixed'}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
