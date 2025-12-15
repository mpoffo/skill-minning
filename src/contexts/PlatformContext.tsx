import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
}

const PlatformContext = createContext<PlatformContextType | undefined>(undefined);

export function PlatformProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [token, setToken] = useState<TokenData | null>(null);
  const [servicesUrl, setServicesUrl] = useState<string | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('Received postMessage:', event.data);
      
      try {
        const data = event.data as PlatformMessage;
        
        if (data.token && data.servicesUrl) {
          setToken(data.token);
          setServicesUrl(data.servicesUrl);
          setIsLoaded(true);
          
          console.log('Platform context loaded:', {
            userName: data.token.username.split('@')[0],
            tenantName: data.token.tenantName,
            fullName: data.token.fullName,
          });
        }
      } catch (error) {
        console.error('Error processing postMessage:', error);
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Notify parent that we're ready to receive messages
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'TALENT_MINING_READY' }, '*');
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

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
