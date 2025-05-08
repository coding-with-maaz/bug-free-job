import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

export const useAppOpenAd = (showAd) => {
  const appState = useRef(AppState.currentState);
  const showAdTimeout = useRef(null);

  useEffect(() => {
    console.log('Setting up AppOpenAd hook');

    const handleAppStateChange = async (nextAppState) => {
      console.log('App state changed:', {
        previous: appState.current,
        next: nextAppState,
      });

      // Handle app coming to foreground
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // Clear any existing timeout
        if (showAdTimeout.current) {
          clearTimeout(showAdTimeout.current);
        }

        // Schedule the ad show with a delay
        showAdTimeout.current = setTimeout(async () => {
          try {
            await showAd(false); // Pass false to indicate this is not first launch
          } catch (error) {
            console.log('Error showing ad:', error);
          }
        }, 1000); // 1 second delay to ensure app is ready
      }

      appState.current = nextAppState;
    };

    // Add event listener
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Cleanup
    return () => {
      console.log('Cleaning up AppOpenAd hook');
      if (showAdTimeout.current) {
        clearTimeout(showAdTimeout.current);
      }
      subscription.remove();
    };
  }, [showAd]);
}; 