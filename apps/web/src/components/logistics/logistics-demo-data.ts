export type LogisticsStatus =
  | "Quote needed"
  | "Quote sent"
  | "Booked"
  | "In transit"
  | "Out for delivery"
  | "Delivered"
  | "Exception";

export type SustainableOption = "Lowest cost" | "Balanced" | "Lowest CO2";

export interface CarrierQuote {
  carrier: string;
  service: string;
  cost: string;
  eta: string;
  carbonKg: number;
  onTimeRate: string;
  sustainableOption: SustainableOption;
}

export interface LogisticsShipment {
  id: string;
  orderId: string;
  trackingId: string;
  product: string;
  buyer: string;
  seller: string;
  origin: string;
  destination: string;
  distance: string;
  quantity: string;
  carrier: string;
  service: string;
  status: LogisticsStatus;
  cost: string;
  eta: string;
  carbonKg: number;
  optimizedCarbonKg: number;
  lastUpdate: string;
  nextStep: string;
  route: string[];
  documents: string[];
  sustainableOption: SustainableOption;
}

export interface CarrierIntegration {
  name: string;
  status: "Connected" | "Degraded" | "Pending";
  coverage: string;
  avgResponse: string;
  activeShipments: number;
  issue?: string;
}

export const carrierQuotes: CarrierQuote[] = [
  {
    carrier: "EcoFreight",
    service: "Bulk flatbed optimized",
    cost: "$1,840",
    eta: "2 days",
    carbonKg: 420,
    onTimeRate: "96%",
    sustainableOption: "Lowest CO2",
  },
  {
    carrier: "GreenLine Logistics",
    service: "Regional dry van",
    cost: "$1,620",
    eta: "3 days",
    carbonKg: 510,
    onTimeRate: "94%",
    sustainableOption: "Balanced",
  },
  {
    carrier: "RapidHaul",
    service: "Expedited bulk",
    cost: "$2,250",
    eta: "24 hrs",
    carbonKg: 690,
    onTimeRate: "98%",
    sustainableOption: "Lowest cost",
  },
];

export const logisticsShipments: LogisticsShipment[] = [
  {
    id: "SHP-50021",
    orderId: "EG-50021",
    trackingId: "ECO-7A92-50021",
    product: "Pyrolysis Pitch",
    buyer: "AgriCorp Solutions",
    seller: "GulfStar Chemicals",
    origin: "Cadiz, Spain",
    destination: "Atlanta, GA",
    distance: "4,512 mi",
    quantity: "20 tons",
    carrier: "EcoFreight",
    service: "Bulk flatbed optimized",
    status: "In transit",
    cost: "$1,840",
    eta: "May 22, 2026",
    carbonKg: 420,
    optimizedCarbonKg: 610,
    lastUpdate: "Carrier departed New Orleans cross-dock",
    nextStep: "Buyer confirms delivery after arrival inspection.",
    route: ["Cadiz Port", "New Orleans cross-dock", "Atlanta destination"],
    documents: ["Bill of Lading.pdf", "Carrier insurance.pdf", "Chain of custody.pdf"],
    sustainableOption: "Lowest CO2",
  },
  {
    id: "SHP-50018",
    orderId: "EG-50018",
    trackingId: "GLN-1188-50018",
    product: "Black Gypsum",
    buyer: "GreenHarvest Co.",
    seller: "EcoPack Co.",
    origin: "Houston, TX",
    destination: "Baton Rouge, LA",
    distance: "271 mi",
    quantity: "200 tons",
    carrier: "GreenLine Logistics",
    service: "Covered bulk hopper",
    status: "Out for delivery",
    cost: "$2,960",
    eta: "Today, 3:30 PM",
    carbonKg: 360,
    optimizedCarbonKg: 470,
    lastUpdate: "Driver checked in at Baton Rouge scale house",
    nextStep: "Delivery confirmation unlocks escrow inspection window.",
    route: ["Houston yard", "Lake Charles weigh station", "Baton Rouge facility"],
    documents: ["BOL - signed pickup.pdf", "Weight ticket.pdf"],
    sustainableOption: "Balanced",
  },
  {
    id: "SHP-50012",
    orderId: "EG-50012",
    trackingId: "RPD-4410-50012",
    product: "Used Dry Transformer",
    buyer: "NutriFeed Industries",
    seller: "Metal Reclaim LLC",
    origin: "Houston, TX",
    destination: "Dallas, TX",
    distance: "239 mi",
    quantity: "50 units",
    carrier: "RapidHaul",
    service: "Special equipment",
    status: "Delivered",
    cost: "$980",
    eta: "Delivered May 13, 2026",
    carbonKg: 210,
    optimizedCarbonKg: 245,
    lastUpdate: "Proof of delivery signed by receiving dock",
    nextStep: "Delivery confirmed; escrow release is ready.",
    route: ["Houston equipment yard", "Dallas receiving dock"],
    documents: ["Proof of delivery.pdf", "Equipment inspection photos.zip"],
    sustainableOption: "Lowest cost",
  },
  {
    id: "SHP-50009",
    orderId: "EG-50009",
    trackingId: "ECO-3411-50009",
    product: "Scrap Polymer Blend with Impurities",
    buyer: "BrightFuture Corp",
    seller: "TerraGenesis Biofuels",
    origin: "Plaquemine, LA",
    destination: "Port Allen, LA",
    distance: "18 mi",
    quantity: "1,000 tons",
    carrier: "EcoFreight",
    service: "Short-haul bulk",
    status: "Exception",
    cost: "$740",
    eta: "Delayed",
    carbonKg: 82,
    optimizedCarbonKg: 95,
    lastUpdate: "Pickup delayed by missing yard access code",
    nextStep: "Admin needs to resolve facility access with seller.",
    route: ["Seller yard", "Port Allen buyer dock"],
    documents: ["Draft BOL.pdf"],
    sustainableOption: "Lowest CO2",
  },
];

export const carrierIntegrations: CarrierIntegration[] = [
  {
    name: "EcoFreight",
    status: "Connected",
    coverage: "US, EU, port drayage",
    avgResponse: "480 ms",
    activeShipments: 18,
  },
  {
    name: "GreenLine Logistics",
    status: "Connected",
    coverage: "US bulk and regional",
    avgResponse: "520 ms",
    activeShipments: 11,
  },
  {
    name: "RapidHaul",
    status: "Degraded",
    coverage: "US expedited",
    avgResponse: "1.8 s",
    activeShipments: 6,
    issue: "Tracking webhook latency above target.",
  },
  {
    name: "RailLoop Intermodal",
    status: "Pending",
    coverage: "Rail and port transfers",
    avgResponse: "Not live",
    activeShipments: 0,
    issue: "Credential exchange awaiting approval.",
  },
];

export const routeOptimizationSummary = {
  monthlySavings: "$18,420",
  carbonAvoided: "14.8 t CO2e",
  optimizedShipments: 36,
  averageQuoteTime: "42 sec",
};
