
import { useSafeStorage } from './useSafeStorage';

const REDIRECT_KEY = 'floq_redirect_path';

export const useDeepLinkRedirect = () => {
  const { getItem, setItem, removeItem } = useSafeStorage();

  const saveRedirectPath = async (path: string) => {
    await setItem(REDIRECT_KEY, path);
  };

  const getRedirectPath = async (): Promise<string | null> => {
    return await getItem(REDIRECT_KEY);
  };

  const clearRedirectPath = async () => {
    await removeItem(REDIRECT_KEY);
  };

  return {
    saveRedirectPath,
    getRedirectPath,
    clearRedirectPath,
  };
};
