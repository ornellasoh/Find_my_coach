import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CoachProfile } from '../../types';
import { calculateDistanceKm, formatDistance } from '../../utils/geo';
import { Star, MapPin, CheckCircle2, ArrowRight, Crosshair, Sparkles, Navigation, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../context/AppContext';

interface CoachMapProps {
  coaches: CoachProfile[];
  userLocation: { latitude: number; longitude: number } | null;
  selectedCoachId?: string | null;
  onSelectCoach?: (coach: CoachProfile) => void;
  onSearchThisArea?: (center: { lat: number; lng: number }, radiusKm: number) => void;
  className?: string;
  height?: string;
}

export const CoachMap: React.FC<CoachMapProps> = ({
  coaches,
  userLocation,
  selectedCoachId,
  onSelectCoach,
  onSearchThisArea,
  className = '',
  height = 'calc(100vh - 240px)'
}) => {
  const { navigateTo, selectCoachForBooking } = useApp();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const circleLayerRef = useRef<L.Circle | null>(null);

  const [activeCoach, setActiveCoach] = useState<CoachProfile | null>(() => {
    if (selectedCoachId) {
      return coaches.find((c) => c.id === selectedCoachId) || null;
    }
    return null;
  });

  const [showSearchAreaBtn, setShowSearchAreaBtn] = useState(false);
  const [mapCenterState, setMapCenterState] = useState<{ lat: number; lng: number } | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // already initialized

    // Default center: Paris (or user location if available)
    const initialLat = userLocation ? userLocation.latitude : 48.8566;
    const initialLng = userLocation ? userLocation.longitude : 2.3522;
    const initialZoom = userLocation ? 12 : 11;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: false
    });

    // CartoDB Voyager tiles (modern, high contrast, clean typography)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    // Detect user panning/zooming to show "Rechercher dans cette zone"
    map.on('moveend', () => {
      const center = map.getCenter();
      setMapCenterState({ lat: center.lat, lng: center.lng });
      setShowSearchAreaBtn(true);
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update User Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userLocation) {
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([userLocation.latitude, userLocation.longitude]);
      } else {
        const userIcon = L.divIcon({
          className: 'custom-user-pin',
          html: `
            <div class="relative flex items-center justify-center">
              <span class="animate-ping absolute inline-flex h-7 w-7 rounded-full bg-[#00D664] opacity-50"></span>
              <span class="relative inline-flex rounded-full h-4 w-4 bg-[#00B050] border-2 border-white shadow-md"></span>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        userMarkerRef.current = L.marker([userLocation.latitude, userLocation.longitude], {
          icon: userIcon,
          zIndexOffset: 1000
        }).addTo(map);
      }
    } else if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }
  }, [userLocation]);

  // Update Coach Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    coaches.forEach((coach) => {
      if (!coach.latitude || !coach.longitude) return;

      const isSelected = activeCoach?.id === coach.id;

      // Custom Pin HTML
      const pinHtml = `
        <div class="group relative cursor-pointer transform transition duration-200 ${isSelected ? 'scale-110 z-50' : 'hover:scale-105'}">
          <div class="flex items-center gap-1 px-2.5 py-1 rounded-full shadow-md font-extrabold text-xs transition border ${
            isSelected
              ? 'bg-[#0F172A] text-[#00FD83] border-[#00FD83] ring-2 ring-[#00FD83]/30 shadow-lg'
              : 'bg-white text-[#0F172A] border-slate-200 hover:border-[#00D664]'
          }">
            <span class="text-[10px] text-[#00B050]">⚡</span>
            <span>${coach.hourlyRate}€</span>
          </div>
          <!-- Pointer arrow -->
          <div class="w-0 h-0 mx-auto border-l-4 border-r-4 border-t-4 ${
            isSelected ? 'border-t-[#0F172A]' : 'border-t-white'
          } border-l-transparent border-r-transparent shadow-xs"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-coach-marker',
        html: pinHtml,
        iconSize: [60, 32],
        iconAnchor: [30, 32]
      });

      const marker = L.marker([coach.latitude, coach.longitude], { icon: customIcon });

      marker.on('click', () => {
        setActiveCoach(coach);
        if (onSelectCoach) onSelectCoach(coach);
        map.panTo([coach.latitude, coach.longitude], { animate: true, duration: 0.5 });
      });

      markersLayer.addLayer(marker);
    });

    // Auto-fit bounds if we have coaches and no selected coach
    if (coaches.length > 0 && !activeCoach) {
      const validCoords = coaches
        .filter((c) => c.latitude && c.longitude)
        .map((c) => [c.latitude, c.longitude] as [number, number]);

      if (userLocation) {
        validCoords.push([userLocation.latitude, userLocation.longitude]);
      }

      if (validCoords.length > 0) {
        const bounds = L.latLngBounds(validCoords);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
      }
    }
  }, [coaches, activeCoach]);

  // Recenter map on user location
  const handleRecenterUser = () => {
    if (!mapInstanceRef.current || !userLocation) return;
    mapInstanceRef.current.flyTo([userLocation.latitude, userLocation.longitude], 13, {
      duration: 0.8
    });
  };

  // Trigger search in area
  const handleSearchThisAreaClick = () => {
    if (!mapInstanceRef.current) return;
    const center = mapInstanceRef.current.getCenter();
    const bounds = mapInstanceRef.current.getBounds();
    const northEast = bounds.getNorthEast();
    const radius = calculateDistanceKm(center.lat, center.lng, northEast.lat, northEast.lng);

    setShowSearchAreaBtn(false);
    if (onSearchThisArea) {
      onSearchThisArea({ lat: center.lat, lng: center.lng }, Math.max(2, Math.round(radius)));
    }
  };

  // Calculate distance for active coach
  const distanceToActiveCoach =
    userLocation && activeCoach
      ? calculateDistanceKm(
          userLocation.latitude,
          userLocation.longitude,
          activeCoach.latitude,
          activeCoach.longitude
        )
      : null;

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm ${className}`}>
      {/* The Map Element */}
      <div ref={mapContainerRef} style={{ height, width: '100%' }} className="z-10 bg-slate-100" />

      {/* Floating Action: Search this area */}
      <AnimatePresence>
        {showSearchAreaBtn && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-3 left-1/2 -translate-x-1/2 z-20"
          >
            <button
              onClick={handleSearchThisAreaClick}
              className="px-4 py-2 bg-white/95 backdrop-blur-md text-[#0F172A] rounded-full text-xs font-black shadow-lg border border-slate-200/90 hover:bg-[#00D664] hover:text-white transition flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#00B050]" />
              <span>Rechercher dans cette zone</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top-Right Map Controls */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
        {userLocation && (
          <button
            onClick={handleRecenterUser}
            className="w-9 h-9 rounded-xl bg-white/95 backdrop-blur-md text-slate-700 shadow-md border border-slate-200/80 flex items-center justify-center hover:bg-[#00D664]/10 hover:text-[#008A3E] transition cursor-pointer"
            title="Ma position"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        )}

        <div className="flex flex-col bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-slate-200/80 overflow-hidden">
          <button
            onClick={() => mapInstanceRef.current?.zoomIn()}
            className="w-9 h-9 flex items-center justify-center text-slate-700 hover:bg-slate-50 border-b border-slate-100 text-base font-bold cursor-pointer"
          >
            +
          </button>
          <button
            onClick={() => mapInstanceRef.current?.zoomOut()}
            className="w-9 h-9 flex items-center justify-center text-slate-700 hover:bg-slate-50 text-base font-bold cursor-pointer"
          >
            −
          </button>
        </div>
      </div>

      {/* Bottom Floating Mini Coach Card */}
      <AnimatePresence>
        {activeCoach && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute bottom-3 left-3 right-3 z-20 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-3.5"
          >
            <button
              onClick={() => setActiveCoach(null)}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-start gap-3">
              {/* Photo */}
              <div className="relative shrink-0">
                <img
                  src={activeCoach.photo}
                  alt={activeCoach.name}
                  className="w-14 h-14 rounded-xl object-cover border border-slate-100 shadow-xs"
                />
                {activeCoach.verificationStatus === 'verified' && (
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#00D664] text-[#0F172A] rounded-full flex items-center justify-center text-[10px] shadow-xs">
                    ✓
                  </span>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-sm font-extrabold text-[#0F172A] truncate">
                    {activeCoach.name}
                  </h3>
                  <div className="flex items-center gap-0.5 text-[#EAB308] text-xs font-bold shrink-0">
                    <Star className="w-3 h-3 fill-current" />
                    <span>{activeCoach.rating.toFixed(1)}</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      ({activeCoach.reviewCount})
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 truncate mt-0.5 font-medium">
                  {activeCoach.title}
                </p>

                {/* Formats & Location Info */}
                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 font-medium">
                  <span className="flex items-center gap-0.5 text-slate-600">
                    <MapPin className="w-3 h-3 text-[#00B050]" />
                    <span>{activeCoach.city}</span>
                  </span>

                  {distanceToActiveCoach !== null && (
                    <span className="px-1.5 py-0.5 bg-emerald-50 text-[#008A3E] font-bold rounded-md text-[10px]">
                      à {formatDistance(distanceToActiveCoach)}
                    </span>
                  )}

                  {activeCoach.interventionRadiusKm > 0 && (
                    <span className="text-[10px] text-slate-400">
                      • Rayon {activeCoach.interventionRadiusKm}km
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Row: Price + Actions */}
            <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-100">
              <div>
                <span className="text-[10px] text-slate-400 font-medium block">Tarif séance</span>
                <span className="text-base font-black text-[#0F172A]">
                  {activeCoach.hourlyRate} €
                  <span className="text-xs font-semibold text-slate-400">/h</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    selectCoachForBooking(activeCoach);
                    navigateTo('coach_profile');
                  }}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Voir profil
                </button>

                <button
                  onClick={() => {
                    selectCoachForBooking(activeCoach);
                    navigateTo('booking_calendar');
                  }}
                  className="px-3.5 py-1.5 bg-[#00D664] text-[#0F172A] hover:bg-[#00B050] rounded-xl text-xs font-black shadow-xs transition flex items-center gap-1 cursor-pointer"
                >
                  <span>Réserver</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
