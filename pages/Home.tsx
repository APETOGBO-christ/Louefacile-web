import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Filter,
  Lock,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Listing } from '../types';
import { getListings } from '../services/listingService';

const ROTATION_INTERVAL_MS = 6800;

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadListings = async () => {
      const data = await getListings();
      if (!isMounted) {
        return;
      }

      setListings(data);
      setIsLoadingListings(false);
    };

    void loadListings();

    return () => {
      isMounted = false;
    };
  }, []);

  const heroListing = listings[0];
  const rotatingListings = listings.slice(1);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    navigate(query ? `/search?q=${encodeURIComponent(query)}` : '/search');
  };

  return (
    <div className="w-full overflow-hidden bg-stone-50 text-slate-900">
      <section className="relative pt-28 pb-20 lg:pt-36 lg:pb-24 overflow-hidden border-b border-stone-200 bg-gradient-to-br from-stone-100 via-white to-blue-50">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-blue-200/60 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-stone-200/70 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 mb-7 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Recherche rapide, attentes respectees
            </div>

            <h1 className="text-5xl md:text-7xl font-black leading-[0.95] tracking-tight text-slate-950 mb-6">
              Trouvez la chambre parfaite,
              <span className="block bg-clip-text text-transparent bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700">
                dans le plus bref delai.
              </span>
            </h1>

            <p className="max-w-3xl text-lg md:text-2xl text-slate-600 leading-relaxed mb-10">
              Fini les visites pour rien.
            </p>
            <p className="max-w-3xl text-sm md:text-base text-slate-500 leading-relaxed mb-6">
              En quelques minutes, vous savez si la chambre correspond a votre budget, vos regles et votre zone.
            </p>

            <form
              onSubmit={handleSearchSubmit}
              className="w-full max-w-3xl rounded-3xl border border-stone-300 bg-white p-3 shadow-[0_20px_60px_rgba(15,23,42,0.10)] flex flex-col md:flex-row gap-2"
            >
              <div className="flex items-center gap-3 flex-1 px-4">
                <Search size={20} className="text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Quartier, budget, type de chambre..."
                  className="w-full py-3 text-base md:text-lg font-semibold text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none"
                  aria-label="Rechercher un logement"
                />
              </div>
              <button
                type="submit"
                className="bg-blue-700 text-white px-8 py-4 rounded-2xl font-extrabold text-lg hover:bg-blue-800 transition-colors flex items-center justify-center gap-2"
              >
                Trouver
                <ArrowRight size={18} />
              </button>
            </form>

            <div className="mt-6 flex flex-wrap gap-3 text-sm font-semibold">
              <Link
                to="/search"
                className="rounded-full border border-stone-300 bg-white px-4 py-2 text-slate-700 hover:border-stone-400 transition-colors"
              >
                Voir les annonces maintenant
              </Link>
              <Link
                to="/about"
                className="rounded-full border border-stone-300 bg-white px-4 py-2 text-slate-700 hover:border-stone-400 transition-colors"
              >
                Voir la methode de verification
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] font-bold text-blue-700 mb-2">Du concret tout de suite</p>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900">Annonces disponibles maintenant</h2>
            </div>
            <Link to="/search" className="inline-flex items-center gap-2 text-blue-700 font-bold hover:text-blue-800 transition-colors">
              Voir toutes les annonces
              <ArrowRight size={18} />
            </Link>
          </div>

          {isLoadingListings ? (
            <div className="rounded-3xl border border-stone-300 bg-stone-50 p-10 text-center text-slate-500">
              Chargement des annonces...
            </div>
          ) : heroListing ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <HeroListingCard listing={heroListing} />
              <RotatingCompactListings listings={rotatingListings} />
            </div>
          ) : (
            <div className="rounded-3xl border border-stone-300 bg-stone-50 p-10 text-center text-slate-500">
              Aucune annonce disponible pour le moment.
            </div>
          )}
        </div>
      </section>

      <section className="py-20 bg-stone-100 border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-10">
            <p className="text-xs uppercase tracking-[0.2em] font-bold text-slate-500 mb-3">Pourquoi c'est plus rapide</p>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 mb-4">
              Moins d'incertitude, plus de decisions utiles.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <ValueCard
              icon={<Filter size={20} />}
              title="Filtrage precis"
              text="Prix, avance, charges, regles et quartier avant toute prise de contact."
            />
            <ValueCard
              icon={<ShieldCheck size={20} />}
              title="Conditions stables"
              text="Les points critiques sont visibles avant visite et l'historique est trace."
            />
            <ValueCard
              icon={<Clock3 size={20} />}
              title="Execution rapide"
              text="Moins d'allers-retours et moins de rendez-vous perdus."
            />
          </div>
        </div>
      </section>
      <section className="py-20 bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="rounded-3xl border border-stone-300 bg-stone-50 p-7">
              <p className="text-xs uppercase tracking-[0.2em] font-bold text-slate-500 mb-3">Modele pass</p>
              <h3 className="text-2xl md:text-3xl font-black text-slate-900 mb-4">Deblocage controle des contacts</h3>
              <div className="space-y-3 text-slate-700">
                <RuleRow icon={<Lock size={16} />} text="Pass 7 jours avec quota de deblocages par jour" />
                <RuleRow icon={<MapPin size={16} />} text="Contact direct + localisation precise apres deblocage" />
                <RuleRow icon={<CheckCircle2 size={16} />} text="Historique des changements visible sur chaque annonce" />
              </div>
            </div>

            <div className="rounded-3xl border border-blue-200 bg-blue-50 p-7">
              <p className="text-xs uppercase tracking-[0.2em] font-bold text-blue-700 mb-3">Promesse LoueFacile</p>
              <h3 className="text-2xl md:text-3xl font-black text-slate-900 mb-4">Transparence avant deplacement</h3>
              <p className="text-slate-700 leading-relaxed mb-5">
                Le but est simple: vous aider a trouver la chambre qui correspond a vos attentes le plus vite possible, sans surprises de derniere minute.
              </p>
              <Link
                to="/search"
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-700 text-white px-6 py-3 font-extrabold hover:bg-blue-800 transition-colors"
              >
                Commencer la recherche
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-stone-100 to-blue-50 border-b border-stone-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 mb-5">
            <Sparkles size={16} className="text-blue-600" />
            Plus rapide. Plus clair. Plus fiable.
          </div>
          <h2 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 mb-5">Trouvez vite la bonne chambre.</h2>
          <p className="text-lg md:text-xl text-slate-600 mb-8">
            Vous gardez le controle sur les criteres et vous decidez sur des informations concretes.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/search" className="bg-blue-700 text-white px-8 py-4 rounded-2xl font-extrabold hover:bg-blue-800 transition-colors">
              Lancer ma recherche
            </Link>
            <Link
              to="/about"
              className="bg-white border border-stone-300 text-slate-800 px-8 py-4 rounded-2xl font-bold hover:border-stone-400 transition-colors"
            >
              Comprendre la methode
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

