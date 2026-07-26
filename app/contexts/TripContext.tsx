'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Trip } from '../lib/types';
import { tripRepository } from '../repositories/TripRepository';

interface TripState {
  trips: Trip[];
  loading: boolean;
  error: Error | null;
  refreshTrips: () => Promise<void>;
  addTrip: (trip: Trip) => Promise<void>;
  updateTrip: (trip: Trip) => Promise<void>;
  deleteTrip: (id: string) => Promise<void>;
}

const TripContext = createContext<TripState | null>(null);

export function TripProvider({ children }: { children: React.ReactNode }) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refreshTrips = useCallback(async () => {
    try {
      const all = await tripRepository.getAll();
      setTrips(all.sort((a, b) => a.startDate.localeCompare(b.startDate)));
    } catch (err) {
      setError(err as Error);
    }
  }, []);

  const addTrip = useCallback(async (trip: Trip) => {
    setTrips(prev => [...prev, trip].sort((a, b) => a.startDate.localeCompare(b.startDate)));
    try {
      await tripRepository.add(trip);
    } catch (err) {
      setTrips(prev => prev.filter(t => t.id !== trip.id));
      throw err;
    }
  }, []);

  const updateTrip = useCallback(async (trip: Trip) => {
    const previous = trips;
    setTrips(prev => prev.map(t => t.id === trip.id ? trip : t).sort((a, b) => a.startDate.localeCompare(b.startDate)));
    try {
      await tripRepository.update(trip);
    } catch (err) {
      setTrips(previous);
      throw err;
    }
  }, [trips]);

  const deleteTrip = useCallback(async (id: string) => {
    const previous = trips;
    setTrips(prev => prev.filter(t => t.id !== id));
    try {
      await tripRepository.delete(id);
    } catch (err) {
      setTrips(previous);
      throw err;
    }
  }, [trips]);

  useEffect(() => {
    const init = async () => {
      try {
        await refreshTrips();
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [refreshTrips]);

  const value = useMemo(() => ({
    trips,
    loading,
    error,
    refreshTrips,
    addTrip,
    updateTrip,
    deleteTrip,
  }), [trips, loading, error, refreshTrips, addTrip, updateTrip, deleteTrip]);

  return (
    <TripContext.Provider value={value}>
      {children}
    </TripContext.Provider>
  );
}

export function useTrips() {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error('useTrips must be used within TripProvider');
  return ctx;
}
