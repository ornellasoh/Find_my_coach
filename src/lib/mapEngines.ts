import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { calculateDistanceKm } from '../utils/geo';
import { isSupabaseEnabled } from './supabase';

/**
 * Moteurs de carte de l'app. Apple Plans (MapKit JS) quand il se charge correctement ; sinon, automatiquement,
 * la carte OpenStreetMap (Leaflet). L'écran (CoachMap) ne connaît que l'interface MapEngine.
 */
export interface LatLng { lat: number; lng: number }
export interface MapPin extends LatLng { id: string; html: string }
export interface MapEngine {
  kind: 'apple' | 'leaflet';
  setUser(p: LatLng | null): void;
  setCircle(p: LatLng | null, radiusKm?: number): void;
  setPins(pins: MapPin[], onClick: (id: string) => void): void;
  fit(points: LatLng[]): void;
  panTo(p: LatLng): void;
  flyTo(p: LatLng): void;
  zoom(direction: 1 | -1): void;
  center(): LatLng;
  /** Distance du centre au coin de la carte (km) : rayon de « Rechercher dans cette zone » */
  radiusKm(): number;
  destroy(): void;
}
interface EngineOptions { center: LatLng; hasUser: boolean; onMoveEnd: (center: LatLng) => void }

const USER_PIN_HTML = `
  <div class="relative flex items-center justify-center w-7 h-7">
    <span class="animate-ping absolute inline-flex h-7 w-7 rounded-full bg-[#00D664] opacity-50"></span>
    <span class="relative inline-flex rounded-full h-4 w-4 bg-[#00B050] border-2 border-white shadow-md"></span>
  </div>`;

// ------------------------------------------------------------------ OpenStreetMap (Leaflet) : carte de secours
export function createLeafletEngine(container: HTMLElement, opts: EngineOptions): MapEngine {
  const map = L.map(container, {
    center: [opts.center.lat, opts.center.lng],
    zoom: opts.hasUser ? 12 : 11,
    zoomControl: false,
    attributionControl: false,
  });
  // Fond de carte : MapTiler si une clé est fournie (VITE_MAPTILER_KEY), sinon OpenStreetMap (sans clé ; CARTO exige désormais une clé)
  const mapTilerKey = import.meta.env.VITE_MAPTILER_KEY as string | undefined;
  if (mapTilerKey) {
    L.tileLayer(`https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}{r}.png?key=${mapTilerKey}`, { maxZoom: 19, attribution: '© MapTiler © OpenStreetMap' }).addTo(map);
  } else {
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
  }
  L.control.attribution({ prefix: false, position: 'bottomleft' }).addTo(map);

  // Recalcule la taille une fois l'écran affiché (évite une carte grise sur mobile/tablette)
  setTimeout(() => map.invalidateSize(), 250);
  const onResize = () => map.invalidateSize();
  window.addEventListener('resize', onResize);
  map.on('moveend', () => opts.onMoveEnd({ lat: map.getCenter().lat, lng: map.getCenter().lng }));

  const pinsLayer = L.layerGroup().addTo(map);
  let userMarker: L.Marker | null = null;
  let circle: L.Circle | null = null;

  return {
    kind: 'leaflet',
    setUser(p) {
      userMarker?.remove();
      userMarker = p
        ? L.marker([p.lat, p.lng], { icon: L.divIcon({ className: 'custom-user-pin', html: USER_PIN_HTML, iconSize: [28, 28], iconAnchor: [14, 14] }), zIndexOffset: 1000 }).addTo(map)
        : null;
    },
    setCircle(p, radiusKm) {
      circle?.remove();
      circle = p && radiusKm
        ? L.circle([p.lat, p.lng], { radius: radiusKm * 1000, color: '#00B050', weight: 1.5, fillColor: '#00D664', fillOpacity: 0.06, interactive: false }).addTo(map)
        : null;
    },
    setPins(pins, onClick) {
      pinsLayer.clearLayers();
      pins.forEach((p) => {
        const icon = L.divIcon({ className: 'custom-coach-marker', html: p.html, iconSize: [60, 32], iconAnchor: [30, 32] });
        pinsLayer.addLayer(L.marker([p.lat, p.lng], { icon }).on('click', () => onClick(p.id)));
      });
    },
    fit(points) {
      if (points.length) map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])), { padding: [40, 40], maxZoom: 13 });
    },
    panTo: (p) => { map.panTo([p.lat, p.lng], { animate: true, duration: 0.5 }); },
    flyTo: (p) => { map.flyTo([p.lat, p.lng], 13, { duration: 0.8 }); },
    zoom: (d) => { if (d > 0) map.zoomIn(); else map.zoomOut(); },
    center: () => ({ lat: map.getCenter().lat, lng: map.getCenter().lng }),
    radiusKm() {
      const c = map.getCenter();
      const ne = map.getBounds().getNorthEast();
      return calculateDistanceKm(c.lat, c.lng, ne.lat, ne.lng);
    },
    destroy() {
      window.removeEventListener('resize', onResize);
      map.remove();
    },
  };
}

