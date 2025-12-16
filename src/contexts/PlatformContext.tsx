import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

interface TokenData {
  scope: string;
  expires_in: number;
  username: string;
  token_type: string;
  access_token: string;
  refresh_token: string;
  email: string;
  fullName: string;
  tenantName: string;
}

interface PlatformMessage {
  token: TokenData;
  servicesUrl: string;
}

interface PlatformContextType {
  isLoaded: boolean;
  token: TokenData | null;
  servicesUrl: string | null;
  userName: string | null;
  fullName: string | null;
  tenantName: string | null;
  accessToken: string | null;
  permission: string;
  setPermission: (permission: string) => void;
  isPermissionValid: boolean;
  revalidatePermission: () => void;
}

const PlatformContext = createContext<PlatformContextType | undefined>(undefined);

const VALID_PERMISSIONS = ['admin', 'manager', 'user', 'viewer'];

export function PlatformProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [token, setToken] = useState<TokenData | null>(null);
  const [servicesUrl, setServicesUrl] = useState<string | null>(null);
  const [permission, setPermissionState] = useState<string>('user');
  const [isPermissionValid, setIsPermissionValid] = useState(true);

  const revalidatePermission = useCallback(() => {
    const isValid = VALID_PERMISSIONS.includes(permission.toLowerCase());
    setIsPermissionValid(isValid);
    console.log(`Permission "${permission}" validated: ${isValid}`);
  }, [permission]);

  const setPermission = useCallback((newPermission: string) => {
    setPermissionState(newPermission);
  }, []);

  // Revalidate whenever permission changes
  useEffect(() => {
    revalidatePermission();
  }, [permission, revalidatePermission]);

  useEffect(() => {
    const isInIframe = window.parent !== window;
    
    // If running inside an iframe (integrated in platform), prioritize postMessage
    if (isInIframe) {
      console.log('Running inside iframe - waiting for postMessage from platform');
      
      const handleMessage = (event: MessageEvent) => {
        console.log('Received postMessage:', event.data);
        
        try {
          const data = event.data as PlatformMessage;
          
          if (data.token && data.servicesUrl) {
            setToken(data.token);
            setServicesUrl(data.servicesUrl);
            setIsLoaded(true);
            
            // Store in sessionStorage for page reloads within iframe
            sessionStorage.setItem('platformContext', JSON.stringify(data));
            
            console.log('Platform context loaded from postMessage:', {
              userName: data.token.username.split('@')[0],
              tenantName: data.token.tenantName,
              fullName: data.token.fullName,
              accessToken: data.token.access_token?.substring(0, 10) + '...',
            });
          }
        } catch (error) {
          console.error('Error processing postMessage:', error);
        }
      };

      window.addEventListener('message', handleMessage);
      
      // Notify parent that we're ready to receive messages
      window.parent.postMessage({ type: 'TALENT_MINING_READY' }, '*');
      
      // Also check sessionStorage for page reloads within iframe
      // But only use it if we don't receive postMessage within 2 seconds
      const timeoutId = setTimeout(() => {
        if (!isLoaded) {
          const storedContext = sessionStorage.getItem('platformContext');
          if (storedContext) {
            try {
              const data = JSON.parse(storedContext) as PlatformMessage;
              if (data.token && data.servicesUrl) {
                setToken(data.token);
                setServicesUrl(data.servicesUrl);
                setIsLoaded(true);
                console.log('Platform context loaded from sessionStorage (fallback in iframe):', {
                  userName: data.token.username.split('@')[0],
                  tenantName: data.token.tenantName,
                });
              }
            } catch (error) {
              console.error('Error parsing stored platform context:', error);
            }
          }
        }
      }, 2000);

      return () => {
        window.removeEventListener('message', handleMessage);
        clearTimeout(timeoutId);
      };
    }
    
    // Not in iframe (standalone/emulator mode) - use sessionStorage directly
    console.log('Running standalone - loading from sessionStorage');
    const storedContext = sessionStorage.getItem('platformContext');
    if (storedContext) {
      try {
        const data = JSON.parse(storedContext) as PlatformMessage;
        if (data.token && data.servicesUrl) {
          setToken(data.token);
          setServicesUrl(data.servicesUrl);
          setIsLoaded(true);
          
          console.log('Platform context loaded from sessionStorage:', {
            userName: data.token.username.split('@')[0],
            tenantName: data.token.tenantName,
            fullName: data.token.fullName,
            accessToken: data.token.access_token?.substring(0, 10) + '...',
          });
        }
      } catch (error) {
        console.error('Error parsing stored platform context:', error);
      }
    }
  }, [isLoaded]);

  // Extract username without domain
  const userName = token?.username ? token.username.split('@')[0] : null;

  const value: PlatformContextType = {
    isLoaded,
    token,
    servicesUrl,
    userName,
    fullName: token?.fullName || null,
    tenantName: token?.tenantName || null,
    accessToken: token?.access_token || null,
    permission,
    setPermission,
    isPermissionValid,
    revalidatePermission,
  };

  return (
    <PlatformContext.Provider value={value}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform() {
  const context = useContext(PlatformContext);
  if (context === undefined) {
    throw new Error('usePlatform must be used within a PlatformProvider');
  }
  return context;
}
