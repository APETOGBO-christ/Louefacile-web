import React, { useState, useEffect } from 'react';
import { MapPin, BedDouble, Bath, Square, CheckCircle, ArrowUpRight, Heart } from 'lucide-react';
import { Listing } from '../types';
import { Link } from 'react-router-dom';

interface ListingCardProps {
  listing: Listing;
  distanceKm?: number;
}

const STORAGE_KEY = 'louefacile_likes';

const readLikedListings = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const formatDistance = (distanceKm: number): string => {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }

  const precision = distanceKm < 10 ? 1 : 0;
  return `${distanceKm.toFixed(precision)} km`;
};

const ListingCard: React.FC<ListingCardProps> = ({ listing, distanceKm }) => {
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    const likedListings = readLikedListings();
    setIsLiked(likedListings.includes(listing.id));
  }, [listing.id]);

  const toggleLike = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const likedListings = readLikedListings();
    const nextIsLiked = !likedListings.includes(listing.id);
    const newLikedListings = nextIsLiked
      ? [...likedListings, listing.id]
      : likedListings.filter((likedId: string) => likedId !== listing.id);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(newLikedListings));
    setIsLiked(nextIsLiked);
  };

  return (
    <Link to={`/listing/${listing.id}`} className="group block h-full active:scale-[0.98] transition-transform duration-300">
      <div className="relative bg-white rounded-3xl overflow-hidden shadow-sm group-hover:shadow-2xl group-hover:shadow-primary-900/10 transition-all duration-500 border border-gray-100 h-full flex flex-col group-hover:-translate-y-2">
        <div className="relative h-64 overflow-hidden">
          <img
            src={listing.images[0]}
            alt={listing.title}
            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-in-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60"></div>

          <div className="absolute top-4 left-4 flex flex-col gap-2 items-start">
            <span className="glass bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-gray-900 shadow-sm uppercase tracking-wider border border-white/40">
              {listing.type}
            </span>
            {listing.verified && (
              <span className="bg-emerald-500/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold shadow-lg shadow-emerald-900/20 border border-white/20">
                <CheckCircle size={14} className="text-white" strokeWidth={3} />
                Verifie
              </span>
            )}
          </div>

          <button
            onClick={toggleLike}
            aria-label={isLiked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            className={`absolute top-4 right-4 p-2.5 rounded-full backdrop-blur-md border transition-all duration-300 shadow-sm hover:scale-110 active:scale-90 z-20 ${
              isLiked
                ? 'bg-white text-secondary-500 border-white shadow-md'
                : 'bg-black/20 text-white border-white/30 hover:bg-white hover:text-secondary-500'
            }`}
          >
            <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} strokeWidth={2.5} />
          </button>

          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
            <div className="glass-dark bg-gray-900/60 text-white px-4 py-2 rounded-2xl backdrop-blur-md border border-white/10">
              <div className="text-lg font-bold">
                {listing.price.toLocaleString('fr-FR')} <span className="text-xs font-normal opacity-80">FCFA</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 flex flex-col flex-grow">
          <div className="flex justify-between items-start mb-3 gap-2">
            <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-1">{listing.title}</h3>
            <ArrowUpRight size={20} className="text-gray-300 group-hover:text-primary-600 transition-colors opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 duration-300" />
          </div>

          <div className="mb-6 flex flex-wrap items-center gap-2">
            <div className="flex items-center text-gray-500 text-sm bg-gray-50 w-fit px-3 py-1 rounded-full">
              <MapPin size={14} className="mr-1.5 text-secondary-500" />
              <span className="truncate max-w-[200px]">{listing.location}</span>
            </div>
            {typeof distanceKm === 'number' && (
              <span className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700">
                {formatDistance(distanceKm)}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-gray-600 text-sm mt-auto pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 group/icon">
              <div className="p-2 bg-primary-50 rounded-full text-primary-600 group-hover/icon:scale-110 transition-transform duration-300">
                <BedDouble size={16} />
              </div>
              <span className="font-medium">{listing.bedrooms}</span>
            </div>

            <div className="flex items-center gap-2 group/icon">
              <div className="p-2 bg-primary-50 rounded-full text-primary-600 group-hover/icon:scale-110 transition-transform duration-300">
                <Bath size={16} />
              </div>
              <span className="font-medium">{listing.bathrooms}</span>
            </div>

            <div className="flex items-center gap-2 group/icon">
              <div className="p-2 bg-primary-50 rounded-full text-primary-600 group-hover/icon:scale-110 transition-transform duration-300">
                <Square size={16} />
              </div>
              <span className="font-medium">{listing.surface} m2</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ListingCard;