// ------------------------------------------------------------------ Apple Plans (MapKit JS)
const MAPKIT_SRC = 'https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js';
const LOAD_TIMEOUT_MS = 6000;
const mk = () => (window as any).mapkit;

async function fetchMapKitToken(): Promise<string> {
  const base = (import.meta.env.VITE_SUPABASE_URL as string).replace(/\/$/, '');
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const res = await fetch(`${base}/functions/v1/mapkit-token`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.token) throw new Error('jeton Apple Plans indisponible');
  return body.token as string;
}

let mapKitReady: Promise<void> | null = null;
/**
 * Charge Apple Plans une seule fois. La promesse n'aboutit que si Apple accepte le jeton ;
 * tout échec (pas de clé, pas de réseau, navigateur non compatible, délai dépassé) fait basculer sur Leaflet.
 */
export function loadMapKit(): Promise<void> {
  if (!isSupabaseEnabled) return Promise.reject(new Error('mode démo'));
  mapKitReady ??= new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('délai dépassé')), LOAD_TIMEOUT_MS);
    const fail = (err: unknown) => { clearTimeout(timer); reject(err instanceof Error ? err : new Error('Apple Plans indisponible')); };
    fetchMapKitToken().then((firstToken) => {
      let token: string | null = firstToken;
      const script = document.createElement('script');
      script.src = MAPKIT_SRC;
      script.crossOrigin = 'anonymous';
      script.onerror = () => fail(new Error('script Apple Plans non chargé'));
      script.onload = () => {
        try {
          const mapkit = mk();
          mapkit.addEventListener('configuration-change', () => { clearTimeout(timer); resolve(); });
          mapkit.addEventListener('error', () => fail(new Error('jeton refusé par Apple')));
          mapkit.init({
            language: 'fr',
            // Le premier jeton est déjà là ; Apple redemande un jeton quand il expire
            authorizationCallback: (done: (t: string) => void) => {
              if (token) { done(token); token = null; } else fetchMapKitToken().then(done, () => {});
            },
          });
        } catch (err) { fail(err); }
      };
      document.head.appendChild(script);
    }, fail);
  });
  return mapKitReady;
}

