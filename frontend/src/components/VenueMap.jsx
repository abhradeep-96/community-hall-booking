import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// 1. Accept the 'halls' prop we passed from the parent component
export default function VenueMap({ halls }) {
  const bengaluruCenter = [12.9716, 77.5946];

  return (
    <div className="h-96 w-full rounded-xl overflow-hidden shadow-md border border-slate-200 z-0 relative mb-8">
      <MapContainer center={bengaluruCenter} zoom={11} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* 2. Loop through the database data and place a pin for each hall */}
        {halls && halls.map((hall) => (
          // Only render the marker if the hall actually has coordinates in the database
          hall.latitude && hall.longitude ? (
            <Marker key={hall.id} position={[hall.latitude, hall.longitude]} icon={customIcon}>
              <Popup>
                <div className="font-bold text-slate-800">{hall.name}</div>
                <div className="text-sm text-emerald-600 font-medium">₹{hall.price_per_day}/day</div>
                <div className="text-xs text-slate-500 mt-1">Capacity: {hall.capacity}</div>
              </Popup>
            </Marker>
          ) : null
        ))}
        
      </MapContainer>
    </div>
  );
}