import { useCallback, useEffect, useState } from 'react';
import type { FlowerApiSettings } from '../types/flowers';

const STORAGE_KEY = 'spring.api-settings';

const DEFAULT_SETTINGS: FlowerApiSettings = {
  moonshotApiKey: '',
  geminiApiKey: '',
};

export const useApiSettings = () => {
  const [settings, setSettings] = useState<FlowerApiSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    try {
      const value = window.localStorage.getItem(STORAGE_KEY);
      if (!value) return;
      const parsed = JSON.parse(value) as FlowerApiSettings;
      setSettings({
        moonshotApiKey: parsed.moonshotApiKey || '',
        geminiApiKey: parsed.geminiApiKey || '',
      });
    } catch {
      setSettings(DEFAULT_SETTINGS);
    }
  }, []);

  const updateSettings = useCallback((nextSettings: FlowerApiSettings) => {
    setSettings(nextSettings);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSettings));
  }, []);

  return {
    settings,
    updateSettings,
  };
};
