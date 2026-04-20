import L from "leaflet";

const iconCache = new Map<boolean, L.DivIcon>();

function busSvgMarkup(accent: string) {
  return `
<div style="width:44px;height:44px;filter:drop-shadow(0 2px 5px rgba(0,0,0,.28));">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="44" height="44" aria-hidden="true">
    <rect x="4" y="18" width="40" height="14" rx="3" fill="${accent}" stroke="#0f172a" stroke-width="1.2"/>
    <rect x="8" y="10" width="32" height="12" rx="2" fill="#3b82f6" stroke="#1e40af" stroke-width="1"/>
    <rect x="28" y="12" width="8" height="6" rx="1" fill="#dbeafe"/>
    <circle cx="14" cy="34" r="3.5" fill="#0f172a"/>
    <circle cx="34" cy="34" r="3.5" fill="#0f172a"/>
    <circle cx="14" cy="34" r="1.3" fill="#94a3b8"/>
    <circle cx="34" cy="34" r="1.3" fill="#94a3b8"/>
  </svg>
</div>`;
}

export function getBusLeafletIcon(isTripActive: boolean): L.DivIcon {
  const accent = isTripActive ? "#10b981" : "#64748b";
  const existing = iconCache.get(isTripActive);
  if (existing) return existing;

  const divIcon = L.divIcon({
    className: "busmate-bus-marker",
    html: busSvgMarkup(accent),
    iconSize: [44, 44],
    iconAnchor: [22, 44],
    popupAnchor: [0, -40],
  });
  iconCache.set(isTripActive, divIcon);
  return divIcon;
}
