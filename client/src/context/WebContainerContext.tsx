import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { WebContainer } from '@webcontainer/api';

interface WebContainerContextValue {
    webcontainer: WebContainer | null;
}

const WebContainerContext = createContext<WebContainerContextValue>({ webcontainer: null });

export function WebContainerProvider({ children }: { children: ReactNode }) {
    const [webcontainer, setWebcontainer] = useState<WebContainer | null>(null);
    const booting = useRef(false);

    useEffect(() => {
        if (booting.current) return;
        booting.current = true;

        WebContainer.boot()
            .then((instance) => setWebcontainer(instance))
            .catch((err) => console.error('[WebContainerProvider] Boot failed:', err));
    }, []);

    return (
        <WebContainerContext.Provider value={{ webcontainer }}>
            {children}
        </WebContainerContext.Provider>
    );
}

export function useWebContainer() {
    return useContext(WebContainerContext).webcontainer;
}
