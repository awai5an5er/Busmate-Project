export const initialBuses = [
  {
    id: "bus-101",
    name: "Campus Loop A",
    route: "Main Gate -> Library -> Hostel Block",
    routeName: "Campus Loop A",
    driverName: "Demo driver",
    eta: 6,
    seatsAvailable: 18,
    isLive: false,
    position: { x: 14, y: 45, lat: 31.5204, lng: 74.3587 },
  },
  {
    id: "bus-204",
    name: "Science Shuttle",
    route: "Science Block -> Cafeteria -> Sports Complex",
    routeName: "Science Shuttle",
    driverName: "Demo driver",
    eta: 11,
    seatsAvailable: 7,
    isLive: false,
    position: { x: 48, y: 30, lat: 31.5223, lng: 74.3615 },
  },
  {
    id: "bus-315",
    name: "Evening Express",
    route: "Admin Block -> City Junction",
    routeName: "Evening Express",
    driverName: "Demo driver",
    eta: 15,
    seatsAvailable: 3,
    isLive: false,
    position: { x: 72, y: 66, lat: 31.5181, lng: 74.3542 },
  },
];

export const chartSeed = [
  { name: "Mon", trips: 88, occupancy: 61 },
  { name: "Tue", trips: 96, occupancy: 68 },
  { name: "Wed", trips: 105, occupancy: 70 },
  { name: "Thu", trips: 99, occupancy: 65 },
  { name: "Fri", trips: 110, occupancy: 74 },
  { name: "Sat", trips: 58, occupancy: 42 },
];

export const routeSeed = [
  { id: "R-100", name: "Campus Loop A", driver: "Fatima Khan", active: true },
  { id: "R-200", name: "Science Shuttle", driver: "Ali Raza", active: true },
  { id: "R-300", name: "Evening Express", driver: "Zoya Ahmed", active: false },
];
