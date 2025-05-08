import React, { useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { InterstitialAd, TestIds, AdEventType } from 'react-native-google-mobile-ads';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

const InterstitialAdComponent = forwardRef(({ onAdClosed, onAdFailedToLoad }, ref) => {
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState(false);
  const [adLoading, setAdLoading] = useState(true);
  const [interstitial, setInterstitial] = useState(null);

  useEffect(() => {
    // Create interstitial ad instance
    const ad = InterstitialAd.createForAdRequest(TestIds.INTERSTITIAL, {
      requestNonPersonalizedAdsOnly: true,
      keywords: ['job', 'career', 'employment'],
    });

    setInterstitial(ad);

    // Add event listeners
    const unsubscribeLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
      console.log('Interstitial ad loaded successfully');
      setAdLoaded(true);
      setAdLoading(false);
      setAdError(false);
    });

    const unsubscribeFailed = ad.addAdEventListener(AdEventType.ERROR, (error) => {
      console.log('Interstitial ad failed to load:', error);
      setAdError(true);
      setAdLoading(false);
      onAdFailedToLoad?.(error);
    });

    const unsubscribeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('Interstitial ad closed');
      setAdLoaded(false);
      setAdLoading(true);
      onAdClosed?.();
      // Reload the ad after it's closed
      ad.load();
    });

    const unsubscribeOpened = ad.addAdEventListener(AdEventType.OPENED, () => {
      console.log('Interstitial ad opened');
    });

    const unsubscribePaid = ad.addAdEventListener(AdEventType.PAID, (event) => {
      console.log('Interstitial ad paid event:', event);
      // Here you can track ad revenue
      const {
        adUnitId,
        currencyCode,
        precision,
        value,
        network,
        networkPlacementId,
      } = event;
      
      // Example: Track revenue with analytics
      // analytics().logEvent('ad_impression', {
      //   ad_unit_id: adUnitId,
      //   currency: currencyCode,
      //   value: value,
      //   network: network,
      // });
    });

    // Load the ad
    ad.load();

    // Cleanup
    return () => {
      unsubscribeLoaded();
      unsubscribeFailed();
      unsubscribeClosed();
      unsubscribeOpened();
      unsubscribePaid();
    };
  }, [onAdClosed, onAdFailedToLoad]);

  useImperativeHandle(ref, () => ({
    showAd: () => {
      if (adLoaded && interstitial) {
        console.log('Showing interstitial ad');
        interstitial.show();
      } else {
        console.log('Ad not loaded yet');
        // Load the ad if it's not loaded
        interstitial?.load();
      }
    },
    loadAd: () => {
      console.log('Loading interstitial ad');
      interstitial?.load();
    }
  }));

  return (
    <View style={styles.container}>
      {adLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    width: '100%',
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default InterstitialAdComponent; 