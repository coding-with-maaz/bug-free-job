import React, { useState, useRef, useImperativeHandle, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { BannerAd, TestIds, InterstitialAd, AdEventType } from 'react-native-google-mobile-ads';

const BANNER_AD_UNIT_ID = __DEV__ ? TestIds.BANNER : 'ca-app-pub-3940256099942544/6300978111';
const INTERSTITIAL_AD_UNIT_ID = __DEV__ ? TestIds.INTERSTITIAL : 'ca-app-pub-3940256099942544/1033173712';

const AdLoadingManager = React.forwardRef(({ onAdLoaded, onAdFailedToLoad }, ref) => {
  const [bannerError, setBannerError] = useState(null);
  const [interstitialError, setInterstitialError] = useState(null);
  const [isInterstitialLoading, setIsInterstitialLoading] = useState(false);
  const [isInterstitialReady, setIsInterstitialReady] = useState(false);
  const interstitialAd = useRef(null);
  const retryCount = useRef(0);
  const maxRetries = 3;
  const retryDelay = 2000; // 2 seconds

  // Get screen width for adaptive banner
  const screenWidth = Dimensions.get('window').width;
  const adWidth = screenWidth - 32; // 16px padding on each side

  // Preload interstitial ad when component mounts
  useEffect(() => {
    loadInterstitialAd();
    return () => {
      if (interstitialAd.current) {
        interstitialAd.current.removeAllListeners();
      }
    };
  }, []);

  const loadInterstitialAd = async () => {
    try {
      if (isInterstitialLoading || isInterstitialReady) return;

      setIsInterstitialLoading(true);
      setInterstitialError(null);

      // Create new interstitial ad
      interstitialAd.current = InterstitialAd.createForAdRequest(INTERSTITIAL_AD_UNIT_ID, {
        requestNonPersonalizedAdsOnly: true,
        keywords: ['job', 'career', 'employment'],
      });

      // Set up event listeners
      interstitialAd.current.addAdEventListener(AdEventType.LOADED, () => {
        console.log('Interstitial ad loaded successfully');
        setIsInterstitialLoading(false);
        setIsInterstitialReady(true);
        retryCount.current = 0;
        onAdLoaded?.();
      });

      interstitialAd.current.addAdEventListener(AdEventType.ERROR, (error) => {
        console.error('Interstitial ad failed to load:', error);
        setIsInterstitialLoading(false);
        setIsInterstitialReady(false);
        setInterstitialError(error.message);
        onAdFailedToLoad?.(error);
        
        // Retry loading if under max retries
        if (retryCount.current < maxRetries) {
          retryCount.current += 1;
          setTimeout(loadInterstitialAd, retryDelay);
        }
      });

      interstitialAd.current.addAdEventListener(AdEventType.CLOSED, () => {
        console.log('Interstitial ad closed');
        setIsInterstitialReady(false);
        // Preload next ad immediately after closing
        setTimeout(loadInterstitialAd, 1000);
      });

      // Load the ad
      await interstitialAd.current.load();
    } catch (error) {
      console.error('Error in loadInterstitialAd:', error);
      setIsInterstitialLoading(false);
      setInterstitialError(error.message);
      onAdFailedToLoad?.(error);
    }
  };

  const showInterstitialAd = async () => {
    try {
      if (!interstitialAd.current || !isInterstitialReady) {
        console.log('Interstitial ad not ready, loading...');
        await loadInterstitialAd();
        // Wait for ad to be ready
        await new Promise(resolve => {
          const checkInterval = setInterval(() => {
            if (isInterstitialReady) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 100);
        });
      }

      if (interstitialAd.current && isInterstitialReady) {
        console.log('Showing interstitial ad');
        await interstitialAd.current.show();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error showing interstitial ad:', error);
      setInterstitialError(error.message);
      return false;
    }
  };

  useImperativeHandle(ref, () => ({
    showInterstitialAd,
    isInterstitialLoading: () => isInterstitialLoading,
    getInterstitialError: () => interstitialError,
  }));

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={BANNER_AD_UNIT_ID}
        size={`${Math.floor(adWidth)}x${Math.floor(adWidth * 0.15)}`} // 15% height ratio
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
          keywords: ['job', 'career', 'employment'],
        }}
        onAdLoaded={() => {
          console.log('Banner ad loaded successfully');
          setBannerError(null);
          onAdLoaded?.();
        }}
        onAdFailedToLoad={(error) => {
          console.error('Banner ad failed to load:', error);
          setBannerError(error.message);
          onAdFailedToLoad?.(error);
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
});

export default AdLoadingManager; 