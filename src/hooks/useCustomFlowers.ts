import { useCallback, useEffect, useState } from 'react';
import type { CustomFlower } from '../types/flowers';

const STORAGE_KEY = 'spring.custom-flowers';

const toStoredFlower = (flower: CustomFlower): CustomFlower => ({
  ...flower,
  // Avoid storing the original upload twice in localStorage.
  originalImage: '',
});

const persistFlowers = (flowers: CustomFlower[]) => {
  try {
    const storedFlowers = flowers.map(toStoredFlower);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(storedFlowers));
  } catch (error) {
    console.error('Failed to persist custom flowers:', error);
  }
};

const parseStoredFlowers = (value: string | null): CustomFlower[] => {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value) as CustomFlower[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const useCustomFlowers = () => {
  const [customFlowers, setCustomFlowers] = useState<CustomFlower[]>([]);

  useEffect(() => {
    setCustomFlowers(parseStoredFlowers(window.localStorage.getItem(STORAGE_KEY)));
  }, []);

  const addCustomFlower = useCallback((flower: CustomFlower) => {
    setCustomFlowers((prev) => {
      const nextFlowers = [flower, ...prev];
      persistFlowers(nextFlowers);
      return nextFlowers;
    });
  }, []);

  const removeCustomFlower = useCallback((flowerId: string) => {
    setCustomFlowers((prev) => {
      const nextFlowers = prev.filter((flower) => flower.id !== flowerId);
      persistFlowers(nextFlowers);
      return nextFlowers;
    });
  }, []);

  return {
    customFlowers,
    addCustomFlower,
    removeCustomFlower,
  };
};
