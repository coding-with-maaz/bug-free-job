import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { NativeAd, NativeAdView, NativeAsset, NativeAssetType, NativeMediaView, TestIds } from 'react-native-google-mobile-ads';

const NativeAdComponent = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [adLoaded, setAdLoaded] = useState(false);
  const [nativeAd, setNativeAd] = useState(null);
  const nativeAdRef = useRef(null);
  const mediaViewRef = useRef(null);

  useEffect(() => {
    console.log('NativeAdComponent mounted');
    loadAd();
    return () => {
      console.log('NativeAdComponent unmounted');
      if (nativeAd) {
        nativeAd.destroy();
      }
    };
  }, []);

  const loadAd = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('Loading native video ad...');

      const ad = await NativeAd.createForAdRequest(
        __DEV__ ? TestIds.NATIVE : 'YOUR_NATIVE_AD_UNIT_ID',
        {
          keywords: ['job', 'career', 'employment', 'work'],
          requestNonPersonalizedAdsOnly: true,
          mediaAspectRatio: 'LANDSCAPE', // For video ads
          mediaContentRating: 'G', // Content rating
        }
      );

      // Use the correct event types
      const unsubscribeLoaded = ad.addAdEventListener('ad_loaded', () => {
        console.log('Native video ad loaded successfully');
        setNativeAd(ad);
        setAdLoaded(true);
        setIsLoading(false);
      });

      const unsubscribeError = ad.addAdEventListener('ad_failed_to_load', (error) => {
        console.log('Native video ad failed to load:', error);
        setError(error || new Error('Unknown error occurred'));
        setIsLoading(false);
      });

      const unsubscribeClicked = ad.addAdEventListener('ad_clicked', () => {
        console.log('Native video ad clicked');
      });

      const unsubscribeImpression = ad.addAdEventListener('ad_impression', () => {
        console.log('Native video ad impression recorded');
      });

      const unsubscribeVideoStart = ad.addAdEventListener('video_start', () => {
        console.log('Video started playing');
      });

      const unsubscribeVideoComplete = ad.addAdEventListener('video_complete', () => {
        console.log('Video completed playing');
      });

      await ad.load();

      return () => {
        unsubscribeLoaded();
        unsubscribeError();
        unsubscribeClicked();
        unsubscribeImpression();
        unsubscribeVideoStart();
        unsubscribeVideoComplete();
      };
    } catch (err) {
      console.error('Error loading native video ad:', err);
      setError(err);
      setIsLoading(false);
    }
  };

  const renderAdContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingText}>Loading video ad...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Video ad failed to load</Text>
          <Text style={styles.errorDetails}>
            {error?.message || 'Unknown error occurred'}
          </Text>
        </View>
      );
    }

    if (!adLoaded || !nativeAd) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Video ad not loaded</Text>
        </View>
      );
    }

    return (
      <NativeAdView
        nativeAd={nativeAd}
        style={styles.nativeAdView}
        ref={nativeAdRef}
      >
        <View style={styles.content}>
          <NativeAsset assetType={NativeAssetType.ICON}>
            <Image 
              source={{ uri: 'https://via.placeholder.com/50' }} 
              style={styles.icon}
              onError={(e) => console.log('Icon load error:', e.nativeEvent.error)}
            />
          </NativeAsset>
          
          <View style={styles.textContainer}>
            <NativeAsset assetType={NativeAssetType.HEADLINE}>
              <Text style={styles.headline} numberOfLines={1}>
                Sponsored Content
              </Text>
            </NativeAsset>
            
            <NativeAsset assetType={NativeAssetType.ADVERTISER}>
              <Text style={styles.advertiser} numberOfLines={1}>
                Advertisement
              </Text>
            </NativeAsset>
            
            <NativeAsset assetType={NativeAssetType.BODY}>
              <Text style={styles.body} numberOfLines={2}>
                Discover new opportunities
              </Text>
            </NativeAsset>
          </View>
        </View>

        {/* Video Media View */}
        <NativeAsset assetType={NativeAssetType.MEDIA}>
          <NativeMediaView
            ref={mediaViewRef}
            style={styles.mediaView}
            onVideoStart={() => console.log('Video started')}
            onVideoComplete={() => console.log('Video completed')}
            onVideoError={(error) => console.log('Video error:', error)}
          />
        </NativeAsset>

        {/* Call to Action Button */}
        <TouchableOpacity style={styles.ctaButton}>
          <Text style={styles.ctaText}>Learn More</Text>
        </TouchableOpacity>
      </NativeAdView>
    );
  };

  return (
    <View style={styles.container}>
      {renderAdContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  nativeAdView: {
    width: '100%',
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 14,
  },
  errorDetails: {
    marginTop: 4,
    fontSize: 12,
    color: '#ff3b30',
    textAlign: 'center',
  },
  content: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
  },
  icon: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  headline: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  advertiser: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  body: {
    fontSize: 14,
    color: '#666',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
  },
  mediaView: {
    width: '100%',
    height: 200,
    backgroundColor: '#f8f9fa',
  },
  ctaButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    margin: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NativeAdComponent; 