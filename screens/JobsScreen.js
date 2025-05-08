import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Modal,
  ScrollView,
  Alert,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchFeaturedJobs, 
  fetchTodayJobs, 
  searchJobs,
  clearSearchResults,
  fetchJobs 
} from '../store/slices/jobSlice';
import AdLoadingManager from '../components/AdLoadingManager';
import InterstitialAdComponent from '../components/InterstitialAd';
import JobCard from '../components/JobCard';
import { NativeAdView, NativeAsset, NativeAssetType, NativeMediaView, TestIds } from 'react-native-google-mobile-ads';
import NativeAdComponent from '../components/NativeAdComponent';

const SAVED_JOBS_KEY = '@saved_jobs';

const TABS = {
  ALL: 'all',
  FEATURED: 'featured',
  TODAY: 'today'
};

const JobsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const adManagerRef = useRef(null);
  const [currentJobId, setCurrentJobId] = useState(null);
  const { jobs, featuredJobs, todayJobs, loading, error, searchResults } = useSelector(state => {
    console.log('🔵 Redux State:', state.jobs); // Debug log
    return {
      jobs: Array.isArray(state.jobs.jobs) ? state.jobs.jobs : [],
      featuredJobs: Array.isArray(state.jobs.featuredJobs) ? state.jobs.featuredJobs : [],
      todayJobs: Array.isArray(state.jobs.todayJobs) ? state.jobs.todayJobs : [],
      loading: state.jobs.loading,
      error: state.jobs.error,
      searchResults: Array.isArray(state.jobs.searchResults) ? state.jobs.searchResults : []
    };
  });

  const [activeTab, setActiveTab] = useState(TABS.ALL);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [savedJobs, setSavedJobs] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState({
    type: [],
    location: [],
    salary: null
  });
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [salaryRange, setSalaryRange] = useState({ min: '', max: '' });
  const [isAdLoading, setIsAdLoading] = useState(false);
  const [nativeAd, setNativeAd] = useState(null);
  const [isNativeAdLoading, setIsNativeAdLoading] = useState(false);
  const nativeAdRef = useRef(null);
  const [nativeAdError, setNativeAdError] = useState(null);

  // Add loadJobs function for retry and refresh
  const loadJobs = async () => {
    try {
      console.log('🔵 Loading jobs...'); // Debug log
      const result = await dispatch(fetchJobs()).unwrap();
      console.log('🔵 Jobs loaded:', result); // Debug log
    } catch (err) {
      console.error('🔵 Error loading jobs:', err);
    }
  };

  // Load initial data
  useEffect(() => {
    console.log('🔵 JobsScreen mounted, loading initial data...'); // Debug log
    loadJobs();
    loadSavedJobs();
  }, []);

  // Memoize the current jobs based on active tab and search
  const currentJobs = useMemo(() => {
    console.log('🔵 Computing currentJobs:', { searchQuery, activeTab, jobs, featuredJobs, todayJobs }); // Debug log
    if (searchQuery) return searchResults || [];
    
    switch (activeTab) {
      case TABS.FEATURED:
        return featuredJobs || [];
      case TABS.TODAY:
        return todayJobs || [];
      default:
        return jobs || [];
    }
  }, [searchQuery, searchResults, activeTab, featuredJobs, todayJobs, jobs]);

  // Memoize available types and locations
  const { availableTypes, availableLocations } = useMemo(() => {
    if (currentJobs.length === 0) return { availableTypes: [], availableLocations: [] };
    
    // Get unique types and locations from current jobs
    const types = new Set();
    const locations = new Set();
    
    currentJobs.forEach(job => {
      if (job.type) types.add(job.type);
      if (job.location) locations.add(job.location);
    });
    
    return {
      availableTypes: Array.from(types).sort(),
      availableLocations: Array.from(locations).sort()
    };
  }, [currentJobs]);

  // Memoize filtered jobs
  const filteredJobs = useMemo(() => {
    if (!Array.isArray(currentJobs)) return [];
    
    let filtered = [...currentJobs];

    // Apply type filters
    if (selectedFilters.type.length > 0) {
      filtered = filtered.filter(job => 
        job && selectedFilters.type.includes(job.type)
      );
    }

    // Apply location filters
    if (selectedFilters.location.length > 0) {
      filtered = filtered.filter(job => 
        job && selectedFilters.location.includes(job.location)
      );
    }

    // Apply salary filter
    if (selectedFilters.salary) {
      filtered = filtered.filter(job => {
        if (!job || !job.salary) return false;
        const jobSalary = parseInt(job.salary.replace(/[^0-9]/g, ''));
        const { min, max } = selectedFilters.salary;
        
        if (min && max) {
          return jobSalary >= min && jobSalary <= max;
        } else if (min) {
          return jobSalary >= min;
        } else if (max) {
          return jobSalary <= max;
        }
        return true;
      });
    }

    return filtered;
  }, [currentJobs, selectedFilters]);

  // Handle search query changes with debounce
  useEffect(() => {
    const searchTimeout = setTimeout(() => {
      if (searchQuery) {
        dispatch(searchJobs(searchQuery));
      } else {
        dispatch(clearSearchResults());
      }
    }, 500);

    return () => clearTimeout(searchTimeout);
  }, [searchQuery, dispatch]);

  const loadSavedJobs = async () => {
    try {
      const saved = await AsyncStorage.getItem(SAVED_JOBS_KEY);
      if (saved) {
        setSavedJobs(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading saved jobs:', error);
    }
  };

  const handleJobSave = async (job) => {
    try {
      const savedJobIds = await AsyncStorage.getItem(SAVED_JOBS_KEY);
      const currentSavedJobs = savedJobIds ? JSON.parse(savedJobIds) : [];
      
      let newSavedJobs;
      if (currentSavedJobs.some(savedJob => savedJob.id === job.id)) {
        // Remove job from saved jobs
        newSavedJobs = currentSavedJobs.filter(savedJob => savedJob.id !== job.id);
        Alert.alert(
          'Job Removed',
          'This job has been removed from your saved jobs.',
          [{ text: 'OK' }]
        );
      } else {
        // Add job to saved jobs with current timestamp
        newSavedJobs = [...currentSavedJobs, {
          ...job,
          savedAt: new Date().toISOString()
        }];
        Alert.alert(
          'Job Saved',
          'This job has been added to your saved jobs.',
          [{ text: 'OK' }]
        );
      }
      
      await AsyncStorage.setItem(SAVED_JOBS_KEY, JSON.stringify(newSavedJobs));
      setSavedJobs(newSavedJobs);
    } catch (error) {
      console.error('Error saving job:', error);
      Alert.alert(
        'Error',
        'Failed to save job. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const toggleFilter = (type, value) => {
    setSelectedFilters(prev => ({
      ...prev,
      [type]: prev[type].includes(value)
        ? prev[type].filter(item => item !== value)
        : [...prev[type], value]
    }));
  };

  const applySalaryFilter = () => {
    const min = salaryRange.min ? parseInt(salaryRange.min) : null;
    const max = salaryRange.max ? parseInt(salaryRange.max) : null;
    
    setSelectedFilters(prev => ({
      ...prev,
      salary: { min, max }
    }));
  };

  const clearAllFilters = () => {
    setSelectedFilters({
      type: [],
      location: [],
      salary: null
    });
    setSalaryRange({ min: '', max: '' });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadJobs();
    setRefreshing(false);
  };

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tab, activeTab === TABS.ALL && styles.activeTab]}
        onPress={() => setActiveTab(TABS.ALL)}
      >
        <Text style={[styles.tabText, activeTab === TABS.ALL && styles.activeTabText]}>
          All Jobs
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === TABS.FEATURED && styles.activeTab]}
        onPress={() => setActiveTab(TABS.FEATURED)}
      >
        <Text style={[styles.tabText, activeTab === TABS.FEATURED && styles.activeTabText]}>
          Featured
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === TABS.TODAY && styles.activeTab]}
        onPress={() => setActiveTab(TABS.TODAY)}
      >
        <Text style={[styles.tabText, activeTab === TABS.TODAY && styles.activeTabText]}>
          Today
        </Text>
      </TouchableOpacity>
    </View>
  );

  const handleJobPress = async (job) => {
    try {
      setCurrentJobId(job.id);
      setIsAdLoading(true);

      if (adManagerRef.current) {
        // Check if ad is ready before showing
        if (adManagerRef.current.isInterstitialLoading()) {
          console.log('Ad is still loading, waiting...');
          // Wait for a short time and try again
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        await adManagerRef.current.showInterstitialAd();
      }

      navigation.navigate('JobDetails', { 
        jobId: job?.id,
        title: job?.title || 'Untitled Job'
      });
    } catch (error) {
      console.error('Error showing ad:', error);
      // If ad fails, still navigate to job details
      navigation.navigate('JobDetails', { 
        jobId: job?.id,
        title: job?.title || 'Untitled Job'
      });
    } finally {
      setCurrentJobId(null);
      setIsAdLoading(false);
    }
  };

  // Modify the renderJobCard function to include native ads
  const renderJobCard = useCallback(({ item, index }) => {
    // Show native ad after every 2 jobs
    if (index % 2 === 0) {
      console.log('🔵 Rendering native ad at index:', index);
      console.log('🔵 Current jobs count:', currentJobs.length);
      console.log('🔵 Active tab:', activeTab);
      console.log('🔵 Job item:', item?.id);
      
      return (
        <View key={`ad-${index}`}>
          <NativeAdComponent key={`native-ad-${index}`} />
          <JobCard
            job={item}
            onPress={() => handleJobPress(item)}
            onSave={() => handleJobSave(item)}
            showBadge={activeTab === TABS.TODAY}
            isLoading={isAdLoading}
          />
        </View>
      );
    }

    return (
      <JobCard
        key={`job-${item.id}`}
        job={item}
        onPress={() => handleJobPress(item)}
        onSave={() => handleJobSave(item)}
        showBadge={activeTab === TABS.TODAY}
        isLoading={isAdLoading}
      />
    );
  }, [handleJobPress, handleJobSave, activeTab, isAdLoading, currentJobs]);

  // Add debug logs for FlatList data
  useEffect(() => {
    console.log('🔵 JobsScreen mounted');
    console.log('🔵 Current jobs:', currentJobs.length);
    console.log('🔵 Active tab:', activeTab);
    console.log('🔵 Search query:', searchQuery);
    console.log('🔵 Filtered jobs:', filteredJobs.length);
    console.log('🔵 Loading state:', loading);
    console.log('🔵 Error state:', error);
    
    return () => {
      console.log('🔵 JobsScreen unmounted');
    };
  }, [currentJobs, activeTab, searchQuery, filteredJobs, loading, error]);

  // Add debug logs for tab changes
  useEffect(() => {
    console.log('🔵 Tab changed to:', activeTab);
    console.log('🔵 Jobs count in new tab:', currentJobs.length);
    console.log('🔵 Filtered jobs count:', filteredJobs.length);
  }, [activeTab, currentJobs, filteredJobs]);

  // Add debug logs for search changes
  useEffect(() => {
    if (searchQuery) {
      console.log('🔵 Search query changed:', searchQuery);
      console.log('🔵 Search results count:', searchResults.length);
    }
  }, [searchQuery, searchResults]);

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="briefcase-outline" size={60} color="#ccc" />
      <Text style={styles.emptyTitle}>No Jobs Found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery ? 'Try adjusting your search or filters' : 'Start searching for jobs to see results here'}
      </Text>
    </View>
  );

  const renderFilterModal = () => (
    <Modal
      visible={filterModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setFilterModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Jobs</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setFilterModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filterScroll}>
            {/* Job Type Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Job Type</Text>
              <View style={styles.filterChips}>
                {availableTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.filterChip,
                      selectedFilters.type.includes(type) && styles.filterChipActive
                    ]}
                    onPress={() => toggleFilter('type', type)}
                  >
                    <Text style={[
                      styles.filterChipText,
                      selectedFilters.type.includes(type) && styles.filterChipTextActive
                    ]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Location Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Location</Text>
              <View style={styles.filterChips}>
                {availableLocations.map((location) => (
                  <TouchableOpacity
                    key={location}
                    style={[
                      styles.filterChip,
                      selectedFilters.location.includes(location) && styles.filterChipActive
                    ]}
                    onPress={() => toggleFilter('location', location)}
                  >
                    <Text style={[
                      styles.filterChipText,
                      selectedFilters.location.includes(location) && styles.filterChipTextActive
                    ]}>
                      {location}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Salary Range Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Salary Range</Text>
              <View style={styles.salaryInputs}>
                <View style={styles.salaryInputContainer}>
                  <Text style={styles.salaryLabel}>Min</Text>
                  <TextInput
                    style={styles.salaryInput}
                    placeholder="Min"
                    keyboardType="numeric"
                    value={salaryRange.min}
                    onChangeText={(text) => setSalaryRange(prev => ({ ...prev, min: text }))}
                  />
                </View>
                <View style={styles.salaryInputContainer}>
                  <Text style={styles.salaryLabel}>Max</Text>
                  <TextInput
                    style={styles.salaryInput}
                    placeholder="Max"
                    keyboardType="numeric"
                    value={salaryRange.max}
                    onChangeText={(text) => setSalaryRange(prev => ({ ...prev, max: text }))}
                  />
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={clearAllFilters}
            >
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.applyButton}
              onPress={() => {
                applySalaryFilter();
                setFilterModalVisible(false);
              }}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container]}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search jobs..."
            value={searchQuery}
            onChangeText={setSearchQuery}
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
          style={[styles.filterButton, showFilters && styles.filterButtonActive]}
          onPress={() => setFilterModalVisible(true)}
        >
          <Ionicons name="options-outline" size={24} color={showFilters ? "#007AFF" : "#333"} />
        </TouchableOpacity>
      </View>

      {renderTabBar()}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading jobs...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={loadJobs}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.contentContainer}>
          <FlatList
            data={filteredJobs}
            renderItem={renderJobCard}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={[
              styles.listContainer,
              { paddingBottom: 200 }
            ]}
            ListEmptyComponent={renderEmptyList}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#007AFF']}
                tintColor="#007AFF"
              />
            }
            onEndReached={() => {
              console.log('🔵 FlatList reached end');
              console.log('🔵 Current items count:', filteredJobs.length);
              console.log('🔵 Last item:', filteredJobs[filteredJobs.length - 1]?.id);
            }}
            onEndReachedThreshold={0.5}
            ListHeaderComponent={() => {
              console.log('🔵 FlatList header rendered');
              return null;
            }}
            ListFooterComponent={() => {
              console.log('🔵 FlatList footer rendered');
              return null;
            }}
            extraData={[activeTab, isAdLoading]}
          />
        </View>
      )}

      <View style={styles.adContainer}>
        <AdLoadingManager ref={adManagerRef} />
      </View>

      {adManagerRef.current?.getInterstitialError() && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{adManagerRef.current.getInterstitialError()}</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 4,
  },
  filterButton: {
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  filterButtonActive: {
    backgroundColor: '#e3f2fd',
    borderColor: '#007AFF',
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  jobCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  companyLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  companyInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  jobInfo: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  companyName: {
    fontSize: 14,
    color: '#666',
  },
  jobDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  detailText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#495057',
    fontWeight: '500',
  },
  jobTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  tagText: {
    fontSize: 12,
    color: '#495057',
    fontWeight: '500',
  },
  saveButton: {
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    backgroundColor: '#ffebee',
    padding: 10,
    alignItems: 'center',
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  retryButton: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 8,
  },
  filterScroll: {
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  filterChipActive: {
    backgroundColor: '#e3f2fd',
    borderColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#007AFF',
  },
  salaryInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  salaryInputContainer: {
    flex: 1,
  },
  salaryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  salaryInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    gap: 12,
  },
  clearButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  applyButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#007AFF',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
  },
  contentContainer: {
    flex: 1,
    position: 'relative',
  },
  jobCardLoading: {
    opacity: 0.7,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  nativeAdContainer: {
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
    minHeight: 200, // Ensure minimum height for visibility
  },
  nativeAdError: {
    color: '#ff3b30',
    textAlign: 'center',
    padding: 16,
  },
  nativeAdView: {
    width: '100%',
  },
  nativeAdContent: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
  },
  nativeAdIcon: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  nativeAdTextContainer: {
    flex: 1,
  },
  nativeAdHeadline: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  nativeAdAdvertiser: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  nativeAdBody: {
    fontSize: 14,
    color: '#666',
  },
  nativeAdMediaContainer: {
    width: '100%',
    aspectRatio: 16/9,
  },
  nativeAdMedia: {
    width: '100%',
    height: '100%',
  },
  nativeAdFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  nativeAdSponsored: {
    fontSize: 12,
    color: '#666',
  },
  nativeAdButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  nativeAdButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default JobsScreen; 