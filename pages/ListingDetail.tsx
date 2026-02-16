import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Calendar, CheckCircle, Heart, Lock, MapPin, Phone, Share2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import ListingMap from '../components/ListingMap';
import { getListingById, obfuscateCoordinates, scheduleVisit } from '../services/listingService';
import { Listing, User } from '../types';

interface ListingDetailProps {
  user: User | null;
  onUnlock: () => Promise<{ ok: boolean; error?: string }> | { ok: boolean; error?: string };
}

const STORAGE_KEY = 'louefacile_likes';

const readLikedListings = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const toDatetimeLocal = (value: Date): string => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const ListingDetail: React.FC<ListingDetailProps> = ({ user, onUnlock }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [listing, setListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [payError, setPayError] = useState('');
  const [visitOpen, setVisitOpen] = useState(false);
  const [visitDate, setVisitDate] = useState(() => toDatetimeLocal(new Date(Date.now() + 24 * 60 * 60 * 1000)));
  const [visitError, setVisitError] = useState('');
  const [visitNotice, setVisitNotice] = useState('');
  const [isSubmittingVisit, setIsSubmittingVisit] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!id) {
        setIsLoading(false);
        return;
      }
      const data = await getListingById(id);
      if (!mounted) {
        return;
      }
      setListing(data);
      setIsLoading(false);
      setIsLiked(readLikedListings().includes(id));
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [id]);

  const passExpiryMs = user?.passExpiry ? Date.parse(user.passExpiry) : null;
  const isPassActive = Boolean(user?.hasActivePass && (!passExpiryMs || passExpiryMs > Date.now()));
  const mapListing = useMemo(() => (listing ? (isPassActive ? listing : obfuscateCoordinates(listing)) : null), [listing, isPassActive]);

  if (isLoading) {
    return <div className="p-20 text-center text-xl text-gray-500 font-medium">Chargement de l'annonce...</div>;
  }

  if (!listing) {
    return <div className="p-20 text-center text-xl text-gray-500 font-medium">Oups, ce logement semble introuvable.</div>;
  }

  const normalizedPhone = (listing.ownerPhone || '').replace(/[^\d+]/g, '');

  const toggleLike = () => {
    if (!id) {
      return;
    }
    const likedListings = readLikedListings();
    const nextIsLiked = !likedListings.includes(id);
    const next = nextIsLiked ? [...likedListings, id] : likedListings.filter((likedId: string) => likedId !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setIsLiked(nextIsLiked);
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copiez ce lien:', url);
    }
  };

  const requirePass = () => {
    if (!user) {
      const redirectTarget = id ? `/listing/${id}` : '/search';
      navigate(`/auth?mode=login&redirect=${encodeURIComponent(redirectTarget)}`);
      return false;
    }
    if (!isPassActive) {
      setPaywallOpen(true);
      return false;
    }
    return true;
  };

  const activatePass = async () => {
    setPayError('');
    const result = await onUnlock();
    if (!result.ok) {
      setPayError(result.error || "Impossible d'activer le pass.");
      return;
    }
    setPaywallOpen(false);
  };

  const openVisitPlanner = () => {
    if (!requirePass()) {
      return;
    }
    setVisitNotice('');
    setVisitError('');
    setVisitOpen(true);
  };

  const submitVisit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmittingVisit(true);
    setVisitError('');
    setVisitNotice('');
    const result = await scheduleVisit(listing.id, new Date(visitDate).toISOString());
    if (!result.ok) {
      setVisitError(result.error || "Impossible d'enregistrer la visite.");
      setIsSubmittingVisit(false);
      return;
    }
    setVisitNotice(result.notice || 'Demande de visite enregistree.');
    setIsSubmittingVisit(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16">
      {paywallOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setPaywallOpen(false)} />
          <div className="relative w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl">
            <h3 className="text-2xl font-black text-gray-900 mb-2">Pass Recherche</h3>
            <p className="text-sm text-gray-600 mb-5">Sans pass, carte, coordonnees et planification sont verrouillees.</p>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 mb-5">
              <p className="text-sm font-bold text-gray-900">2 000 FCFA</p>
              <p className="text-xs text-gray-600">Validite 7 jours</p>
            </div>
            {payError && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 mb-4">{payError}</div>}
            <button onClick={() => void activatePass()} className="w-full rounded-xl bg-gray-900 text-white font-bold py-3 hover:bg-black transition-colors">Activer mon pass</button>
          </div>
        </div>
      )}

      {visitOpen && (
        <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setVisitOpen(false)} />
          <div className="relative w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl">
            <h3 className="text-2xl font-black text-gray-900 mb-2">Planifier une visite</h3>
            <p className="text-sm text-gray-600 mb-5">Choisissez votre disponibilite.</p>
            <form onSubmit={submitVisit} className="space-y-4">
              <input type="datetime-local" required value={visitDate} onChange={(event) => setVisitDate(event.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold" />
              {visitError && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{visitError}</div>}
              {visitNotice && <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">{visitNotice}</div>}
              <button type="submit" disabled={isSubmittingVisit} className="w-full rounded-xl bg-gray-900 text-white font-bold py-3 hover:bg-black transition-colors disabled:opacity-60">{isSubmittingVisit ? 'Envoi...' : 'Envoyer la demande'}</button>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl overflow-hidden border border-gray-200 bg-white shadow-sm mb-6">
          <div className="relative h-[360px]">
            <img src={listing.images[0]} alt={listing.title} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute top-4 right-4 flex gap-2">
              <button onClick={toggleLike} className="h-10 w-10 rounded-full bg-white/90 text-gray-700 flex items-center justify-center">{<Heart size={18} fill={isLiked ? 'currentColor' : 'none'} />}</button>
              <button onClick={() => void handleShare()} className="h-10 w-10 rounded-full bg-white/90 text-gray-700 flex items-center justify-center"><Share2 size={18} /></button>
            </div>
            <div className="absolute bottom-6 left-6 text-white">
              <p className="text-sm font-semibold uppercase tracking-wide mb-2">{listing.type}</p>
              <h1 className="text-3xl md:text-5xl font-black">{listing.title}</h1>
              <p className="mt-2 flex items-center gap-2 text-gray-200"><MapPin size={16} /> {listing.location}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <section className="rounded-3xl border border-gray-200 bg-white p-6">
              <h2 className="text-2xl font-black text-gray-900 mb-3">Description detaillee</h2>
              <p className="text-gray-700 leading-relaxed mb-5">{listing.description}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <StatBox label="Loyer mensuel" value={`${listing.price.toLocaleString('fr-FR')} FCFA`} />
                <StatBox label="Avance" value={`${listing.conditions.advance} mois`} />
                <StatBox label="Caution" value={listing.conditions.caution > 0 ? `${listing.conditions.caution} mois` : '-'} />
                <StatBox label="Quartier" value={listing.location} />
              </div>
              {listing.rentalConditions && <p className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">{listing.rentalConditions}</p>}
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-2xl font-black text-gray-900">Carte</h2>
                <p className="text-sm text-gray-600 mt-2">{isPassActive ? 'Carte precise activee.' : 'Sans pass, la carte est volontairement floutee.'}</p>
              </div>
              <div className="relative h-80">
                <div className={isPassActive ? 'h-full' : 'h-full blur-[3px] saturate-0'}>
                  {mapListing && <ListingMap listings={[mapListing]} center={[mapListing.coordinates.lat, mapListing.coordinates.lng]} zoom={15} interactive={isPassActive} />}
                </div>
                {!isPassActive && <div className="absolute inset-0 flex items-center justify-center"><button onClick={() => setPaywallOpen(true)} className="rounded-xl bg-gray-900 text-white px-4 py-2 text-sm font-bold">Debloquer avec pass</button></div>}
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-gray-200 bg-white p-6">
              <p className="text-sm font-semibold text-gray-500">Contact</p>
              {!isPassActive ? (
                <div className="mt-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-center">
                  <div className="mx-auto mb-2 h-10 w-10 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center"><Lock size={18} /></div>
                  <p className="text-sm font-semibold text-gray-800 mb-3">Coordonnees masquees</p>
                  <button onClick={() => setPaywallOpen(true)} className="w-full rounded-xl bg-gray-900 text-white font-bold py-2.5">Activer le pass</button>
                </div>
              ) : normalizedPhone ? (
                <div className="mt-3 space-y-2">
                  <a href={`tel:${normalizedPhone}`} className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white p-3 font-bold text-gray-900"><Phone size={16} />{listing.ownerPhone}</a>
                  <p className="text-xs text-gray-600">Proprietaire: {listing.ownerName || 'Verifie'}</p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-gray-600">Contact en cours de verification.</p>
              )}
            </section>

            <button onClick={openVisitPlanner} className={`w-full rounded-2xl py-3.5 font-bold flex items-center justify-center gap-2 ${isPassActive ? 'bg-gray-900 text-white hover:bg-black' : 'bg-gray-100 border border-gray-300 text-gray-500'}`}>
              <Calendar size={18} />
              {isPassActive ? 'Planifier une visite' : 'Planification reservee au pass'}
              <ArrowUpRight size={16} />
            </button>

            {visitNotice && <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">{visitNotice}</div>}
            {isPassActive && <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700 flex items-center gap-2"><CheckCircle size={16} />Pass actif</div>}
          </aside>
        </div>
      </div>
    </div>
  );
};

const StatBox = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
    <p className="text-[11px] uppercase tracking-wide text-gray-500 font-bold">{label}</p>
    <p className="text-sm font-black text-gray-900 mt-1">{value}</p>
  </div>
);

export default ListingDetail;
