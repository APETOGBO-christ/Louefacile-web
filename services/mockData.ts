import { Listing, PropertyType, Review } from '../types';

export const MOCK_LISTINGS: Listing[] = [
  {
    id: '1',
    title: 'Appartement Moderne - Marcory Zone 4',
    description: 'Magnifique 3 pièces situé en plein cœur de Zone 4. Finitions haut de gamme, sécurisé 24h/24. Cuisine équipée. Pas de frais de visite cachés.',
    price: 350000,
    location: 'Marcory, Abidjan',
    coordinates: { lat: 5.30, lng: -4.00 },
    type: PropertyType.APARTMENT,
    bedrooms: 2,
    bathrooms: 2,
    surface: 85,
    images: [
      'https://picsum.photos/800/600?random=1',
      'https://picsum.photos/800/600?random=2',
      'https://picsum.photos/800/600?random=3'
    ],
    features: {
      wifi: true,
      ac: true,
      furnished: false,
      parking: true,
      security: true
    },
    conditions: {
      advance: 2,
      caution: 2,
      agencyFee: false,
      chargesIncluded: true
    },
    verified: true,
    available: true,
    createdAt: '2023-10-25T10:00:00Z'
  },
  {
    id: '2',
    title: 'Studio Cosy - Cocody Riviera',
    description: 'Studio américain propre et spacieux, idéal pour étudiant ou jeune cadre. Compteur individuel. Accès facile.',
    price: 120000,
    location: 'Cocody Riviera 2',
    coordinates: { lat: 5.35, lng: -3.98 },
    type: PropertyType.STUDIO,
    bedrooms: 1,
    bathrooms: 1,
    surface: 35,
    images: [
      'https://picsum.photos/800/600?random=4',
      'https://picsum.photos/800/600?random=5'
    ],
    features: {
      wifi: true,
      ac: true,
      furnished: true,
      parking: false,
      security: true
    },
    conditions: {
      advance: 3,
      caution: 1,
      agencyFee: false,
      chargesIncluded: false
    },
    verified: true,
    available: true,
    createdAt: '2023-10-26T14:30:00Z'
  },
  {
    id: '3',
    title: 'Villa Duplex - Bingerville',
    description: 'Grande villa familiale avec jardin et garage. Quartier calme et résidentiel. Parfait pour une grande famille.',
    price: 600000,
    location: 'Bingerville, Cité FEH',
    coordinates: { lat: 5.36, lng: -3.90 },
    type: PropertyType.VILLA,
    bedrooms: 5,
    bathrooms: 4,
    surface: 250,
    images: [
      'https://picsum.photos/800/600?random=6',
      'https://picsum.photos/800/600?random=7'
    ],
    features: {
      wifi: false,
      ac: true,
      furnished: false,
      parking: true,
      security: true
    },
    conditions: {
      advance: 4,
      caution: 2,
      agencyFee: false,
      chargesIncluded: false
    },
    verified: true,
    available: true,
    createdAt: '2023-10-24T09:15:00Z'
  },
   {
    id: '4',
    title: 'Chambre Haut Standing - Yopougon',
    description: 'Chambre autonome avec douche interne et placards. Cour commune propre.',
    price: 45000,
    location: 'Yopougon, Maroc',
    coordinates: { lat: 5.34, lng: -4.05 },
    type: PropertyType.CHAMBRE,
    bedrooms: 1,
    bathrooms: 1,
    surface: 20,
    images: [
      'https://picsum.photos/800/600?random=8'
    ],
    features: {
      wifi: false,
      ac: false,
      furnished: false,
      parking: false,
      security: true
    },
    conditions: {
      advance: 5,
      caution: 1,
      agencyFee: false,
      chargesIncluded: true
    },
    verified: true,
    available: true,
    createdAt: '2023-10-20T11:20:00Z'
  }
];

export const MOCK_REVIEWS: Review[] = [
  {
    id: 'r1',
    listingId: '1',
    author: 'Awa D.',
    rating: 5,
    date: '2023-10-28',
    content: 'Exactement comme sur les photos. Le quartier est vraiment calme et sécurisé. Je recommande !',
    verified: true
  },
  {
    id: 'r2',
    listingId: '1',
    author: 'Koffi S.',
    rating: 4,
    date: '2023-10-30',
    content: 'Bel appartement, propre. Juste un peu de bruit le soir à cause du maquis pas loin, mais supportable.',
    verified: true
  },
  {
    id: 'r3',
    listingId: '2',
    author: 'Marie-Paul',
    rating: 5,
    date: '2023-10-29',
    content: 'Propriétaire très gentil. Le studio est nickel. La visite s\'est très bien passée.',
    verified: true
  }
];