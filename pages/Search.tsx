import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Filter,
  ChevronDown,
  Map as MapIcon,
  MapPin,
  List,
  X,
  Home,
  Banknote,
  BedDouble,
  Search as SearchIcon,
  Lock,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ListingCard from '../components/ListingCard';
import ListingMap from '../components/ListingMap';
import { Listing, PropertyType, User } from '../types';
import { getListings, obfuscateCoordinates } from '../services/listingService';

interface FilterState {
  type: string;
  locality: string;
  minPrice: number;
  maxPrice: number;
  bedrooms: number;
}

interface SearchProps {
  user: User | null;
}

type DesktopView = 'list' | 'map';

const DEFAULT_MIN_PRICE = 10000;
const DEFAULT_MAX_PRICE = 75000;
const ABSOLUTE_MAX_PRICE = 300000;

const Search: React.FC<SearchProps> = ({ user }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showMobileMap, setShowMobileMap] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [desktopView, setDesktopView] = useState<DesktopView>('list');
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(true);

  const [filters, setFilters] = useState<FilterState>({
    type: 'all',
    locality: '',
    minPrice: DEFAULT_MIN_PRICE,
    maxPrice: DEFAULT_MAX_PRICE,
    bedrooms: 0,
  });
  const [localityInput, setLocalityInput] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentQuery = (searchParams.get('q') || '').trim();
  const [queryInput, setQueryInput] = useState(currentQuery);

  useEffect(() => {
    setQueryInput(currentQuery);
  }, [currentQuery]);

  useEffect(() => {
    let isMounted = true;

    const loadListings = async () => {
      const nextListings = await getListings();
      if (!isMounted) {
        return;
      }

      setListings(nextListings);
      setIsLoadingListings(false);
    };

    void loadListings();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const localityOptions = useMemo(() => {
    const candidates = listings
      .map((listing) => listing.location.split(',')[0]?.trim())
      .filter((value): value is string => Boolean(value));

    const uniqueLocalities = Array.from(new Set<string>(candidates));
    return uniqueLocalities.sort((a: string, b: string) => a.localeCompare(b, 'fr'));
  }, [listings]);

  const suggestedLocalities = useMemo(() => {
    const probe = localityInput.trim().toLowerCase();
    if (!probe) {
      return localityOptions.slice(0, 8);
    }

    return localityOptions
      .filter((item) => item.toLowerCase().includes(probe))
      .slice(0, 8);
  }, [localityOptions, localityInput]);

  const filteredListings = useMemo(() => {
    const normalizedQuery = currentQuery.toLowerCase();
    const normalizedLocality = filters.locality.trim().toLowerCase();

    return listings.filter((listing) => {
      if (filters.type !== 'all' && listing.type !== filters.type) {
        return false;
      }

      if (listing.price < filters.minPrice || listing.price > filters.maxPrice) {
        return false;
      }

      if (filters.bedrooms > 0 && listing.bedrooms < filters.bedrooms) {
        return false;
      }

      if (normalizedLocality && !listing.location.toLowerCase().includes(normalizedLocality)) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = `${listing.title} ${listing.location} ${listing.description}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [listings, filters, currentQuery]);

  const passExpiryMs = user?.passExpiry ? Date.parse(user.passExpiry) : null;
  const isPassActive = Boolean(user?.hasActivePass && (!passExpiryMs || passExpiryMs > Date.now()));
  const mapListings = useMemo(
    () => (isPassActive ? filteredListings : filteredListings.map((listing) => obfuscateCoordinates(listing))),
    [filteredListings, isPassActive],
  );

  const isPriceActive = filters.minPrice > DEFAULT_MIN_PRICE || filters.maxPrice < DEFAULT_MAX_PRICE;
  const activeFilterCount =
    (filters.type !== 'all' ? 1 : 0) +
    (filters.locality.trim() ? 1 : 0) +
    (isPriceActive ? 1 : 0) +
    (filters.bedrooms > 0 ? 1 : 0) +
    (currentQuery ? 1 : 0);

  const toggleDropdown = (name: string) => {
    setActiveDropdown(activeDropdown === name ? null : name);
  };

  const setPriceRange = (nextMin: number, nextMax: number) => {
    const min = Math.max(DEFAULT_MIN_PRICE, Math.min(nextMin, ABSOLUTE_MAX_PRICE));
    const max = Math.max(min, Math.min(nextMax, ABSOLUTE_MAX_PRICE));

    setFilters((prev) => ({
      ...prev,
      minPrice: min,
      maxPrice: max,
    }));
  };

  const applyLocality = (value: string) => {
    const normalized = value.trim();
    setFilters((prev) => ({ ...prev, locality: normalized }));
    setLocalityInput(normalized);
    setActiveDropdown(null);
  };

  const resetFilters = () => {
    setFilters({
      type: 'all',
      locality: '',
      minPrice: DEFAULT_MIN_PRICE,
      maxPrice: DEFAULT_MAX_PRICE,
      bedrooms: 0,
    });

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('q');
    setSearchParams(nextParams);

    setQueryInput('');
    setLocalityInput('');
    setActiveDropdown(null);
  };

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const nextQuery = queryInput.trim();
    const nextParams = new URLSearchParams(searchParams);

    if (nextQuery) {
      nextParams.set('q', nextQuery);
    } else {
      nextParams.delete('q');
    }

    setSearchParams(nextParams);
  };

  const handleMapUnlock = () => {
    if (!user) {
      navigate(`/auth?mode=login&redirect=${encodeURIComponent('/search')}`);
      return;
    }

    const firstListing = filteredListings[0];
    if (firstListing) {
      navigate(`/listing/${firstListing.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="relative z-20 bg-white/90 backdrop-blur-xl border-b border-gray-200 shadow-sm transition-all duration-300">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <form onSubmit={handleSearchSubmit} className="mb-3 md:mb-4">
            <div className="relative">
              <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={queryInput}
                onChange={(event) => setQueryInput(event.target.value)}
                placeholder="Quartier, ville, type de bien..."
                className="w-full bg-white border border-gray-200 rounded-full py-3 pl-11 pr-28 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-sm font-bold px-4 py-2 rounded-full hover:bg-black transition-colors"
              >
                Chercher
              </button>
            </div>
          </form>

          <div className="flex items-center justify-between gap-3 mb-3">
            <span className="text-sm font-semibold text-gray-600">
              <strong className="text-gray-900">{filteredListings.length}</strong> resultats
            </span>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowMobileMap(!showMobileMap)}
                className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-lg hover:bg-black active:scale-95 transition-all duration-200 md:hidden"
              >
                {showMobileMap ? (
                  <>
                    <List size={16} /> Liste
                  </>
                ) : (
                  <>
                    <MapIcon size={16} /> Carte
                  </>
                )}
              </button>

              <div className="hidden md:flex bg-gray-100 p-1 rounded-full border border-gray-200">
                <button
                  onClick={() => setDesktopView('list')}
                  className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 ${
                    desktopView === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <List size={14} /> Liste
                </button>
                <button
                  onClick={() => setDesktopView('map')}
                  className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 ${
                    desktopView === 'map' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <MapIcon size={14} /> Carte
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gradient-to-b from-white to-gray-50 p-3 md:p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="inline-flex items-center gap-2 text-sm font-bold text-gray-700">
                <Filter size={15} className="text-primary-600" />
                Filtres rapides
              </p>
              {activeFilterCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-600 hover:text-red-500 transition-colors"
                >
                  <X size={13} /> Effacer
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 relative" ref={dropdownRef}>
              <div className="relative">
                <FilterPill
                  title="Localite"
                  label={filters.locality || 'Toutes les zones'}
                  active={Boolean(filters.locality)}
                  open={activeDropdown === 'locality'}
                  icon={<MapPin size={16} />}
                  onClick={() => toggleDropdown('locality')}
                />
                {activeDropdown === 'locality' && (
                  <div className="absolute top-full left-0 mt-2 w-full min-w-[260px] bg-white rounded-2xl shadow-xl border border-gray-100 p-4 animate-fade-in-up z-50">
                    <h3 className="font-bold text-gray-900 mb-3">Chercher par localite</h3>
                    <input
                      type="text"
                      value={localityInput}
                      onChange={(event) => {
                        const value = event.target.value;
                        setLocalityInput(value);
                        setFilters((prev) => ({ ...prev, locality: value.trim() }));
                      }}
                      placeholder="Ex: Bè, Agoe, Adidogome..."
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 mb-3 focus:outline-none focus:ring-2 focus:ring-primary-200"
                    />
                    <div className="space-y-1 max-h-48 overflow-auto">
                      <button
                        onClick={() => applyLocality('')}
                        className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                          !filters.locality ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        Toutes les localites
                      </button>
                      {suggestedLocalities.map((item) => (
                        <button
                          key={item}
                          onClick={() => applyLocality(item)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                            filters.locality.toLowerCase() === item.toLowerCase() ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <FilterPill
                  title="Type de bien"
                  label={filters.type === 'all' ? 'Tous les biens' : filters.type}
                  active={filters.type !== 'all'}
                  open={activeDropdown === 'type'}
                  icon={<Home size={16} />}
                  onClick={() => toggleDropdown('type')}
                />
                {activeDropdown === 'type' && (
                  <div className="absolute top-full left-0 mt-2 w-full min-w-[260px] bg-white rounded-2xl shadow-xl border border-gray-100 p-2 animate-fade-in-up z-50">
                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          setFilters({ ...filters, type: 'all' });
                          setActiveDropdown(null);
                        }}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                          filters.type === 'all' ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        Tous les biens
                      </button>
                      {Object.values(PropertyType).map((type) => (
                        <button
                          key={type}
                          onClick={() => {
                            setFilters({ ...filters, type });
                            setActiveDropdown(null);
                          }}
                          className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                            filters.type === type ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <FilterPill
                  title="Budget"
                  label={isPriceActive ? `${filters.minPrice.toLocaleString('fr-FR')} - ${filters.maxPrice.toLocaleString('fr-FR')} F` : '10 000 - 75 000 F'}
                  active={isPriceActive}
                  open={activeDropdown === 'price'}
                  icon={<Banknote size={16} />}
                  onClick={() => toggleDropdown('price')}
                />
                {activeDropdown === 'price' && (
                  <div className="absolute top-full left-0 mt-2 w-full min-w-[300px] bg-white rounded-2xl shadow-xl border border-gray-100 p-6 animate-fade-in-up z-50">
                    <h3 className="font-bold text-gray-900 mb-4">Budget mensuel</h3>
                    <div className="grid grid-cols-2 gap-3 mb-5">
                      <label className="text-xs font-bold text-gray-500 uppercase">
                        Min
                        <input
                          type="number"
                          min={DEFAULT_MIN_PRICE}
                          max={filters.maxPrice}
                          step={5000}
                          value={filters.minPrice}
                          onChange={(event) => setPriceRange(Number(event.target.value), filters.maxPrice)}
                          className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold text-gray-900"
                        />
                      </label>
                      <label className="text-xs font-bold text-gray-500 uppercase">
                        Max
                        <input
                          type="number"
                          min={filters.minPrice}
                          max={ABSOLUTE_MAX_PRICE}
                          step={5000}
                          value={filters.maxPrice}
                          onChange={(event) => setPriceRange(filters.minPrice, Number(event.target.value))}
                          className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold text-gray-900"
                        />
                      </label>
                    </div>

                    <input
                      type="range"
                      min={DEFAULT_MIN_PRICE}
                      max={ABSOLUTE_MAX_PRICE}
                      step={5000}
                      value={filters.maxPrice}
                      onChange={(event) => setPriceRange(filters.minPrice, Number(event.target.value))}
                      className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary-600"
                    />

                    <div className="flex justify-between text-xs font-bold text-gray-400 mt-2">
                      <span>{DEFAULT_MIN_PRICE.toLocaleString('fr-FR')} F</span>
                      <span>{ABSOLUTE_MAX_PRICE.toLocaleString('fr-FR')} F</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <FilterPill
                  title="Chambres"
                  label={filters.bedrooms > 0 ? `${filters.bedrooms}+ chambres` : 'Toutes'}
                  active={filters.bedrooms > 0}
                  open={activeDropdown === 'bedrooms'}
                  icon={<BedDouble size={16} />}
                  onClick={() => toggleDropdown('bedrooms')}
                />
                {activeDropdown === 'bedrooms' && (
                  <div className="absolute top-full left-0 mt-2 w-full min-w-[260px] bg-white rounded-2xl shadow-xl border border-gray-100 p-6 animate-fade-in-up z-50">
                    <h3 className="font-bold text-gray-900 mb-4">Nombre de pieces min.</h3>
                    <div className="flex gap-2">
                      {[0, 1, 2, 3, 4].map((num) => (
                        <button
                          key={num}
                          onClick={() => setFilters({ ...filters, bedrooms: num })}
                          className={`flex-1 aspect-square rounded-xl font-bold text-sm border-2 transition-all ${
                            filters.bedrooms === num
                              ? 'border-primary-600 bg-primary-50 text-primary-700'
                              : 'border-gray-100 hover:border-gray-200 text-gray-600'
                          }`}
                        >
                          {num === 0 ? 'Tout' : `${num}+`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col xl:flex-row gap-6">
          <div
            className={`flex-1 min-h-[500px] ${showMobileMap ? 'hidden' : 'block'} ${
              desktopView === 'map' ? 'md:hidden' : 'md:block'
            }`}
          >
            {isLoadingListings ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6 text-gray-300">
                  <SearchIcon size={40} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Chargement des annonces...</h3>
              </div>
            ) : filteredListings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredListings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6 text-gray-300">
                  <SearchIcon size={40} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Aucun logement trouve</h3>
                <p className="text-gray-500 mt-2 max-w-md mx-auto">
                  Aucun bien ne correspond a vos criteres actuels. Essayez d'elargir la recherche.
                </p>
                <button onClick={resetFilters} className="mt-8 text-primary-600 font-bold hover:underline">
                  Reinitialiser tous les filtres
                </button>
              </div>
            )}
          </div>

          <div
            className={`
              ${showMobileMap ? 'block h-[calc(100vh-140px)] w-full' : 'hidden'}
              ${desktopView === 'map' ? 'md:block md:h-[calc(100vh-180px)] md:w-full' : 'md:hidden xl:block xl:w-[450px] xl:h-[calc(100vh-140px)]'}
              ${desktopView === 'map' ? 'md:sticky md:top-24' : 'xl:sticky xl:top-36'}
              rounded-3xl overflow-hidden shadow-xl border border-gray-200
            `}
          >
            <div className="w-full h-full bg-gray-100 relative">
              <div className={isPassActive ? 'h-full w-full' : 'h-full w-full blur-[3px] saturate-0'}>
                <ListingMap listings={mapListings} interactive={isPassActive} />
              </div>

              {isPassActive ? (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg text-xs font-bold text-gray-600 border border-white/50 z-[400]">
                  Deplacez la carte pour explorer
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center p-4 z-[420]">
                  <div className="max-w-sm rounded-2xl border border-gray-200 bg-white/95 backdrop-blur-md p-5 text-center shadow-xl">
                    <div className="mx-auto mb-3 h-10 w-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
                      <Lock size={18} />
                    </div>
                    <p className="text-sm font-bold text-gray-900 mb-2">Carte precise reservee au pass</p>
                    <p className="text-xs text-gray-600 mb-4">
                      Sans pass, la carte reste volontairement floutee et la geolocalisation exacte est masquee.
                    </p>
                    <button
                      onClick={handleMapUnlock}
                      className="w-full rounded-xl bg-gray-900 text-white px-4 py-2.5 text-sm font-bold hover:bg-black transition-colors"
                    >
                      {user ? 'Activer mon pass' : 'Se connecter'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const FilterPill = ({
  title,
  label,
  active,
  open,
  icon,
  onClick,
}: {
  title: string;
  label: string;
  active: boolean;
  open: boolean;
  icon: React.ReactNode;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    aria-expanded={open}
    className={`
      w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-2xl border transition-all duration-200 active:scale-[0.99]
      ${active ? 'bg-primary-50 border-primary-300 text-primary-700 shadow-sm' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'}
    `}
  >
    <span className="flex items-center gap-2 min-w-0">
      <span className={`h-7 w-7 rounded-lg flex items-center justify-center ${active ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'}`}>
        {icon}
      </span>
      <span className="min-w-0 text-left">
        <span className="block text-[10px] uppercase tracking-wide font-black text-gray-500">{title}</span>
        <span className="block text-sm font-bold truncate">{label}</span>
      </span>
    </span>
    <ChevronDown size={15} className={`transition-transform duration-200 shrink-0 ${open ? 'rotate-180' : ''} ${active ? 'text-primary-600' : 'text-gray-400'}`} />
  </button>
);

export default Search;
