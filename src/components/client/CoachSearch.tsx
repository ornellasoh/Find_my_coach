import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ArrowLeft, 
  Search, 
  SlidersHorizontal, 
  MapPin, 
  Star, 
  X, 
  Sparkles, 
  Video, 
  Check, 
  Calendar, 
  RotateCcw,
  List,
  Map as MapIcon,
  Navigation,
  CheckCircle2,
  Filter,
  Layers,
  Home,
  Building2,
  Trees,
  Wallet
} from 'lucide-react';
import { Chip, IconButton, ScreenHeader, SearchField } from '../ui/fmc';
import { motion, AnimatePresence } from 'motion/react';
import { CoachCard } from '../common/CoachCard';
import { CoachMap } from '../common/CoachMap';
import { CoachingFormat } from '../../types';
import { calculateDistanceKm, CITY_PRESETS, findCityByName } from '../../utils/geo';

export const CoachSearch: React.FC = () => {
  const { 
    coaches, 
    categories,
    goBack, 
    searchQuery, 
    setSearchQuery,
    selectedCategory,
    setSelectedCategory
  } = useApp();

  // View mode: 'list' vs 'map'
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // User location state
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<'idle' | 'prompt' | 'granted' | 'denied'>('idle');
  const [locationSearchText, setLocationSearchText] = useState<string>('');
  const [activeCityFilter, setActiveCityFilter] = useState<string | null>(null);

  // Filters State
  const [showFiltersModal, setShowFiltersModal] = useState<boolean>(false);
  const [maxPrice, setMaxPrice] = useState<number>(200);
  const [minRating, setMinRating] = useState<number>(0);
  const [selectedFormats, setSelectedFormats] = useState<CoachingFormat[]>([]);
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'today' | 'tomorrow' | 'week'>('all');
  const [radiusKm, setRadiusKm] = useState<number>(50); // default 50km
  const [onlyVerified, setOnlyVerified] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'recommended' | 'distance' | 'rating' | 'price_asc' | 'price_desc'>('recommended');

  // Attempt browser geolocation on demand or automatically
  const requestUserLocation = () => {
    if (!navigator.geolocation) {
      setLocationPermissionStatus('denied');
      return;
    }
    setLocationPermissionStatus('prompt');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        });
        setLocationPermissionStatus('granted');
        setActiveCityFilter(null);
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        setLocationPermissionStatus('denied');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Handle manual city selection
  const handleSelectCityPreset = (cityName: string) => {
    const city = findCityByName(cityName);
    if (city) {
      setUserLocation({
        latitude: city.latitude,
        longitude: city.longitude
      });
      setActiveCityFilter(city.name);
      setLocationSearchText(city.name);
    }
  };

  const resetFilters = () => {
    setMaxPrice(200);
    setMinRating(0);
    setSelectedFormats([]);
    setAvailabilityFilter('all');
    setRadiusKm(50);
    setOnlyVerified(false);
    setSelectedCategory(null);
    setSearchQuery('');
    setActiveCityFilter(null);
    setSortBy('recommended');
  };

  const hasActiveFilters = 
    maxPrice < 200 || 
    minRating > 0 || 
    selectedFormats.length > 0 || 
    availabilityFilter !== 'all' || 
    radiusKm < 50 ||
    onlyVerified ||
    selectedCategory !== null || 
    searchQuery.trim().length > 0 ||
    activeCityFilter !== null;

  // Toggle format selection
  const toggleFormat = (fmt: CoachingFormat) => {
    setSelectedFormats(prev => 
      prev.includes(fmt) ? prev.filter(f => f !== fmt) : [...prev, fmt]
    );
  };

  // Filtered and sorted coaches
  const filteredCoaches = coaches
    .filter(c => c.isActive)
    .filter(c => {
      // Search text query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesTitle = c.title.toLowerCase().includes(q);
        const matchesSpecialty = c.specialties.some(s => s.toLowerCase().includes(q));
        const matchesLocation = c.location.toLowerCase().includes(q);
        const matchesCategory = c.category.toLowerCase().includes(q);
        if (!matchesName && !matchesTitle && !matchesSpecialty && !matchesLocation && !matchesCategory) return false;
      }
      
      // Category
      if (selectedCategory) {
        const catObj = categories.find(cat => cat.slug === selectedCategory);
        if (catObj && c.category !== catObj.name && !c.specialties.some(s => s.toLowerCase() === catObj.name.toLowerCase())) {
          return false;
        }
      }

      // Max price
      if (c.hourlyRate > maxPrice) return false;

      // Min rating
      if (c.rating < minRating) return false;

      // Verification filter
      if (onlyVerified && c.verificationStatus !== 'verified') return false;

      // Coaching formats
      if (selectedFormats.length > 0) {
        const hasMatchingFormat = selectedFormats.some(f => c.formats?.includes(f));
        if (!hasMatchingFormat) return false;
      }

      // Availability filter
      if (availabilityFilter === 'today' && !c.nextAvailabilitySummary?.toLowerCase().includes("aujourd'hui")) return false;
      if (availabilityFilter === 'tomorrow' && !c.nextAvailabilitySummary?.toLowerCase().includes('demain')) return false;

      // Geographic Distance / Radius filter
      if (userLocation && c.latitude && c.longitude && radiusKm < 50) {
        const dist = calculateDistanceKm(userLocation.latitude, userLocation.longitude, c.latitude, c.longitude);
        if (dist > radiusKm) {
          // If the coach does online coaching and online is not explicitly excluded, allow them
          if (!selectedFormats.includes('home') && !selectedFormats.includes('coach_location') && c.isOnlineCoaching) {
            // Keep online coach
          } else {
            return false;
          }
        }
      }

      // City filter
      if (activeCityFilter && c.city.toLowerCase() !== activeCityFilter.toLowerCase()) {
        if (!c.isOnlineCoaching) return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'price_asc') return a.hourlyRate - b.hourlyRate;
      if (sortBy === 'price_desc') return b.hourlyRate - a.hourlyRate;
      if (sortBy === 'distance' && userLocation && a.latitude && b.latitude) {
        const distA = calculateDistanceKm(userLocation.latitude, userLocation.longitude, a.latitude, a.longitude);
        const distB = calculateDistanceKm(userLocation.latitude, userLocation.longitude, b.latitude, b.longitude);
        return distA - distB;
      }
      // Default: Verified + Elite first, then rating
      if (a.isElite !== b.isElite) return a.isElite ? -1 : 1;
      return b.rating - a.rating;
    });

  const sortLabels: Record<typeof sortBy, string> = {
    recommended: 'Popularité',
    distance: 'Distance',
    rating: 'Note',
    price_asc: 'Prix croissant',
    price_desc: 'Prix décroissant',
  };

  return (
    <div className="min-h-screen bg-fmc-bg dark:bg-[#0B0F19] text-fmc-navy dark:text-slate-100 pb-36 max-w-md mx-auto px-5 pt-4">
      <ScreenHeader
        title="Trouvez votre Coach"
        onBack={goBack}
        right={
          <IconButton
            id="btn-toggle-filters"
            onClick={() => setShowFiltersModal(true)}
            aria-label="Filtres"
            className="relative"
          >
            <SlidersHorizontal className="w-5 h-5" />
            {hasActiveFilters && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-fmc-green rounded-full border-2 border-white" />
            )}
          </IconButton>
        }
      />

      <div className="relative mb-4">
        <SearchField
          id="input-coach-search"
          icon={<Search className="w-5 h-5" />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher par nom ou spécialité…"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            aria-label="Effacer"
            className="absolute inset-y-0 right-3 flex items-center text-slate-400 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Filtres rapides */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5 pb-1 mb-5">
        <Chip
          active={maxPrice < 200}
          icon={<Wallet className="w-4 h-4" />}
          onClick={() => setShowFiltersModal(true)}
        >
          {maxPrice < 200 ? `≤ ${maxPrice} €` : 'Prix'}
        </Chip>
        <Chip
          active={!!userLocation}
          icon={<MapIcon className="w-4 h-4" />}
          onClick={() => {
            if (userLocation) {
              setUserLocation(null);
              setActiveCityFilter(null);
            } else {
              requestUserLocation();
            }
          }}
        >
          {activeCityFilter || (userLocation ? 'Autour de moi' : 'Lieu')}
        </Chip>
        <Chip
          active={minRating >= 4.5}
          icon={<Star className={`w-4 h-4 ${minRating >= 4.5 ? 'fill-white' : 'fill-fmc-navy dark:fill-white'}`} />}
          onClick={() => setMinRating(minRating >= 4.5 ? 0 : 4.5)}
        >
          Note 4.5+
        </Chip>
        {categories.map((cat) => (
          <Chip
            key={cat.id}
            active={selectedCategory === cat.slug}
            onClick={() => setSelectedCategory(selectedCategory === cat.slug ? null : cat.slug)}
          >
            {cat.name}
          </Chip>
        ))}
      </div>

      {locationPermissionStatus === 'denied' && !activeCityFilter && (
        <p className="text-sm text-slate-500 mb-4">
          Localisation indisponible : choisissez une ville dans les filtres.
        </p>
      )}

      {/* Rayon si localisation active */}
      {userLocation && (
        <div className="flex items-center justify-between mb-5 text-sm">
          <span className="text-slate-500 font-medium">Rayon</span>
          <div className="flex gap-1.5">
            {[5, 10, 20, 50].map((km) => (
              <button
                key={km}
                onClick={() => setRadiusKm(km)}
                className={`h-8 px-3 rounded-full text-xs font-semibold transition cursor-pointer ${
                  radiusKm === km ? 'bg-fmc-navy text-white dark:bg-white dark:text-fmc-navy' : 'bg-white dark:bg-slate-900 text-slate-600 border border-fmc-line dark:border-slate-800'
                }`}
              >
                {km} km
              </button>
            ))}
          </div>
        </div>
      )}

      {viewMode === 'map' ? (
        <div className="space-y-3">
          <div className="rounded-[28px] overflow-hidden border border-fmc-line/80">
            <CoachMap
              coaches={filteredCoaches}
              userLocation={userLocation}
              height="calc(100vh - 330px)"
              onSearchThisArea={(center, radius) => {
                setUserLocation({ latitude: center.lat, longitude: center.lng });
                setRadiusKm(radius);
              }}
            />
          </div>
          <p className="text-center text-sm text-slate-500">
            {filteredCoaches.length} coach{filteredCoaches.length > 1 ? 's' : ''} dans cette zone
          </p>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-lg font-medium text-slate-600 dark:text-slate-300">
              {filteredCoaches.length} coach{filteredCoaches.length > 1 ? 's' : ''}{' '}
              {userLocation ? 'à proximité' : 'disponible' + (filteredCoaches.length > 1 ? 's' : '')}
            </span>
            <label className="relative text-sm text-slate-500 flex items-center gap-1">
              Trier par :
              <span className="font-semibold text-fmc-green-ink">{sortLabels[sortBy]}</span>
              <select
                aria-label="Trier par"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              >
                <option value="recommended">Popularité</option>
                {userLocation && <option value="distance">Distance</option>}
                <option value="rating">Note</option>
                <option value="price_asc">Prix croissant</option>
                <option value="price_desc">Prix décroissant</option>
              </select>
            </label>
          </div>

          {filteredCoaches.length > 0 ? (
            <div className="space-y-5">
              {filteredCoaches.map((coach) => (
                <CoachCard key={coach.id} coach={coach} userLocation={userLocation} />
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-900 rounded-[28px] border border-fmc-line/80 dark:border-slate-800 p-6 text-center mt-2"
            >
              <span className="w-14 h-14 rounded-2xl bg-fmc-bg dark:bg-slate-800 text-fmc-green-ink flex items-center justify-center mx-auto mb-3">
                <MapPin className="w-7 h-7" />
              </span>
              <h3 className="font-semibold text-lg mb-1">Aucun coach trouvé</h3>
              <p className="text-sm text-slate-500 max-w-xs mx-auto mb-5">
                Élargissez votre zone ou découvrez nos coachs disponibles en visio partout en France.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    setRadiusKm(50);
                    setSelectedFormats(['online']);
                  }}
                  className="h-12 rounded-full bg-fmc-green text-fmc-navy font-bold text-sm cursor-pointer"
                >
                  Voir les coachs en visio
                </button>
                <button onClick={resetFilters} className="h-11 text-sm font-semibold text-slate-500 cursor-pointer">
                  Réinitialiser les filtres
                </button>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Bouton flottant carte / liste */}
      <div className="fixed left-0 right-0 max-w-md mx-auto bottom-[calc(5.5rem+var(--sab))] z-30 flex justify-center pointer-events-none">
        <button
          id="btn-toggle-map"
          onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
          className="pointer-events-auto h-14 px-7 rounded-full bg-fmc-green text-white font-semibold text-base flex items-center gap-2.5 shadow-[0_10px_30px_rgba(0,214,100,0.35)] active:scale-95 transition cursor-pointer"
        >
          {viewMode === 'list' ? <MapIcon className="w-5 h-5" /> : <List className="w-5 h-5" />}
          {viewMode === 'list' ? 'Voir la carte' : 'Voir la liste'}
        </button>
      </div>

      {/* Advanced Filters Modal */}
      <AnimatePresence>
        {showFiltersModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-[32px] sm:rounded-[32px] p-6 pb-[calc(1.5rem+var(--sab))] shadow-2xl max-h-[88vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-[#00B050]" />
                  <h2 className="text-base font-extrabold text-[#0F172A]">Filtres de recherche</h2>
                </div>
                <button
                  onClick={() => setShowFiltersModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Ville */}
              <div className="py-4 border-b border-slate-100 dark:border-slate-800">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Ville</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={requestUserLocation}
                    className={`h-9 px-3.5 rounded-full text-sm font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
                      userLocation && !activeCityFilter ? 'bg-fmc-green border-fmc-green text-white' : 'border-fmc-line text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    Autour de moi
                  </button>
                  {CITY_PRESETS.slice(0, 8).map((city) => (
                    <button
                      key={city.name}
                      type="button"
                      onClick={() => handleSelectCityPreset(city.name)}
                      className={`h-9 px-3.5 rounded-full text-sm font-semibold border transition cursor-pointer ${
                        activeCityFilter === city.name ? 'bg-fmc-navy border-fmc-navy text-white' : 'border-fmc-line text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {city.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Formats Filter */}
              <div className="py-4 border-b border-slate-100">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-2">
                  Format de séance
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'online', label: 'En ligne / Visio', icon: '💻' },
                    { id: 'home', label: 'À domicile', icon: '🏠' },
                    { id: 'coach_location', label: 'Chez le coach', icon: '📍' },
                    { id: 'partner_gym', label: 'En salle partenaire', icon: '🏋️' },
                    { id: 'outdoor', label: 'En extérieur / Parc', icon: '🌳' },
                    { id: 'corporate', label: 'En entreprise', icon: '🏢' }
                  ].map((fmt) => {
                    const isSelected = selectedFormats.includes(fmt.id as CoachingFormat);
                    return (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => toggleFormat(fmt.id as CoachingFormat)}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                          isSelected
                            ? 'bg-[#00D664]/15 border-[#00D664] text-[#008A3E]'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <span>{fmt.icon}</span>
                        <span className="truncate">{fmt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price Max Slider */}
              <div className="py-4 border-b border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Tarif horaire maximum
                  </label>
                  <span className="text-sm font-black text-[#008A3E]">{maxPrice} €/h</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="200"
                  step="5"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-[#00D664] h-2 bg-slate-200 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-1">
                  <span>40 €</span>
                  <span>100 €</span>
                  <span>200 €</span>
                </div>
              </div>

              {/* Verified Coach Checkbox */}
              <div className="py-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-extrabold text-[#0F172A] block">
                    Coachs vérifiés uniquement ✓
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Diplômes et assurances validés par l'équipe Find My Coach
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={onlyVerified}
                  onChange={(e) => setOnlyVerified(e.target.checked)}
                  className="w-5 h-5 accent-[#00D664] rounded cursor-pointer"
                />
              </div>

              {/* Min Rating */}
              <div className="py-4 border-b border-slate-100">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-2">
                  Note minimale
                </label>
                <div className="flex gap-2">
                  {[
                    { val: 0, label: 'Toutes' },
                    { val: 4.5, label: '★ 4.5+' },
                    { val: 4.8, label: '★ 4.8+' },
                    { val: 5.0, label: '★ 5.0' }
                  ].map((r) => (
                    <button
                      key={r.val}
                      type="button"
                      onClick={() => setMinRating(r.val)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        minRating === r.val
                          ? 'bg-[#0F172A] text-white border-[#0F172A]'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Availability Filter */}
              <div className="py-4">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-2">
                  Disponibilité
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'all', label: 'Indifférent' },
                    { id: 'today', label: 'Aujourd’hui' },
                    { id: 'tomorrow', label: 'Demain' }
                  ].map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => setAvailabilityFilter(av.id as any)}
                      className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        availabilityFilter === av.id
                          ? 'bg-[#00D664] text-[#0F172A] border-[#00D664]'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {av.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-4 py-3 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-2xl text-xs font-bold transition cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Réinitialiser</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowFiltersModal(false)}
                  className="flex-1 py-3 bg-[#00D664] text-[#0F172A] hover:bg-[#00B050] rounded-2xl text-xs font-black shadow-md transition cursor-pointer"
                >
                  Appliquer ({filteredCoaches.length} résultat{filteredCoaches.length > 1 ? 's' : ''})
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
