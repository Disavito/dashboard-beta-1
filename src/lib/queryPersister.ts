import { get, set, del } from 'idb-keyval';
import { PersistedClient, Persister } from '@tanstack/react-query-persist-client';

const createIDBStore = () => {
  return {
    getItem: async (key: string) => {
      const value = await get<PersistedClient>(key);
      return value || undefined;
    },
    setItem: async (key: string, value: PersistedClient) => {
      await set(key, value);
    },
    removeItem: async (key: string) => {
      await del(key);
    },
  };
};

export const createIDBPersister = (idbValidKeyName: IDBValidKey = 'reactQuery'): Persister => {
  const idbObj = createIDBStore();
  return {
    persistClient: async (client: PersistedClient) => {
      await idbObj.setItem(idbValidKeyName as string, client);
    },
    restoreClient: async () => {
      return await idbObj.getItem(idbValidKeyName as string);
    },
    removeClient: async () => {
      await idbObj.removeItem(idbValidKeyName as string);
    },
  };
};
