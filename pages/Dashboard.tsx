import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Clock3,
  KeyRound,
  LogOut,
  MapPin,
  ShieldCheck,
  UserCircle2,
} from 'lucide-react';
import { Listing, User } from '../types';
import { registerPasskey } from '../services/authService';
import { DashboardData, getDashboardData } from '../services/dashboardService';

interface DashboardProps {
  user: User;
  onLogout: () => Promise<void> | void;
}

interface PipelineItem {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  to: string;
}

const PASS_DAILY_LIMIT = 2;

const formatPrice = (value: number): string => `${value.toLocaleString('fr-FR')} FCFA`;

const formatDate = (value: string): string => new Date(value).toLocaleDateString('fr-FR');

const scoreListing = (listing: Listing): number => {
  let score = 0;
  if (listing.available) {
    score += 3;
  }
  if (listing.price >= 10000 && listing.price <= 75000) {
    score += 3;
  }
  if (listing.conditions.advance <= 3) {
    score += 2;
  }
  if (listing.features.security) {
    score += 1;
  }
  if (listing.verified) {
    score += 1;
  }
  return score;
};

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const passkeyEnabled = (import.meta.env.VITE_ENABLE_PASSKEY || 'false') === 'true';

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);
  const [passkeyNotice, setPasskeyNotice] = useState('');
  const [passkeyError, setPasskeyError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      const data = await getDashboardData(user.id);
      if (!isMounted) {
        return;
      }

      setDashboardData(data);
      setLoadError('');
      setIsLoading(false);
    };

    void loadData().catch(() => {
      if (!isMounted) {
        return;
      }

      setLoadError("Impossible de charger le dashboard pour l'instant.");
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [user.id]);

  const listingsById = useMemo(() => {
    const source = dashboardData?.listings || [];
    return new Map(source.map((listing) => [listing.id, listing]));
  }, [dashboardData]);

  const unlockedIdSet = useMemo(() => new Set(dashboardData?.unlockedIds || []), [dashboardData]);

  const favoriteListings = useMemo(
    () => (dashboardData?.favoriteIds || []).map((id) => listingsById.get(id)).filter(Boolean) as Listing[],
    [dashboardData, listingsById],
  );

  const recommendedListings = useMemo(() => {
    const source = [...(dashboardData?.listings || [])].filter((listing) => listing.available);
    source.sort((a, b) => scoreListing(b) - scoreListing(a) || Date.parse(b.createdAt) - Date.parse(a.createdAt));
    return source.slice(0, 5);
  }, [dashboardData]);

  const upcomingBookings = useMemo(
    () =>
      (dashboardData?.bookings || []).filter(
        (booking) => Date.parse(booking.visit_date) >= Date.now() && (booking.status || 'pending') !== 'cancelled',
      ),
    [dashboardData],
  );

  const pendingConclusions = useMemo(
    () => (dashboardData?.conclusions || []).filter((conclusion) => (conclusion.status || 'pending') === 'pending'),
    [dashboardData],
  );

  const closedConclusions = useMemo(
    () => (dashboardData?.conclusions || []).filter((conclusion) => (conclusion.status || 'pending') !== 'pending'),
    [dashboardData],
  );

  const postVisitCandidates = useMemo(() => {
    const withConclusion = new Set((dashboardData?.conclusions || []).map((item) => item.property_id));
    return (dashboardData?.bookings || [])
      .filter((booking) => Date.parse(booking.visit_date) < Date.now() && !withConclusion.has(booking.property_id))
      .slice(0, 3);
  }, [dashboardData]);

  const activePass = dashboardData?.activePass || null;
  const activePassExpiryMs = activePass?.end_date ? Date.parse(activePass.end_date) : null;
  const isPassActive = Boolean(activePass && activePass.status === 'active' && (!activePassExpiryMs || activePassExpiryMs > Date.now()));
  const today = new Date().toISOString().slice(0, 10);
  const unlocksUsedToday = isPassActive
    ? activePass?.last_unlock_date === today
      ? Number(activePass?.unlocks_today || 0)
      : 0
    : 0;
  const unlocksRemaining = Math.max(PASS_DAILY_LIMIT - unlocksUsedToday, 0);

  const toPipelineListing = (propertyId: string): Listing | null => listingsById.get(propertyId) || null;

  const toUnlockItems: PipelineItem[] = recommendedListings
    .filter((listing) => !unlockedIdSet.has(listing.id))
    .slice(0, 4)
    .map((listing) => ({
      id: `unlock-${listing.id}`,
      title: listing.title,
      subtitle: `${listing.location} - ${formatPrice(listing.price)}`,
      status: `Avance ${listing.conditions.advance} mois`,
      to: `/listing/${listing.id}`,
    }));

  const toVisitItems: PipelineItem[] = upcomingBookings.slice(0, 4).map((booking) => {
    const listing = toPipelineListing(booking.property_id);
    return {
      id: `booking-${booking.id}`,
      title: listing?.title || 'Bien reserve',
      subtitle: listing ? `${listing.location} - ${formatPrice(listing.price)}` : 'Annonce',
      status: `Visite le ${formatDate(booking.visit_date)}`,
      to: `/listing/${booking.property_id}`,
    };
  });

  const toPendingItems: PipelineItem[] = pendingConclusions.slice(0, 4).map((conclusion) => {
    const listing = toPipelineListing(conclusion.property_id);
    return {
      id: `pending-${conclusion.id}`,
      title: listing?.title || 'Decision en attente',
      subtitle: listing ? listing.location : 'Annonce',
      status: conclusion.confirmation_deadline
        ? `Confirmer avant le ${formatDate(conclusion.confirmation_deadline)}`
        : 'En attente de retour proprietaire',
      to: `/listing/${conclusion.property_id}`,
    };
  });

  const toClosedItems: PipelineItem[] = closedConclusions.slice(0, 4).map((conclusion) => {
    const listing = toPipelineListing(conclusion.property_id);
    const status = conclusion.status === 'confirmed' ? 'Prise confirmee' : 'Non retenue';
    return {
      id: `closed-${conclusion.id}`,
      title: listing?.title || 'Decision finalisee',
      subtitle: listing ? listing.location : 'Annonce',
      status,
      to: `/listing/${conclusion.property_id}`,
    };
  });

  const handleLogoutClick = async () => {
    await onLogout();
    navigate('/');
  };

  const handleEnablePasskey = async () => {
    setIsPasskeyLoading(true);
    setPasskeyNotice('');
    setPasskeyError('');

    const result = await registerPasskey(`${user.name} - LoueFacile`);
    if (!result.ok) {
      setPasskeyError(result.error || "Impossible d'activer la passkey.");
      setIsPasskeyLoading(false);
      return;
    }

    setPasskeyNotice(result.notice || 'Passkey activee avec succes.');
    setIsPasskeyLoading(false);
  };

  return (
    <section className="min-h-screen bg-stone-50 pt-28 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] font-bold text-blue-700 mb-2">Dashboard mission</p>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900">Bonjour, {user.name}</h1>
          </div>
          <button
            onClick={() => void handleLogoutClick()}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2.5 font-bold text-slate-700 hover:border-stone-400 transition-colors"
          >
            <LogOut size={16} />
            Se deconnecter
          </button>
        </div>

        {loadError && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{loadError}</div>}

        {isLoading ? (
          <div className="rounded-3xl border border-stone-300 bg-white p-10 text-center text-slate-500">Chargement du dashboard...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <MetricCard icon={<UserCircle2 size={18} />} title="Compte" value={user.email} />
              <MetricCard
                icon={<ShieldCheck size={18} />}
                title="Pass"
                value={isPassActive ? 'Actif' : 'Inactif'}
                helper={isPassActive && activePass?.end_date ? `Expire le ${formatDate(activePass.end_date)}` : 'Activez un pass pour debloquer'}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
              <PipelineColumn title="A debloquer" items={toUnlockItems} emptyText="Vous avez deja debloque vos priorites." />
              <PipelineColumn title="Visites prevues" items={toVisitItems} emptyText="Aucune visite planifiee." />
              <PipelineColumn title="En confirmation" items={toPendingItems} emptyText="Aucune confirmation en cours." />
              <PipelineColumn title="Pris / loupe" items={toClosedItems} emptyText="Pas encore de decision finalisee." />
            </div>

            <div className="rounded-3xl border border-stone-300 bg-white p-6 shadow-sm mb-8">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-2xl font-black text-slate-900">Mes favoris</h3>
                <Link to="/search" className="text-blue-700 font-bold hover:text-blue-800 transition-colors inline-flex items-center gap-1">
                  Voir tout
                  <ArrowRight size={16} />
                </Link>
              </div>
              {favoriteListings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-8 text-center text-slate-600">
                  Aucun favori pour le moment. Ajoutez des annonces en favoris depuis la recherche.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {favoriteListings.map((listing) => (
                    <Link key={listing.id} to={`/listing/${listing.id}`} className="rounded-2xl border border-stone-300 bg-stone-50 p-4 hover:border-stone-400 transition-colors">
                      <p className="text-xs uppercase tracking-wide font-black text-blue-700 mb-1">{listing.type}</p>
                      <h4 className="font-black text-slate-900 text-lg leading-tight mb-1">{listing.title}</h4>
                      <p className="text-sm text-slate-500 mb-3">{listing.location}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 font-semibold mb-3">
                        <span>{formatPrice(listing.price)}</span>
                        <span>Avance {listing.conditions.advance} mois</span>
                      </div>
                      <p className="text-xs text-slate-600 inline-flex items-center gap-1">
                        <MapPin size={12} />
                        {unlockedIdSet.has(listing.id) ? 'Infos deja debloquees' : 'Pret a analyser'}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 rounded-3xl border border-stone-300 bg-white p-6 shadow-sm">
                <h3 className="text-2xl font-black text-slate-900 mb-4">Apres visite: prochaine decision</h3>
                {postVisitCandidates.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-6 text-slate-600">
                    Aucune visite passee sans decision. Des qu'une visite est terminee, vous pourrez confirmer rapidement votre choix.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {postVisitCandidates.map((booking) => {
                      const listing = toPipelineListing(booking.property_id);
                      return (
                        <Link key={booking.id} to={`/listing/${booking.property_id}`} className="flex items-center justify-between gap-4 rounded-2xl border border-stone-300 p-4 hover:border-stone-400 transition-colors">
                          <div>
                            <p className="font-black text-slate-900">{listing?.title || 'Bien visite'}</p>
                            <p className="text-sm text-slate-500">{listing?.location || 'Annonce'} - visite du {formatDate(booking.visit_date)}</p>
                          </div>
                          <span className="rounded-xl bg-blue-700 text-white px-3 py-2 text-xs font-extrabold whitespace-nowrap">Je prends / Je passe</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-stone-300 bg-white p-6 shadow-sm">
                <h3 className="text-2xl font-black text-slate-900 mb-4">Mon pass</h3>
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 mb-4">
                  <p className="text-sm font-bold text-blue-800">{isPassActive ? 'Pass actif' : 'Pass inactif'}</p>
                  <p className="text-xs text-slate-600 mt-1">
                    {isPassActive && activePass?.end_date
                      ? `Valable jusqu'au ${formatDate(activePass.end_date)}`
                      : "Activez un pass pour debloquer la carte, les coordonnees et la planification."}
                  </p>
                </div>
                <div className="space-y-2 text-sm text-slate-700 mb-6">
                  <p>Deblocages restants aujourd'hui: <span className="font-black text-slate-900">{isPassActive ? unlocksRemaining : 0}</span></p>
                  <p>Deblocages utilises aujourd'hui: <span className="font-black text-slate-900">{isPassActive ? unlocksUsedToday : 0}</span></p>
                </div>
                <Link to="/search" className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 text-white px-4 py-3 font-extrabold hover:bg-blue-800 transition-colors">
                  Continuer ma recherche
                  <ArrowRight size={16} />
                </Link>

                {passkeyEnabled && (
                  <>
                    <div className="h-px bg-stone-200 my-6" />
                    <button
                      onClick={() => void handleEnablePasskey()}
                      disabled={isPasskeyLoading}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-stone-100 text-slate-800 px-4 py-3 font-bold hover:border-stone-400 transition-colors disabled:opacity-60 mb-3"
                    >
                      <KeyRound size={16} />
                      {isPasskeyLoading ? 'Activation en cours...' : 'Activer la passkey'}
                    </button>
                    {passkeyError && <p className="text-xs text-red-600 font-semibold mb-2">{passkeyError}</p>}
                    {passkeyNotice && <p className="text-xs text-blue-700 font-semibold mb-2">{passkeyNotice}</p>}
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

const MetricCard = ({
  icon,
  title,
  value,
  helper,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  helper?: string;
}) => (
  <div className="rounded-3xl border border-stone-300 bg-white p-5 shadow-sm">
    <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-3">{icon}</div>
    <p className="text-xs uppercase tracking-wide font-bold text-slate-500 mb-1">{title}</p>
    <p className="text-lg font-black text-slate-900 break-all">{value}</p>
    {helper && <p className="text-xs text-slate-500 mt-1">{helper}</p>}
  </div>
);

const PipelineColumn = ({ title, items, emptyText }: { title: string; items: PipelineItem[]; emptyText: string }) => (
  <div className="rounded-3xl border border-stone-300 bg-white p-4 shadow-sm">
    <h4 className="text-lg font-black text-slate-900 mb-3">{title}</h4>
    {items.length === 0 ? (
      <p className="text-sm text-slate-500 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-3">{emptyText}</p>
    ) : (
      <div className="space-y-3">
        {items.map((item) => (
          <Link key={item.id} to={item.to} className="block rounded-xl border border-stone-300 p-3 hover:border-stone-400 transition-colors">
            <p className="font-black text-slate-900 text-sm leading-tight mb-1">{item.title}</p>
            <p className="text-xs text-slate-500 mb-2">{item.subtitle}</p>
            <p className="text-xs font-bold text-blue-700 inline-flex items-center gap-1">
              <Clock3 size={12} />
              {item.status}
            </p>
          </Link>
        ))}
      </div>
    )}
  </div>
);

export default Dashboard;