const HeroListingCard = ({ listing }: { listing: Listing }) => (
  <Link
    to={`/listing/${listing.id}`}
    className="group relative rounded-3xl overflow-hidden min-h-[430px] border border-stone-300 bg-white block lg:col-span-2 shadow-[0_20px_50px_rgba(15,23,42,0.10)]"
  >
    <img src={listing.images[0]} alt={listing.title} className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-700" />
    <div className="absolute inset-0 bg-gradient-to-t from-white via-white/60 to-transparent" />
    <div className="relative p-7 md:p-9 h-full flex flex-col justify-end">
      <div className="flex items-center gap-2 mb-4">
        <span className="rounded-full bg-blue-700 text-white text-xs font-black uppercase px-3 py-1 tracking-wide">
          {listing.verified ? 'Verifiee' : 'Notee'}
        </span>
        <span className="rounded-full bg-white/90 text-slate-700 text-xs font-bold px-3 py-1 border border-stone-300">{listing.type}</span>
      </div>
      <h3 className="text-2xl md:text-4xl font-black text-slate-900 mb-3">{listing.title}</h3>
      <p className="text-slate-600 mb-6 flex items-center gap-2">
        <MapPin size={16} className="text-blue-700" />
        {listing.location}
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <MiniPill label="Loyer" value={`${listing.price.toLocaleString('fr-FR')} F`} />
        <MiniPill label="Avance" value={`${listing.conditions.advance} mois`} />
        <MiniPill label="Caution" value={`${listing.conditions.caution} mois`} />
        <MiniPill label="Charges" value={listing.conditions.chargesIncluded ? 'Incluses' : 'Separees'} />
      </div>
      <div className="inline-flex items-center gap-2 text-blue-800 font-bold">
        Voir le detail
        <ArrowRight size={16} />
      </div>
    </div>
  </Link>
);

