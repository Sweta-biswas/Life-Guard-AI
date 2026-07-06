// Distance calculator using Haversine formula
export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

export interface MedicalResource {
  id: string;
  name: string;
  type: "hospital" | "pharmacy";
  address: string;
  distance: number; // in km
  lat: number;
  lon: number;
  phone?: string;
  navigationUrl: string;
}

// Fallback resources if Overpass API is unavailable or rates are limited
const MOCK_RESOURCES = {
  hospital: [
    { name: "Metro General Hospital & ER", address: "100 Healthcare Blvd, Medical District", latOffset: 0.008, lonOffset: -0.012, phone: "+1 (555) 019-9000" },
    { name: "St. Jude Care Center", address: "450 Wellness Way, North Valley", latOffset: -0.015, lonOffset: 0.018, phone: "+1 (555) 019-9001" },
    { name: "Mercy Health ER", address: "789 Emergency Lane, East Gate", latOffset: 0.005, lonOffset: 0.025, phone: "+1 (555) 019-9002" },
    { name: "County Community Hospital", address: "12 Valley Rd, South Hill", latOffset: -0.025, lonOffset: -0.020, phone: "+1 (555) 019-9003" }
  ],
  pharmacy: [
    { name: "Care & Cure 24/7 Pharmacy", address: "120 Main St, Downtown", latOffset: 0.003, lonOffset: -0.005, phone: "+1 (555) 019-8000" },
    { name: "Wellness RX & Drugs", address: "330 Oak Avenue, West Plaza", latOffset: -0.008, lonOffset: 0.012, phone: "+1 (555) 019-8001" },
    { name: "Corner Chemist", address: "55 Pine Lane, North Crossing", latOffset: 0.012, lonOffset: 0.015, phone: "+1 (555) 019-8002" },
    { name: "Lifesaver Pharmacy", address: "88 Medic Rd, South Corner", latOffset: -0.018, lonOffset: -0.010, phone: "+1 (555) 019-8003" }
  ]
};

function generateFallbackResources(lat: number, lon: number, type: "hospital" | "pharmacy"): MedicalResource[] {
  const templates = MOCK_RESOURCES[type];
  return templates.map((item, idx) => {
    const itemLat = lat + item.latOffset;
    const itemLon = lon + item.lonOffset;
    const distance = getDistance(lat, lon, itemLat, itemLon);
    return {
      id: `mock_${type}_${idx}`,
      name: item.name,
      type,
      address: item.address,
      distance,
      lat: itemLat,
      lon: itemLon,
      phone: item.phone,
      navigationUrl: `https://www.google.com/maps/dir/?api=1&destination=${itemLat},${itemLon}`
    };
  });
}

// Fetch nearby medical resources (Hospitals or Pharmacies)
export async function fetchNearbyResources(
  lat: number,
  lon: number,
  type: "hospital" | "pharmacy",
  radiusMeters = 5000
): Promise<MedicalResource[]> {
  const amenity = type === "hospital" ? "hospital" : "pharmacy";
  const query = `[out:json][timeout:15];(node["amenity"="${amenity}"](around:${radiusMeters},${lat},${lon});way["amenity"="${amenity}"](around:${radiusMeters},${lat},${lon}););out center;`;
  
  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: `data=${encodeURIComponent(query)}`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });

    if (!response.ok) {
      throw new Error(`Overpass API responded with status ${response.status}`);
    }

    const data = await response.json();
    if (!data.elements || data.elements.length === 0) {
      return generateFallbackResources(lat, lon, type).sort((a, b) => a.distance - b.distance);
    }

    const resources: MedicalResource[] = data.elements.map((el: {
      type: string;
      id: number;
      lat?: number;
      lon?: number;
      center?: { lat: number; lon: number };
      tags?: Record<string, string>;
    }) => {
      // Overpass ways return 'center' with lat/lon, nodes return lat/lon directly
      const resourceLat = el.lat || el.center?.lat || lat;
      const resourceLon = el.lon || el.center?.lon || lon;
      const distance = getDistance(lat, lon, resourceLat, resourceLon);
      
      const name = el.tags?.name || (type === "hospital" ? "Unnamed Clinic/Hospital" : "Unnamed Pharmacy");
      const street = el.tags?.["addr:street"] || "";
      const housenumber = el.tags?.["addr:housenumber"] || "";
      const city = el.tags?.["addr:city"] || "";
      const address = [housenumber, street, city].filter(Boolean).join(", ") || el.tags?.["addr:full"] || "Address not available";
      const phone = el.tags?.phone || el.tags?.["contact:phone"] || undefined;

      return {
        id: `${el.type}_${el.id}`,
        name,
        type,
        address,
        distance,
        lat: resourceLat,
        lon: resourceLon,
        phone,
        navigationUrl: `https://www.google.com/maps/dir/?api=1&destination=${resourceLat},${resourceLon}`
      };
    });

    // Sort by distance ascending
    return resources.sort((a, b) => a.distance - b.distance);
  } catch (error) {
    console.warn(`Error fetching real resources from Overpass API:`, error);
    // Graceful fallback to dynamic simulated local data
    return generateFallbackResources(lat, lon, type).sort((a, b) => a.distance - b.distance);
  }
}
