import { Listing, PropertyType } from '../types';
import { supabase } from './supabaseClient';

interface PropertyRow {
  id: string;
  created_at: string | null;
  title: string | null;
  description: string | null;
  price: number | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqft: number | null;
  category: string | null;
  image_urls: string[] | null;
  is_featured: boolean | null;
  status: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  has_internal_sanitary: boolean | null;
  advance_months: number | null;
  rental_conditions: string | null;
}

interface ServiceResult {
  ok: boolean;
  error?: string;
  notice?: string;
}

interface PassProfileRow {
  has_active_pass: boolean | null;
  pass_expiry: string | null;
}

const PROPERTY_SELECT = [
  'id',
  'created_at',
  'title',
  'description',
  'price',
  'address',
  'latitude',
  'longitude',
  'bedrooms',
  'bathrooms',
  'area_sqft',
  'category',
  'image_urls',
  'is_featured',
  'status',
  'owner_name',
  'owner_phone',
  'has_internal_sanitary',
  'advance_months',
  'rental_conditions',
].join(', ');

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80';
const TOGO_CENTER = { lat: 6.1375, lng: 1.2123 };

interface GetListingsOptions {
  includeUnavailable?: boolean;
}

const getPassExpiryDate = (days = 7): string => {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);
  return endDate.toISOString();
};

const normalizeCategory = (category: string | null): PropertyType => {
  const value = (category || '').toLowerCase().trim();

  if (value.includes('villa')) {
    return PropertyType.VILLA;
  }

  if (value.includes('studio')) {
    return PropertyType.STUDIO;
  }

  if (value.includes('chambre') || value.includes('room')) {
    return PropertyType.CHAMBRE;
  }

  return PropertyType.APARTMENT;
};

const extractMonths = (text: string, keyword: string): number | null => {
  const pattern = new RegExp(`(\\d+)\\s*mois?[^\\n]*${keyword}`, 'i');
  const match = text.match(pattern);
  if (!match) {
    return null;
  }

  return Number(match[1]);
};

const mapPropertyToListing = (row: PropertyRow): Listing => {
  const rentalConditions = row.rental_conditions || '';
  const sourceText = `${row.description || ''} ${rentalConditions}`.toLowerCase();
  const parsedAdvance = extractMonths(sourceText, 'avance');
  const parsedCaution = extractMonths(sourceText, 'caution');
  const agencyFeeMentioned = /frais d'?agence|commission/i.test(sourceText) && !/0\s*f|aucun/i.test(sourceText);
  const chargesIncluded = /charges?\s+incl|tout compris|charges incluses/i.test(sourceText);

  const bedrooms = Math.max(1, Number(row.bedrooms ?? 1));
  const bathrooms = Math.max(0, Number(row.bathrooms ?? (row.has_internal_sanitary ? 1 : 0)));
  const advance = Math.max(0, Number(row.advance_months ?? parsedAdvance ?? 0));
  const caution = Math.max(0, Number(parsedCaution ?? 0));
  const status = row.status || 'disponible';
  const isAvailable = status !== 'louee' && status !== 'suspendue';
  const images = row.image_urls && row.image_urls.length > 0 ? row.image_urls : [PLACEHOLDER_IMAGE];

  return {
    id: row.id,
    title: row.title || 'Chambre disponible',
    description: row.description || 'Description en cours de mise a jour.',
    price: Math.max(0, Number(row.price ?? 0)),
    location: row.address || 'Quartier non precise',
    coordinates: {
      lat: Number(row.latitude ?? TOGO_CENTER.lat),
      lng: Number(row.longitude ?? TOGO_CENTER.lng),
    },
    type: normalizeCategory(row.category),
    bedrooms,
    bathrooms,
    surface: Math.max(0, Number(row.area_sqft ?? 0)),
    images,
    features: {
      wifi: /wifi|fibre|internet/i.test(sourceText),
      ac: /clim|air condition/i.test(sourceText),
      furnished: /meuble|furnished/i.test(sourceText),
      parking: /parking|garage/i.test(sourceText),
      security: /secur|gardien|camera|surveillance/i.test(sourceText),
    },
    conditions: {
      advance,
      caution,
      agencyFee: agencyFeeMentioned,
      chargesIncluded,
    },
    verified: Boolean(row.is_featured ?? true),
    available: isAvailable,
    createdAt: row.created_at || new Date().toISOString(),
    address: row.address || undefined,
    ownerName: row.owner_name || undefined,
    ownerPhone: row.owner_phone || undefined,
    rentalConditions: row.rental_conditions || undefined,
    status,
  };
};