const RotatingCompactListings = ({ listings }: { listings: Listing[] }) => {
  const [startIndex, setStartIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (listings.length <= 2) {
      return;
    }

    const interval = window.setInterval(() => {
      setIsAnimating((current) => {
        if (current || isResetting) {
          return current;
        }
        return true;
      });
    }, ROTATION_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [listings.length, isResetting]);

  const handleTransitionEnd = () => {
    if (!isAnimating) {
      return;
    }

    setIsResetting(true);
    setIsAnimating(false);
    setStartIndex((currentIndex) => (currentIndex + 1) % listings.length);

    // Keep the reset frame transition-less so the loop behaves like a queue.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setIsResetting(false);
      });
    });
  };

  if (listings.length === 0) {
    return null;
  }

  if (listings.length <= 2) {
    return (
      <div className="space-y-6">
        {listings.map((listing) => (
          <div key={listing.id}>
            <CompactListingCard listing={listing} />
          </div>
        ))}
      </div>
    );
  }

  const visibleListings = [
    listings[startIndex % listings.length],
    listings[(startIndex + 1) % listings.length],
    listings[(startIndex + 2) % listings.length],
  ];

  return (
    <div className="relative h-[19.5rem] overflow-hidden">
      <div
        onTransitionEnd={handleTransitionEnd}
        className={`absolute inset-0 space-y-6 ${
          isResetting ? 'transition-none' : 'transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]'
        } ${
          isAnimating ? '-translate-y-[10.5rem]' : 'translate-y-0'
        }`}
      >
        {visibleListings.map((listing, index) => (
          <div key={`${listing.id}-${startIndex}-${index}`}>
            <CompactListingCard listing={listing} />
          </div>
        ))}
      </div>
    </div>
  );
};

const CompactListingCard = ({ listing }: { listing: Listing }) => (
  <Link
    to={`/listing/${listing.id}`}
    className="group h-36 rounded-3xl border border-stone-300 bg-white overflow-hidden flex items-center gap-4 p-4 hover:border-stone-400 transition-colors shadow-sm"
  >
    <img src={listing.images[0]} alt={listing.title} className="h-full w-28 rounded-2xl object-cover" />
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs uppercase tracking-wide font-black text-blue-700">{listing.type}</span>
        <span className="text-sm font-black text-slate-900">{listing.price.toLocaleString('fr-FR')} F</span>
      </div>
      <h4 className="text-slate-900 font-black text-lg leading-tight mb-1 max-h-12 overflow-hidden">{listing.title}</h4>
      <p className="text-slate-500 text-sm truncate mb-1">{listing.location}</p>
      <p className="text-xs text-slate-600 truncate">
        {listing.conditions.advance} mois avance - {listing.conditions.caution} mois caution
      </p>
    </div>
  </Link>
);
const MiniPill = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-stone-300 bg-white/95 px-3 py-2">
    <p className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">{label}</p>
    <p className="text-sm font-black text-slate-900">{value}</p>
  </div>
);

const ValueCard = ({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) => (
  <div className="rounded-3xl border border-stone-300 bg-white p-6 shadow-sm">
    <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4">{icon}</div>
    <h3 className="text-xl font-black text-slate-900 mb-2">{title}</h3>
    <p className="text-slate-600 leading-relaxed">{text}</p>
  </div>
);

const RuleRow = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <div className="flex items-center gap-3">
    <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">{icon}</div>
    <p>{text}</p>
  </div>
);

export default Home;

