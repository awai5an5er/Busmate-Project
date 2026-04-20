import { memo, useMemo } from "react";
import { GoogleMap, MarkerF, OverlayView, useJsApiLoader } from "@react-google-maps/api";
import { motion } from "framer-motion";
import { BusFront, MapPinned, WifiOff } from "lucide-react";
import { env, hasGoogleMapsKey } from "../lib/env";

const containerStyle = {
  width: "100%",
  height: "100%",
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  gestureHandling: "greedy",
  styles: [
    { elementType: "geometry", stylers: [{ color: "#e2e8f0" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#334155" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#cbd5e1" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#bbf7d0" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#93c5fd" }] },
  ],
};

const fallbackCenter = { lat: 31.5204, lng: 74.3587 };

function MapMarkerLabel({ bus }) {
  return (
    <motion.div
      animate={bus.isLive ? { scale: [1, 1.06, 1] } : { scale: 1 }}
      transition={{ duration: 1.3, repeat: bus.isLive ? Infinity : 0 }}
      className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold text-white shadow-lg ${
        bus.isLive ? "bg-emerald-500/90" : "bg-red-500/90"
      }`}
    >
      <BusFront className="h-3.5 w-3.5" />
      {bus.name}
    </motion.div>
  );
}

function FallbackMap({ buses }) {
  return (
    <div className="relative h-[360px] overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-blue-900 to-emerald-700">
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle,_#fff_1px,_transparent_1px)] [background-size:24px_24px]" />
      <div className="absolute left-4 top-4 rounded-xl border border-white/30 bg-white/20 px-3 py-2 text-xs text-white backdrop-blur">
        Glassmorphism control panel
      </div>
      <div className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-xl border border-amber-200/70 bg-white/90 px-3 py-2 text-xs text-amber-700 shadow-lg">
        <WifiOff className="h-4 w-4" />
        Add `VITE_GOOGLE_MAPS_API_KEY` to enable live Google Maps.
      </div>
      {buses.map((bus) => (
        <motion.div
          key={bus.id}
          className="absolute"
          animate={{
            left: `${bus.position.x}%`,
            top: `${bus.position.y}%`,
          }}
          transition={{ duration: 2.2, ease: "linear" }}
        >
          <MapMarkerLabel bus={bus} />
        </motion.div>
      ))}
    </div>
  );
}

function LiveMapComponent({ buses }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "busmate-google-map",
    googleMapsApiKey: env.googleMapsApiKey,
  });

  const center = useMemo(() => {
    const liveBus = buses.find((bus) => bus.position.lat && bus.position.lng);
    return liveBus
      ? { lat: liveBus.position.lat, lng: liveBus.position.lng }
      : fallbackCenter;
  }, [buses]);

  if (!hasGoogleMapsKey || loadError) {
    return <FallbackMap buses={buses} />;
  }

  if (!isLoaded) {
    return (
      <div className="flex h-[360px] items-center justify-center rounded-2xl bg-slate-100">
        <div className="h-24 w-[90%] animate-pulse rounded-2xl bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100" />
      </div>
    );
  }

  return (
    <div className="relative h-[360px] overflow-hidden rounded-2xl">
      <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={15} options={mapOptions}>
        {buses.map((bus) => (
          <MarkerF
            key={bus.id}
            position={{ lat: bus.position.lat, lng: bus.position.lng }}
            options={{
              icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: bus.isLive ? "#10b981" : "#ef4444",
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 2,
              },
            }}
          />
        ))}
        {buses.map((bus) => (
          <OverlayView
            key={`${bus.id}-label`}
            position={{ lat: bus.position.lat, lng: bus.position.lng }}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <div className="-translate-x-1/2 -translate-y-9">
              <MapMarkerLabel bus={bus} />
            </div>
          </OverlayView>
        ))}
      </GoogleMap>

      <div className="pointer-events-none absolute left-4 top-4 rounded-xl border border-white/40 bg-white/65 px-3 py-2 text-xs text-slate-700 shadow-lg backdrop-blur">
        <span className="inline-flex items-center gap-2">
          <MapPinned className="h-4 w-4 text-blue-700" />
          Live fleet map
        </span>
      </div>
    </div>
  );
}

export const LiveMap = memo(LiveMapComponent);
