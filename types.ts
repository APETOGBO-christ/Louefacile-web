export enum PropertyType {
  APARTMENT = 'Appartement',
  STUDIO = 'Studio',
  VILLA = 'Villa',
  CHAMBRE = 'Chambre'
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number; // Monthly rent
  location: string;
  coordinates: { lat: number; lng: number };
  type: PropertyType;
  bedrooms: number;
  bathrooms: number;
  surface: number;
  images: string[];
  features: {
    wifi: boolean;
    ac: boolean; // Air Conditioning
    furnished: boolean;
    parking: boolean;
    security: boolean;
  };
  conditions: {
    advance: number; // Number of months
    caution: number; // Number of months
    agencyFee: boolean; // Should be false or minimal per description
    chargesIncluded: boolean;
  };
  verified: boolean;
  available: boolean;
  createdAt: string;
  address?: string;
  ownerName?: string;
  ownerPhone?: string;
  rentalConditions?: string;
  status?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  hasActivePass: boolean;
  passExpiry?: string;
  dailyViewsLeft: number;
}

export interface PassPackage {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  dailyConsultations: number;
}

export interface Review {
  id: string;
  listingId: string;
  author: string;
  rating: number;
  date: string;
  content: string;
  verified: boolean;
}