export function createAppleEngine(container: HTMLElement, opts: EngineOptions): MapEngine {
  const mapkit = mk();
  const coord = (p: LatLng) => new mapkit.Coordinate(p.lat, p.lng);
  const region = (p: LatLng, span: number) => new mapkit.CoordinateRegion(coord(p), new mapkit.CoordinateSpan(span, span * 1.4));
  const isDark = () => document.documentElement.classList.contains('dark');

  const map = new mapkit.Map(container, {
    region: region(opts.center, opts.hasUser ? 0.18 : 0.3),
    showsCompass: mapkit.FeatureVisibility.Hidden,
    showsZoomControl: false,
    showsMapTypeControl: false,
    showsScale: mapkit.FeatureVisibility.Hidden,
    isRotationEnabled: false,
    colorScheme: isDark() ? 'dark' : 'light',
  });
  // Suit le mode sombre de l'app
  const themeObserver = new MutationObserver(() => { map.colorScheme = isDark() ? 'dark' : 'light'; });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  const getCenter = (): LatLng => ({ lat: map.center.latitude, lng: map.center.longitude });
  map.addEventListener('region-change-end', () => opts.onMoveEnd(getCenter()));

  const htmlAnnotation = (p: LatLng, html: string, onClick?: () => void) =>
    new mapkit.Annotation(coord(p), () => {
      const el = document.createElement('div');
      el.innerHTML = html;
      if (onClick) el.addEventListener('click', onClick);
      return el;
    }, { calloutEnabled: false, animates: false });

  let pinAnnotations: any[] = [];
  let userAnnotation: any = null;
  let circle: any = null;

  return {
    kind: 'apple',
    setUser(p) {
      if (userAnnotation) map.removeAnnotation(userAnnotation);
      userAnnotation = p ? htmlAnnotation(p, USER_PIN_HTML) : null;
      if (userAnnotation) {
        userAnnotation.anchorOffset = new DOMPoint(0, 14); // centré sur la position
        map.addAnnotation(userAnnotation);
      }
    },
    setCircle(p, radiusKm) {
      if (circle) map.removeOverlay(circle);
      circle = p && radiusKm
        ? new mapkit.CircleOverlay(coord(p), radiusKm * 1000, { style: new mapkit.Style({ strokeColor: '#00B050', lineWidth: 1.5, fillColor: '#00D664', fillOpacity: 0.06 }) })
        : null;
      if (circle) map.addOverlay(circle);
    },
    setPins(pins, onClick) {
      if (pinAnnotations.length) map.removeAnnotations(pinAnnotations);
      pinAnnotations = pins.map((p) => htmlAnnotation(p, p.html, () => onClick(p.id)));
      if (pinAnnotations.length) map.addAnnotations(pinAnnotations);
    },
    fit(points) {
      if (!points.length) return;
      const lats = points.map((p) => p.lat);
      const lngs = points.map((p) => p.lng);
      const center = { lat: (Math.min(...lats) + Math.max(...lats)) / 2, lng: (Math.min(...lngs) + Math.max(...lngs)) / 2 };
      const latSpan = Math.max((Math.max(...lats) - Math.min(...lats)) * 1.5, 0.06);
      const lngSpan = Math.max((Math.max(...lngs) - Math.min(...lngs)) * 1.5, 0.08);
      map.setRegionAnimated(new mapkit.CoordinateRegion(coord(center), new mapkit.CoordinateSpan(latSpan, lngSpan)), true);
    },
    panTo: (p) => { map.setCenterAnimated(coord(p), true); },
    flyTo: (p) => { map.setRegionAnimated(region(p, 0.06), true); },
    zoom(d) {
      const s = map.region.span;
      const f = d > 0 ? 0.5 : 2;
      const lat = Math.min(Math.max(s.latitudeDelta * f, 0.002), 60);
      const lng = Math.min(Math.max(s.longitudeDelta * f, 0.002), 90);
      map.setRegionAnimated(new mapkit.CoordinateRegion(map.center, new mapkit.CoordinateSpan(lat, lng)), true);
    },
    center: getCenter,
    radiusKm() {
      const c = getCenter();
      const s = map.region.span;
      return calculateDistanceKm(c.lat, c.lng, c.lat + s.latitudeDelta / 2, c.lng + s.longitudeDelta / 2);
    },
    destroy() {
      themeObserver.disconnect();
      map.destroy();
    },
  };
}
