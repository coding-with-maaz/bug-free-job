import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import mobileAds, { MaxAdContentRating } from 'react-native-google-mobile-ads';
import { getTrackingPermissionsAsync, requestTrackingPermissionsAsync } from 'expo-tracking-transparency';

const AdManager = () => {
  useEffect(() => {
    const initializeAds = async () => {
      try {
        // Request tracking permissions
        const { status } = await getTrackingPermissionsAsync();
        if (status === 'undetermined') {
          await requestTrackingPermissionsAsync();
        }

        // Configure ads
        await mobileAds().setRequestConfiguration({
          maxAdContentRating: MaxAdContentRating.PG,
          tagForChildDirectedTreatment: true,
          tagForUnderAgeOfConsent: true,
          testDeviceIdentifiers: ['EMULATOR'],
        });

        // Initialize ads
        await mobileAds().initialize();
        console.log('AdMob initialized successfully');
      } catch (error) {
        console.error('Error initializing AdMob:', error);
      }
    };

    initializeAds();
  }, []);

  return null;
};

export default AdManager; 