import * as SecureStore from 'expo-secure-store';
import { OmniRouteConfig } from '../types';

const OMNIROUTE_API_KEY_KEY = 'wiz_omniroute_api_key';
const OMNIROUTE_BASE_URL_KEY = 'wiz_omniroute_base_url';

export async function saveSecureItem(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.error(`Error saving secure item ${key}:`, error);
    throw error;
  }
}

export async function getSecureItem(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.error(`Error reading secure item ${key}:`, error);
    return null;
  }
}

export async function deleteSecureItem(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.error(`Error deleting secure item ${key}:`, error);
  }
}

export async function saveOmniRouteConfig(config: Partial<OmniRouteConfig>): Promise<void> {
  if (config.apiKey !== undefined) {
    await saveSecureItem(OMNIROUTE_API_KEY_KEY, config.apiKey);
  }
  if (config.baseUrl !== undefined) {
    await saveSecureItem(OMNIROUTE_BASE_URL_KEY, config.baseUrl);
  }
}

export async function getOmniRouteConfig(): Promise<OmniRouteConfig> {
  const apiKey = (await getSecureItem(OMNIROUTE_API_KEY_KEY)) || '';
  const baseUrl = (await getSecureItem(OMNIROUTE_BASE_URL_KEY)) || 'https://api.omniroute.io/v1';
  return {
    apiKey,
    baseUrl,
    fallbackEnabled: true,
    cacheEnabled: true,
  };
}
