import { useEffect, useState } from "react";
import { WebContainer } from '@webcontainer/api';

// Create a singleton instance that can be shared across the application
let webcontainerInstance: WebContainer | null = null;

export function useWebContainer() {
    const [webcontainer, setWebcontainer] = useState<WebContainer | null>(null);

    async function main() {
        // Only boot if no instance exists yet
        if (!webcontainerInstance) {
            try {
                webcontainerInstance = await WebContainer.boot();
            } catch (error) {
                console.error("Failed to boot WebContainer:", error);
                return;
            }
        }
        
        // Set the state to the singleton instance
        setWebcontainer(webcontainerInstance);
    }
    
    useEffect(() => {
        main();
        
        // Clean up function
        return () => {
            // Note: We don't reset webcontainerInstance on component unmount
            // because other components might be using it
        };
    }, []);

    return webcontainer;
}