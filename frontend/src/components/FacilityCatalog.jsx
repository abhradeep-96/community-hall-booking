import React, { useState, useEffect } from 'react';
import VenueMap from './VenueMap';

export default function FacilityCatalog() {
  // 1. THE MEMORY: State for data, loading, and filters
  const [halls, setHalls] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [minCapacity, setMinCapacity] = useState('');

  // 2. THE LIFECYCLE: Fetch real data from your Node.js backend
  useEffect(() => {
    fetch('http://localhost:5000/api/halls')
      .then(response => response.json())
      .then(data => {
        setHalls(data);
        setIsLoading(false);
      })
      .catch(error => {
        console.error("Error fetching halls from backend:", error);
        setIsLoading(false);
      });
  }, []);

  // 3. THE FILTER LOGIC: Intercept and filter the data before rendering
  const filteredHalls = halls.filter(hall => {
    const matchesSearch = hall.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCapacity = minCapacity === '' || hall.capacity >= parseInt(minCapacity);
    return matchesSearch && matchesCapacity;
  });

  // 4. THE LOADING SCREEN
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <h2 className="text-2xl font-bold text-slate-500 animate-pulse">Loading Community Halls...</h2>
      </div>
    );
  }

  // 5. THE MAIN UI
  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-slate-800 mb-8 text-center">Available Community Halls</h2>
        
        {/* THE SEARCH AND FILTER BAR */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row gap-4">
          <input 
            type="text" 
            placeholder="Search by hall name..." 
            className="flex-1 p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select 
            className="p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={minCapacity}
            onChange={(e) => setMinCapacity(e.target.value)}
          >
            <option value="">Any Capacity</option>
            <option value="100">100+ People</option>
            <option value="300">300+ People</option>
            <option value="500">500+ People</option>
          </select>
        </div>

        {/* Pass the FILTERED data to the map, so pins vanish when filtered out */}
        <VenueMap halls={filteredHalls} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Loop over FILTERED data for the cards */}
          {filteredHalls.map((hall) => (
            <div key={hall.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow border border-slate-100">
              <div className="h-48 bg-slate-200 flex items-center justify-center">
                <span className="text-slate-400 font-medium">Image Placeholder</span>
              </div>
              
              <div className="p-5">
                <h3 className="text-xl font-bold text-slate-800 mb-2">{hall.name}</h3>
                <div className="text-sm text-slate-600 mb-4 space-y-1">
                  <p>👥 Capacity: {hall.capacity} people</p>
                  <p className="truncate">
                    ✨ Amenities: {Array.isArray(hall.amenities) ? hall.amenities.join(', ') : hall.amenities}
                  </p>
                </div>
                
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100">
                  <span className="text-lg font-bold text-emerald-600">₹{hall.price_per_day}/day</span>
                  <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                    Book Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Fallback if a search returns zero results */}
        {filteredHalls.length === 0 && (
          <p className="text-center text-slate-500 mt-8">No halls match your search criteria.</p>
        )}
      </div>
    </div>
  );
}