import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Listing } from '../types';

interface ListingMapProps {
  listings: Listing[];
  center?: [number, number];
  zoom?: number;
  className?: string;
  interactive?: boolean;
}

const defaultCenter: [number, number] = [5.33, -4.02];

const createPopupContent = (listing: Listing): HTMLElement => {
  const link = document.createElement('a');
  link.href = `#/listing/${encodeURIComponent(listing.id)}`;
  link.className = 'block group text-decoration-none font-sans min-w-[200px]';

  const imageWrap = document.createElement('div');
  imageWrap.className = 'relative h-24 w-full overflow-hidden rounded-t-lg';

  const image = document.createElement('img');
  image.src = listing.images[0];
  image.alt = listing.title;
  image.className = 'w-full h-full object-cover transition-transform group-hover:scale-105';

  const typeBadge = document.createElement('div');
  typeBadge.className = 'absolute top-2 left-2 bg-white/90 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-indigo-600 shadow-sm';
  typeBadge.textContent = listing.type;

  imageWrap.appendChild(image);
  imageWrap.appendChild(typeBadge);

  const content = document.createElement('div');
  content.className = 'p-3 bg-white rounded-b-lg';

  const title = document.createElement('h3');
  title.className = 'font-bold text-gray-900 text-sm truncate mb-1';
  title.textContent = listing.title;

  const row = document.createElement('div');
  row.className = 'flex items-center justify-between';

  const location = document.createElement('span');
  location.className = 'text-xs text-gray-500 truncate max-w-[100px]';
  location.textContent = listing.location;

  const price = document.createElement('span');
  price.className = 'font-bold text-indigo-600 text-sm';
  price.textContent = `${listing.price.toLocaleString('fr-FR')} F`;

  row.appendChild(location);
  row.appendChild(price);
  content.appendChild(title);
  content.appendChild(row);

  link.appendChild(imageWrap);
  link.appendChild(content);

  return link;
};

const ListingMap: React.FC<ListingMapProps> = ({
  listings,
  center,
  zoom = 13,
  className = 'h-full w-full',
  interactive = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current) {
      return;
    }

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        scrollWheelZoom: interactive,
        dragging: interactive,
        attributionControl: false,
      });

      mapInstanceRef.current = map;

      const streets = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
      });

      const satellite = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution:
            'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        },
      );

      streets.addTo(map);

      if (interactive) {
        L.control.zoom({ position: 'bottomright' }).addTo(map);
        L.control.layers({ Plan: streets, Satellite: satellite }, undefined, { position: 'topright' }).addTo(map);
      }
    }

    const map = mapInstanceRef.current;
    if (!map) {
      return;
    }

    if (interactive) {
      map.scrollWheelZoom.enable();
      map.dragging.enable();
    } else {
      map.scrollWheelZoom.disable();
      map.dragging.disable();
    }

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const createCustomIcon = () =>
      L.divIcon({
        className: 'custom-marker-icon',
        html: '<div class="marker-pin"></div>',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -36],
      });

    const bounds = L.latLngBounds([]);

    listings.forEach((listing, index) => {
      const lat = listing.coordinates.lat;
      const lng = listing.coordinates.lng;

      const angle = (index % 8) * (Math.PI / 4);
      const radius = 0.0002 * (Math.floor(index / 8) + 1);
      const offsetLat = lat + Math.sin(angle) * radius;
      const offsetLng = lng + Math.cos(angle) * radius;

      const marker = L.marker([offsetLat, offsetLng], { icon: createCustomIcon() })
        .addTo(map)
        .bindPopup(createPopupContent(listing), {
          closeButton: false,
          className: 'custom-popup',
        });

      markersRef.current.push(marker);
      bounds.extend([offsetLat, offsetLng]);
    });

    if (center) {
      map.setView(center, zoom);
    } else if (listings.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } else {
      map.setView(defaultCenter, zoom);
    }

    const resizeTimer = window.setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      window.clearTimeout(resizeTimer);
    };
  }, [listings, center, zoom, interactive]);

  return (
    <div className={`relative ${className} overflow-hidden`}>
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />
    </div>
  );
};

export default ListingMap;
