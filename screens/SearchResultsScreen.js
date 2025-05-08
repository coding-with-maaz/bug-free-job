import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  StatusBar,
  Animated,
  Dimensions,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { searchJobs } from '../store/slices/jobSlice';
import AdBanner from '../components/AdBanner';
import AdLoadingManager from '../components/AdLoadingManager';
import InterstitialAdComponent from '../components/InterstitialAd';
import JobCard from '../components/JobCard';

const { width, height } = Dimensions.get('window');

const SearchResultsScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { searchResults, loading, error } = useSelector((state) => state.jobs);
  const query = route?.params?.query || '';
  const [searchQuery, setSearchQuery] = useState(query);
  const [results, setResults] = useState([]);
  const [filters, setFilters] = useState({
    jobType: null,
    location: null,
    experience: null,
    salary: null,
    remote: null,
  });
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  // New states for interstitial ads
  const [isAdLoading, setIsAdLoading] = useState(false);
  const [adError, setAdError] = useState(null);
  const [currentJobId, setCurrentJobId] = useState(null);
  const interstitialAdRef = useRef(null);
  const adManagerRef = useRef(null);
  
  // Animation values
  const modalAnimation = useRef(new Animated.Value(0)).current;
  const modalY = modalAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [height, 0]
  });
  const backdropOpacity = modalAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5]
  });

  useEffect(() => {
    if (!query) return;
    console.log('Initial query:', query);
    dispatch(searchJobs(query));
  }, [dispatch, query]);

  useEffect(() => {
    console.log('Search results from Redux:', searchResults);
    if (searchResults && searchResults.data) {
      setResults(searchResults.data);
    } else {
      setResults([]);
    }
  }, [searchResults]);

  // Load interstitial ad when component mounts
  useEffect(() => {
    console.log('Setting up interstitial ad on search results screen');
    const timer = setTimeout(() => {
      if (interstitialAdRef.current) {
        console.log('Loading interstitial ad in SearchResultsScreen');
        interstitialAdRef.current.loadAd();
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  const openFilterModal = () => {
    setFilterModalVisible(true);
    Animated.spring(modalAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 10
    }).start();
  };

  const closeFilterModal = () => {
    Animated.timing(modalAnimation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true
    }).start(() => {
      setFilterModalVisible(false);
    });
  };

  const resetFilters = () => {
    setFilters({
      jobType: null,
      location: null,
      experience: null,
      salary: null,
      remote: null,
    });
  };

  const applyFilters = () => {
    // Here you would implement logic to filter the results based on filters
    console.log('Applied filters:', filters);
    closeFilterModal();
  };

  const handleJobPress = async (item) => {
    if (!item?.id) {
      Alert.alert('Error', 'Invalid job data');
      return;
    }

    try {
      setCurrentJobId(item.id);
      setIsAdLoading(true);
      setAdError(null);
      
      console.log('Attempting to show interstitial ad before job details');
      
      // Try using AdLoadingManager first if available
      if (adManagerRef.current) {
        const adShown = await adManagerRef.current.showInterstitialAd();
        if (!adShown && interstitialAdRef.current) {
          // Fall back to individual interstitial ad component
          await interstitialAdRef.current.showAd();
        }
      } else if (interstitialAdRef.current) {
        // Only use interstitial ad component
        await interstitialAdRef.current.showAd();
      }
      
      // Navigate to job details
      navigation.navigate('JobDetails', { 
        jobId: item.id,
        job: item,
        fromScreen: 'SearchResults'
      });
    } catch (error) {
      console.error('Error showing ad in SearchResultsScreen:', error);
      setAdError(error.message || 'Failed to show ad');
      
      // Still navigate to job details even if ad fails
      navigation.navigate('JobDetails', { job: item });
    } finally {
      setIsAdLoading(false);
      setCurrentJobId(null);
    }
  };

  const renderJobCard = ({ item }) => {
    const isLoading = currentJobId === item.id;
    
    return (
      <JobCard
        job={item}
        onPress={() => handleJobPress(item)}
        showBadge={false}
        isLoading={isLoading || isAdLoading}
      />
    );
  };

  const renderFilterOption = (label, key, icon) => (
    <TouchableOpacity 
      style={[styles.filterOption, filters[key] && styles.filterOptionActive]}
      onPress={() => setFilters(prev => ({ ...prev, [key]: !prev[key] }))}
    >
      <Ionicons 
        name={icon} 
        size={24} 
        color={filters[key] ? '#007AFF' : '#666'} 
        style={styles.filterIcon}
      />
      <Text style={[styles.filterLabel, filters[key] && styles.filterLabelActive]}>
        {label}
      </Text>
      <View style={styles.checkboxContainer}>
        {filters[key] && (
          <View style={styles.checkbox}>
            <Ionicons name="checkmark" size={14} color="#fff" />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderFilterModal = () => (
    <Modal
      visible={filterModalVisible}
      transparent={true}
      animationType="none"
      onRequestClose={closeFilterModal}
    >
      <Animated.View 
        style={[
          styles.modalOverlay,
          { opacity: backdropOpacity }
        ]}
        onTouchEnd={closeFilterModal}
      />
      
      <Animated.View 
        style={[
          styles.modalContainer,
          { transform: [{ translateY: modalY }] }
        ]}
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Filter Jobs</Text>
          <TouchableOpacity onPress={closeFilterModal} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.modalDragIndicator} />
        
        <ScrollView style={styles.filterList}>
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Job Type</Text>
            <View style={styles.filterOptions}>
              {renderFilterOption('Full Time', 'fullTime', 'briefcase-outline')}
              {renderFilterOption('Part Time', 'partTime', 'time-outline')}
              {renderFilterOption('Contract', 'contract', 'document-text-outline')}
              {renderFilterOption('Internship', 'internship', 'school-outline')}
            </View>
          </View>
          
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Location</Text>
            <View style={styles.filterOptions}>
              {renderFilterOption('Remote', 'remote', 'globe-outline')}
              {renderFilterOption('On-Site', 'onSite', 'business-outline')}
              {renderFilterOption('Hybrid', 'hybrid', 'git-merge-outline')}
            </View>
          </View>
          
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Experience Level</Text>
            <View style={styles.filterOptions}>
              {renderFilterOption('Entry Level', 'entryLevel', 'leaf-outline')}
              {renderFilterOption('Mid Level', 'midLevel', 'analytics-outline')}
              {renderFilterOption('Senior Level', 'seniorLevel', 'trending-up-outline')}
            </View>
          </View>
          
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Salary Range</Text>
            <View style={styles.filterOptions}>
              {renderFilterOption('$0-50K', 'salary1', 'cash-outline')}
              {renderFilterOption('$50K-100K', 'salary2', 'cash-outline')}
              {renderFilterOption('$100K+', 'salary3', 'cash-outline')}
            </View>
          </View>
        </ScrollView>
        
        <View style={styles.modalFooter}>
          <TouchableOpacity 
            style={styles.resetButton}
            onPress={resetFilters}
          >
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.applyButton}
            onPress={applyFilters}
          >
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Search Results</Text>
          <View style={{ width: 40 }} />
        </View>
        
        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#007AFF" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search jobs..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => {
                if (searchQuery.trim()) {
                  navigation.setParams({ query: searchQuery.trim() });
                  dispatch(searchJobs(searchQuery.trim()));
                }
              }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={() => setSearchQuery('')}
              >
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>
          
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={openFilterModal}
          >
            <Ionicons name="options" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Searching jobs...</Text>
        </View>
      ) : error ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#666" />
          <Text style={styles.emptyTitle}>Error</Text>
          <Text style={styles.emptySubtitle}>{error}</Text>
        </View>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          renderItem={renderJobCard}
          keyExtractor={item => (item.id ? item.id.toString() : Math.random().toString())}
          contentContainerStyle={[
            styles.resultsList, 
            { paddingBottom: 80 + insets.bottom } // Add padding for ad banner
          ]}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={64} color="#666" />
          <Text style={styles.emptyTitle}>No jobs found</Text>
          <Text style={styles.emptySubtitle}>
            Try adjusting your search or filters to find what you're looking for
          </Text>
        </View>
      )}
      
      {/* Ad Banner at bottom of screen */}
      <View style={[styles.adContainer, { paddingBottom: insets.bottom }]}>
        <AdBanner />
      </View>
      
      <InterstitialAdComponent
        ref={interstitialAdRef}
        onAdClosed={() => {
          console.log('Interstitial ad closed in SearchResultsScreen');
          // Reload the ad after it's closed
          interstitialAdRef.current?.loadAd();
        }}
        onAdFailedToLoad={(error) => {
          console.log('Interstitial ad failed to load in SearchResultsScreen:', error);
          setAdError('Failed to load ad. Please try again.');
          // Retry loading the ad after a delay
          setTimeout(() => {
            interstitialAdRef.current?.loadAd();
          }, 5000);
        }}
        onAdLoaded={() => {
          console.log('Interstitial ad loaded successfully in SearchResultsScreen');
          setAdError(null);
        }}
      />
      
      {adError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{adError}</Text>
        </View>
      )}
      
      {renderFilterModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 12,
    marginRight: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    padding: 0,
    fontWeight: '500',
  },
  clearButton: {
    padding: 4,
  },
  filterButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
  },
  // New modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 30,
    maxHeight: height * 0.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 8,
  },
  modalDragIndicator: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#e0e0e0',
    alignSelf: 'center',
    marginBottom: 10,
  },
  filterList: {
    paddingHorizontal: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  filterOptions: {
    gap: 12,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  filterOptionActive: {
    backgroundColor: '#e7f3ff',
    borderColor: '#007AFF',
  },
  filterIcon: {
    marginRight: 16,
  },
  filterLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  filterLabelActive: {
    color: '#007AFF',
  },
  checkboxContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    gap: 12,
  },
  resetButton: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  applyButton: {
    flex: 2,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  resultsList: {
    padding: 16,
  },
  jobCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  companyLogo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  companyInitial: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  jobInfo: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  companyName: {
    fontSize: 15,
    color: '#6c757d',
    fontWeight: '500',
  },
  jobDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#495057',
    fontWeight: '500',
  },
  jobTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 13,
    color: '#495057',
    fontWeight: '500',
  },
  saveButton: {
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 22,
  },
  adContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
    alignItems: 'center',
    zIndex: 10,
  },
  jobCardLoading: {
    opacity: 0.7,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 20,
  },
  errorContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    backgroundColor: '#ffebee',
    padding: 10,
    alignItems: 'center',
    zIndex: 11,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  todayBadgeContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#007AFF',
    padding: 4,
    borderRadius: 8,
  },
  todayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  todayBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
});

export default SearchResultsScreen; 