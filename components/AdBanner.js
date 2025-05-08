import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { BannerAd, TestIds, BannerAdSize } from 'react-native-google-mobile-ads';
import { ActivityIndicator } from 'react-native';

const AdBanner = () => {
  const [adError, setAdError] = useState(false);
  const [adLoading, setAdLoading] = useState(true);
  const [adWidth, setAdWidth] = useState(Dimensions.get('window').width);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setAdWidth(window.width);
    });

    return () => subscription?.remove();
  }, []);

  const handleAdError = (error) => {
    console.log('Ad error:', error);
    setAdError(true);
    setAdLoading(false);
  };

  const handleAdLoaded = () => {
    setAdLoading(false);
    setAdError(false);
  };

  const handleAdClosed = () => {
    console.log('Ad closed');
  };

  const handleAdLeftApplication = () => {
    console.log('Ad left application');
  };

  const handleAdOpened = () => {
    console.log('Ad opened');
  };

  const handlePaidEvent = (event) => {
    console.log('Paid event:', event);
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
  };

  return (
    <View style={styles.container}>
      {adLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
        </View>
      )}
      {!adError && (
        <BannerAd
          unitId={TestIds.BANNER}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          onAdLoaded={handleAdLoaded}
          onAdFailedToLoad={handleAdError}
          onAdClosed={handleAdClosed}
          onAdLeftApplication={handleAdLeftApplication}
          onAdOpened={handleAdOpened}
          onPaid={handlePaidEvent}
          requestOptions={{
            requestNonPersonalizedAdsOnly: true,
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 8,
  },
  loadingContainer: {
    width: '100%',
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AdBanner; 