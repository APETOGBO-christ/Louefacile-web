import { Listing } from '../types';
import { getListings } from './listingService';
import { supabase } from './supabaseClient';

interface FavoriteRow {
  property_id: string;
}

interface UnlockRow {
  property_id: string;
}

interface BookingRow {
  id: string;
  property_id: string;
  visit_date: string;
  status: string | null;
  created_at: string;
}

interface ConclusionRow {
  id: string;
  property_id: string;
  status: string | null;
  amount: number | null;
  confirmation_deadline: string | null;
  created_at: string;
}

interface SearchPassRow {
  id: string;
  status: string | null;
  end_date: string | null;
  unlocks_today: number | null;
  last_unlock_date: string | null;
  amount: number | null;
}

export interface DashboardData {
  listings: Listing[];
  favoriteIds: string[];
  unlockedIds: string[];
  bookings: BookingRow[];
  conclusions: ConclusionRow[];
  activePass: SearchPassRow | null;
}

const readData = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

export const getDashboardData = async (userId: string): Promise<DashboardData> => {
  const listingsPromise = getListings({ includeUnavailable: true });

  if (!supabase || !userId) {
    return {
      listings: await listingsPromise,
      favoriteIds: [],
      unlockedIds: [],
      bookings: [],
      conclusions: [],
      activePass: null,
    };
  }

  const [listings, favoritesRes, unlocksRes, bookingsRes, conclusionsRes, passRes] = await Promise.all([
    listingsPromise,
    supabase.from('favorites').select('property_id').eq('user_id', userId),
    supabase.from('property_unlocks').select('property_id').eq('user_id', userId),
    supabase.from('bookings').select('id, property_id, visit_date, status, created_at').eq('user_id', userId).order('visit_date', { ascending: true }),
    supabase
      .from('rental_conclusions')
      .select('id, property_id, status, amount, confirmation_deadline, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('search_passes')
      .select('id, status, end_date, unlocks_today, last_unlock_date, amount')
      .eq('user_id', userId)
      .order('end_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const favoriteRows = favoritesRes.error ? [] : readData<FavoriteRow>(favoritesRes.data);
  const unlockRows = unlocksRes.error ? [] : readData<UnlockRow>(unlocksRes.data);
  const bookingRows = bookingsRes.error ? [] : readData<BookingRow>(bookingsRes.data);
  const conclusionRows = conclusionsRes.error ? [] : readData<ConclusionRow>(conclusionsRes.data);
  const passRow = passRes.error ? null : ((passRes.data as unknown as SearchPassRow | null) || null);

  return {
    listings,
    favoriteIds: favoriteRows.map((row) => row.property_id),
    unlockedIds: unlockRows.map((row) => row.property_id),
    bookings: bookingRows,
    conclusions: conclusionRows,
    activePass: passRow,
  };
};