export const getListings = async (options: GetListingsOptions = {}): Promise<Listing[]> => {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase.from('properties').select(PROPERTY_SELECT).order('created_at', { ascending: false });
  if (error || !data) {
    return [];
  }

  const rows = (data as unknown as PropertyRow[]) || [];
  const mapped = rows
    .map(mapPropertyToListing)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  return options.includeUnavailable ? mapped : mapped.filter((listing) => listing.available);
};

export const getListingById = async (id: string): Promise<Listing | null> => {
  if (!supabase || !id) {
    return null;
  }

  const { data, error } = await supabase.from('properties').select(PROPERTY_SELECT).eq('id', id).maybeSingle();
  if (error || !data) {
    return null;
  }

  return mapPropertyToListing(data as unknown as PropertyRow);
};

export const activateSearchPass = async (): Promise<ServiceResult> => {
  if (!supabase) {
    return { ok: false, error: "Supabase n'est pas configure." };
  }

  const { data: authData } = await supabase.auth.getUser();
  const authUser = authData.user;
  if (!authUser) {
    return { ok: false, error: 'Connexion requise pour activer le pass.' };
  }

  const { data: activePass } = await supabase
    .from('search_passes')
    .select('id')
    .eq('user_id', authUser.id)
    .eq('status', 'active')
    .gt('end_date', new Date().toISOString())
    .limit(1);

  if (Array.isArray(activePass) && activePass.length > 0) {
    return { ok: true, notice: 'Un pass actif existe deja sur ce compte.' };
  }

  const transactionId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `tx-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const { error } = await supabase.from('search_passes').insert({
    user_id: authUser.id,
    transaction_id: transactionId,
    amount: 2000,
    status: 'active',
    end_date: getPassExpiryDate(7),
    unlocks_today: 0,
    last_unlock_date: new Date().toISOString().slice(0, 10),
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, notice: 'Pass actif pour 7 jours.' };
};

export const scheduleVisit = async (propertyId: string, visitDateIso: string): Promise<ServiceResult> => {
  if (!supabase) {
    return { ok: false, error: "Supabase n'est pas configure." };
  }

  if (!propertyId) {
    return { ok: false, error: 'Bien introuvable.' };
  }

  const { data: authData } = await supabase.auth.getUser();
  const authUser = authData.user;
  if (!authUser) {
    return { ok: false, error: 'Connexion requise pour planifier une visite.' };
  }

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('has_active_pass, pass_expiry')
    .eq('id', authUser.id)
    .maybeSingle();

  if (profileError) {
    return { ok: false, error: profileError.message };
  }

  const profile = profileData as unknown as PassProfileRow | null;
  const passExpiryMs = profile?.pass_expiry ? Date.parse(profile.pass_expiry) : null;
  const hasPass = Boolean(profile?.has_active_pass && (!passExpiryMs || passExpiryMs > Date.now()));
  if (!hasPass) {
    return { ok: false, error: 'Pass actif requis pour planifier une visite.' };
  }

  const visitDate = new Date(visitDateIso);
  if (Number.isNaN(visitDate.getTime())) {
    return { ok: false, error: 'Date de visite invalide.' };
  }

  const { error } = await supabase.from('bookings').insert({
    property_id: propertyId,
    user_id: authUser.id,
    visit_date: visitDate.toISOString(),
    status: 'pending',
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, notice: 'Demande de visite enregistree.' };
};

export const obfuscateCoordinates = (listing: Listing): Listing => ({
  ...listing,
  coordinates: {
    lat: Number((listing.coordinates.lat + 0.0045).toFixed(4)),
    lng: Number((listing.coordinates.lng - 0.0045).toFixed(4)),
  },
});
