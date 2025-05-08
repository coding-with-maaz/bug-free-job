import React, { useEffect, useState, useCallback, useRef } from 'react';
import { AppOpenAd, TestIds, AdEventType } from 'react-native-google-mobile-ads';
import { useAppOpenAd } from './useAppOpenAd';

// Use test IDs for development, replace with your actual ad unit IDs for production
const adUnitId = __DEV__ ? 'ca-app-pub-3940256099942544/9257395921' : 'ca-app-pub-3940256099942544/9257395921';

const AppOpenAdManager = () => {
  const [loaded, setLoaded] = useState(false);
  const [appOpenAd, setAppOpenAd] = useState(null);
  const [isShowingAd, setIsShowingAd] = useState(false);
  const lastAdShown = useRef(Date.now());
  const MIN_INTERVAL = 30 * 60 * 1000; // 30 minutes
  const isFirstLaunch = useRef(true);
  const firstLaunchTimeout = useRef(null);
  const adLoadPromise = useRef(null);
  const hasShownFirstLaunchAd = useRef(false);
  const isWaitingForFirstLaunch = useRef(false);

  const loadAd = useCallback(async () => {
    try {
      console.log('Preloading App Open Ad...');
      
      const ad = AppOpenAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: true,
        keywords: ['job', 'career', 'employment', 'work'],
      });

      // Set up event listeners
      const unsubscribeLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
        console.log('App Open Ad preloaded successfully');
        setLoaded(true);
        setAppOpenAd(ad);

        // If we're waiting for first launch ad, show it now
        if (isWaitingForFirstLaunch.current) {
          console.log('First launch ad loaded, showing now');
          showAd(true).catch(error => {
            console.log('Error showing first launch ad:', error);
          });
          isWaitingForFirstLaunch.current = false;
        }
      });

      const unsubscribeError = ad.addAdEventListener(AdEventType.ERROR, (error) => {
        console.log('App Open Ad error:', error);
        setLoaded(false);
        setAppOpenAd(null);
        isWaitingForFirstLaunch.current = false;
        // Retry loading after a delay
        setTimeout(loadAd, 5000);
      });

      const unsubscribeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
        console.log('App Open Ad closed');
        setIsShowingAd(false);
        setLoaded(false);
        setAppOpenAd(null);
        // Preload next ad
        loadAd();
      });

      const unsubscribeOpened = ad.addAdEventListener(AdEventType.OPENED, () => {
        console.log('App Open Ad opened');
        setIsShowingAd(true);
        lastAdShown.current = Date.now();
        if (isFirstLaunch.current) {
          hasShownFirstLaunchAd.current = true;
          isFirstLaunch.current = false;
        }
      });

      // Load the ad
      adLoadPromise.current = ad.load();
      await adLoadPromise.current;
      adLoadPromise.current = null;

      // Clean up event listeners
      return () => {
        unsubscribeLoaded();
        unsubscribeError();
        unsubscribeClosed();
        unsubscribeOpened();
        if (firstLaunchTimeout.current) {
          clearTimeout(firstLaunchTimeout.current);
        }
        if (adLoadPromise.current) {
          adLoadPromise.current = null;
        }
      };
    } catch (error) {
      console.log('Error in loadAd:', error);
      setLoaded(false);
      setAppOpenAd(null);
      isWaitingForFirstLaunch.current = false;
      // Retry loading after a delay
      setTimeout(loadAd, 5000);
    }
  }, []);

  // Preload the ad when component mounts
  useEffect(() => {
    loadAd();
  }, [loadAd]);

  // Function to show the ad
  const showAd = useCallback(async (isFirstLaunchShow = false) => {
    const now = Date.now();
    const timeSinceLastAd = now - lastAdShown.current;

    console.log('Show ad called with state:', {
      loaded,
      hasAd: !!appOpenAd,
      isShowingAd,
      timeSinceLastAd: timeSinceLastAd / 1000 / 60,
      isFirstLaunch: isFirstLaunch.current,
      isFirstLaunchShow,
      hasShownFirstLaunchAd: hasShownFirstLaunchAd.current,
      isWaitingForFirstLaunch: isWaitingForFirstLaunch.current
    });

    // Show on first launch regardless of time interval
    if ((isFirstLaunchShow || isFirstLaunch.current) && !hasShownFirstLaunchAd.current) {
      if (loaded && appOpenAd && !isShowingAd) {
        try {
          console.log('Showing first launch ad');
          await appOpenAd.show();
        } catch (error) {
          console.log('Error showing first launch ad:', error);
        }
      } else {
        console.log('First launch ad not ready yet, will show when loaded');
        isWaitingForFirstLaunch.current = true;
      }
      return;
    }

    // For subsequent shows, check time interval
    if (loaded && appOpenAd && !isShowingAd && timeSinceLastAd >= MIN_INTERVAL) {
      try {
        console.log('Attempting to show App Open Ad...');
        await appOpenAd.show();
      } catch (error) {
        console.log('Error showing app open ad:', error);
        setIsShowingAd(false);
        setLoaded(false);
        setAppOpenAd(null);
        // Preload next ad
        loadAd();
      }
    } else {
      console.log('Cannot show ad:', {
        loaded,
        hasAd: !!appOpenAd,
        isShowingAd,
        timeSinceLastAd: timeSinceLastAd / 1000 / 60,
        minimumInterval: MIN_INTERVAL / 1000 / 60,
      });
    }
  }, [loaded, appOpenAd, isShowingAd, loadAd]);

  // Use our custom hook to manage when to show ads
  useAppOpenAd(showAd);

  // This component doesn't render anything
  return null;
};

export default AppOpenAdManager; 