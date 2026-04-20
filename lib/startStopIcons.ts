import L from "leaflet";

export function getStartStopIcons() {
  const startIcon = new L.Icon({
    iconUrl:
      "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCAzMiA0MSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSI0IiB5PSI0IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHJ4PSI0IiBmaWxsPSIjMTBiOTgxIi8+PGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iNiIgZmlsbD0id2hpdGUiLz48L3N2Zz4=",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [32, 41],
    iconAnchor: [16, 41],
    popupAnchor: [0, -41],
    shadowSize: [41, 41],
    shadowAnchor: [13, 41],
  });

  const stopIcon = new L.Icon({
    iconUrl:
      "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCAzMiA0MSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSI0IiB5PSI0IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHJ4PSI0IiBmaWxsPSIjZWYyODI2Ii8+PGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iNiIgZmlsbD0id2hpdGUiLz48L3N2Zz4=",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [32, 41],
    iconAnchor: [16, 41],
    popupAnchor: [0, -41],
    shadowSize: [41, 41],
    shadowAnchor: [13, 41],
  });

  return { startIcon, stopIcon };
}
