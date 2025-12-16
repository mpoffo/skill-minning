import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePlatform } from '@/contexts/PlatformContext';

interface UseCheckAccessOptions {
  resource: string;
  permission: string;
  onAccessDenied?: () => void;
}

interface UseCheckAccessReturn {
  hasAccess: boolean | null;
  isChecking: boolean;
  error: string | null;
  recheck: () => Promise<void>;
}

export function useCheckAccess({ 
  resource, 
  permission, 
  onAccessDenied 
}: UseCheckAccessOptions): UseCheckAccessReturn {
  const { accessToken, servicesUrl, isLoaded } = usePlatform();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAccess = useCallback(async () => {
    if (!isLoaded) return;
    
    // If no auth context, deny access
    if (!accessToken || !servicesUrl) {
      console.log('No auth context available, denying access');
      setHasAccess(false);
      setIsChecking(false);
      onAccessDenied?.();
      return;
    }

    setIsChecking(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('platform-gateway', {
        body: {
          action: 'checkAccess',
          accessToken,
          servicesUrl,
          resource,
          permission,
        },
      });

      if (invokeError) {
        console.error('CheckAccess invoke error:', invokeError);
        setError('Erro ao verificar permissão');
        setHasAccess(false);
        onAccessDenied?.();
        return;
      }

      const accessGranted = data?.hasAccess === true;
      console.log(`CheckAccess for ${resource}/${permission}: ${accessGranted}`);
      setHasAccess(accessGranted);

      if (!accessGranted) {
        onAccessDenied?.();
      }
    } catch (err) {
      console.error('CheckAccess error:', err);
      setError('Erro ao verificar permissão');
      setHasAccess(false);
      onAccessDenied?.();
    } finally {
      setIsChecking(false);
    }
  }, [accessToken, servicesUrl, resource, permission, isLoaded, onAccessDenied]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  return {
    hasAccess,
    isChecking,
    error,
    recheck: checkAccess,
  };
}
