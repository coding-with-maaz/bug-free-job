import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchJobsByCategory } from '../store/slices/jobSlice';
import AdLoadingManager from '../components/AdLoadingManager';
import JobCard from '../components/JobCard';
import { fetchCategoryBySlug } from '../store/slices/categorySlice';

const DEFAULT_LOGO = 'https://via.placeholder.com/50';

const DEFAULT_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'full-time', label: 'Full-time' },
  { id: 'contract', label: 'Contract' },
  { id: 'remote', label: 'Remote' }
];

const ITEMS_PER_PAGE = 10;
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes in milliseconds

const CategoryResultsScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const isMounted = useRef(true);
  const adManagerRef = useRef(null);
  const [isAdLoading, setIsAdLoading] = useState(false);
  const [currentJobId, setCurrentJobId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [failedImages, setFailedImages] = useState(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [savedJobIds, setSavedJobIds] = useState(new Set());
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  
  const { categoryId, slug } = route.params;
  const { selectedCategory, loading, error } = useSelector((state) => state.categories);

  // Ensure category is properly structured
  const categoryData = useMemo(() => {
    if (!selectedCategory) return null;
    return {
      id: selectedCategory.id,
      name: selectedCategory.name || 'Unnamed Category',
      icon: selectedCategory.icon || 'briefcase',
      color: selectedCategory.color || '#007AFF',
      jobCount: selectedCategory.jobCount || 0
    };
  }, [selectedCategory]);

  // Get jobs from Redux store
  const { jobs, loading: jobLoading, error: jobError, pagination } = useSelector(state => ({
    jobs: state.jobs.categoryJobs || [],
    loading: state.jobs.loading,
    error: state.jobs.error,
    pagination: state.jobs.pagination || {
      total: 0,
      page: 1,
      pages: 1,
      hasMore: false
    }
  }));

  // Cache key for this category
  const cacheKey = `jobs_cache_${selectedCategory?.id}`;

  // Load saved job IDs when screen focuses
  useFocusEffect(
    React.useCallback(() => {
      loadSavedJobIds();
    }, [])
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const loadCategoryDetails = async () => {
      try {
        if (slug) {
          await dispatch(fetchCategoryBySlug(slug)).unwrap();
        } else if (categoryId) {
          await dispatch(fetchCategoryById(categoryId)).unwrap();
        }
      } catch (error) {
        console.error('Failed to load category details:', error);
      }
    };

    loadCategoryDetails();
  }, [dispatch, categoryId, slug]);

  const loadCachedJobs = async () => {
    try {
      const cachedData = await AsyncStorage.getItem(cacheKey);
      if (cachedData) {
        const { jobs: cachedJobs, timestamp } = JSON.parse(cachedData);
        const isExpired = Date.now() - timestamp > CACHE_EXPIRY;
        
        if (!isExpired && cachedJobs?.length > 0) {
          console.log('Loading jobs from cache');
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error loading cached jobs:', error);
      return false;
    }
  };

  const cacheJobs = async (jobsToCache) => {
    try {
      const cacheData = {
        jobs: jobsToCache,
        timestamp: Date.now()
      };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error caching jobs:', error);
    }
  };

  // Initialize jobs data
  useEffect(() => {
    let isActive = true;

    const fetchJobs = async (skipCache = false) => {
      if (!selectedCategory?.id) {
        console.log('No category ID available, skipping job fetch');
        return;
      }

      try {
        // Try loading from cache first, unless skipCache is true
        if (!skipCache && await loadCachedJobs()) {
          return;
        }

        if (!isActive) return;

        if (!isRefreshing) {
          setIsRefreshing(true);
        }
        
        console.log('Fetching jobs for category:', selectedCategory.id);
        console.log('Fetching jobs for category:', category.id);
        const result = await dispatch(fetchJobsByCategory({
          categoryId: category.id,
          type: selectedFilter,
          search: searchQuery,
          page: currentPage,
          limit: ITEMS_PER_PAGE
        })).unwrap();
        
        // Log the result for debugging
        console.log('Fetch result:', result);
        
        // Handle the response
        if (result?.data) {
          const { jobs: fetchedJobs, pagination } = result.data;
          
          // Cache the jobs
          if (Array.isArray(fetchedJobs)) {
            await cacheJobs(fetchedJobs);
          }
          
          // Update pagination
          if (pagination) {
            setTotalPages(pagination.pages || 1);
          }
        } else {
          console.warn('Unexpected response structure:', result);
          await cacheJobs([]);
          setTotalPages(1);
        }
      } catch (error) {
        console.error('Error fetching jobs:', error);
        Alert.alert(
          'Error',
          'Failed to fetch jobs. Please try again.',
          [
            {
              text: 'Retry',
              onPress: () => fetchJobs(true)
            },
            {
              text: 'Cancel',
              style: 'cancel'
            }
          ]
        );
      } finally {
        if (isActive && isMounted.current) {
          setIsRefreshing(false);
        }
      }
    };

    fetchJobs();

    return () => {
      isActive = false;
    };
  }, [category?.id, dispatch, selectedFilter, searchQuery, currentPage]);

  const handleRefresh = React.useCallback(() => {
    setIsRefreshing(true);
    // Force fetch from network, skip cache
    const fetchJobs = async (skipCache = false) => {
      if (!category?.id) {
        console.log('No category ID available, skipping job fetch');
        return;
      }

      try {
        // Try loading from cache first, unless skipCache is true
        if (!skipCache && await loadCachedJobs()) {
          return;
        }

        if (!isMounted.current) return;
        
        console.log('Fetching jobs for category:', category.id);
        const result = await dispatch(fetchJobsByCategory({
          categoryId: category.id,
          type: selectedFilter,
          search: searchQuery,
          page: currentPage,
          limit: ITEMS_PER_PAGE
        })).unwrap();
        
        // Cache the new jobs
        if (result?.jobs) {
          await cacheJobs(result.jobs);
        }

        if (result?.pagination) {
          setTotalPages(result.pagination.pages);
        }
      } catch (error) {
        console.error('Error fetching jobs:', error);
        Alert.alert('Error', 'Failed to fetch jobs. Please try again.');
      } finally {
        if (isMounted.current) {
          setIsRefreshing(false);
        }
      }
    };

    fetchJobs(true);
  }, [category?.id, dispatch, selectedFilter, searchQuery, currentPage]);

  const loadSavedJobIds = async () => {
    try {
      const savedJobsString = await AsyncStorage.getItem('savedJobs');
      if (savedJobsString) {
        const savedJobs = JSON.parse(savedJobsString);
        setSavedJobIds(new Set(savedJobs.map(job => job.id)));
      }
    } catch (error) {
      console.error('Error loading saved job IDs:', error);
    }
  };

  const toggleSaveJob = async (job) => {
    try {
      const savedJobsString = await AsyncStorage.getItem('savedJobs');
      let savedJobs = savedJobsString ? JSON.parse(savedJobsString) : [];
      
      if (savedJobIds.has(job.id)) {
        // Remove job from saved jobs
        savedJobs = savedJobs.filter(savedJob => savedJob.id !== job.id);
        setSavedJobIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(job.id);
          return newSet;
        });
      } else {
        // Add job to saved jobs
        savedJobs.push({
          ...job,
          savedAt: new Date().toISOString()
        });
        setSavedJobIds(prev => {
          const newSet = new Set(prev);
          newSet.add(job.id);
          return newSet;
        });
      }

      await AsyncStorage.setItem('savedJobs', JSON.stringify(savedJobs));
    } catch (error) {
      console.error('Error toggling saved job:', error);
    }
  };

  const filterJobs = React.useCallback((jobsToFilter) => {
    if (!Array.isArray(jobsToFilter)) {
      console.log('Jobs is not an array:', jobsToFilter);
      return [];
    }
    
    return jobsToFilter.filter(job => {
      if (!job) return false;

      // Apply search filter
      const matchesSearch = !searchQuery || 
        (job.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         job.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         job.location?.toLowerCase().includes(searchQuery.toLowerCase()));

      // Apply type filter
      const matchesType = selectedFilter === 'all' || 
        job.type?.toLowerCase() === selectedFilter.toLowerCase();

      // Apply remote filter
      const matchesRemote = selectedFilter !== 'remote' || 
        job.location?.toLowerCase().includes('remote');

      return matchesSearch && matchesType && matchesRemote;
    });
  }, [searchQuery, selectedFilter]);

  const filteredJobs = React.useMemo(() => {
    const filtered = filterJobs(jobs);
    console.log('Filtered jobs count:', filtered.length);
    return filtered;
  }, [jobs, filterJobs]);

  const renderFilter = React.useCallback(({ item }) => {
    if (!item) return null;
    
    return (
      <TouchableOpacity
        style={[
          styles.filterButton,
          selectedFilter === item.id && styles.filterButtonActive
        ]}
        onPress={() => setSelectedFilter(item.id)}
      >
        <Text style={[
          styles.filterText,
          selectedFilter === item.id && styles.filterTextActive
        ]}>
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  }, [selectedFilter]);

  const handleJobPress = async (job) => {
    if (!job?.id) {
      console.error('Invalid job data:', job);
      return;
    }

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
        jobId: job.id,
        title: job.title || 'Untitled Job'
      });
    } catch (error) {
      console.error('Error showing ad:', error);
      // If ad fails, still navigate to job details
      navigation.navigate('JobDetails', { 
        jobId: job.id,
        title: job.title || 'Untitled Job'
      });
    } finally {
      setCurrentJobId(null);
      setIsAdLoading(false);
    }
  };

  const renderJob = React.useCallback(({ item }) => {
    if (!item) return null;

    const isJobLoading = (item.id === currentJobId) && isAdLoading;
    const isSaved = savedJobIds.has(item.id);

    return (
      <View style={styles.jobCardContainer}>
        <JobCard
          job={item}
          onPress={() => handleJobPress(item)}
          onSave={() => toggleSaveJob(item)}
          showBadge={false}
          isLoading={isJobLoading}
        />
      </View>
    );
  }, [currentJobId, isAdLoading, savedJobIds, handleJobPress, toggleSaveJob]);

  // Handle back navigation
  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Categories');
    }
  };

  if (!categoryData) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Text style={styles.errorText}>Category information not available</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBack}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={handleBack}
        >
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={[styles.categoryIcon, { backgroundColor: categoryData.color }]}>
            <Ionicons name={categoryData.icon} size={24} color="#fff" />
          </View>
          <Text style={styles.categoryName}>{categoryData.name}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search-outline" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search jobs..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
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
        </View>

        <View style={styles.filtersContainer}>
          <FlatList
            data={DEFAULT_FILTERS}
            renderItem={renderFilter}
            keyExtractor={item => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersList}
          />
        </View>

        {loading && !isRefreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading jobs...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={handleRefresh}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredJobs}
            renderItem={renderJob}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={['#007AFF']}
                tintColor="#007AFF"
              />
            }
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No jobs found</Text>
                <Text style={styles.emptySubText}>Try adjusting your search or filters</Text>
              </View>
            )}
          />
        )}
      </View>

      <View style={styles.adContainer}>
        <AdLoadingManager 
          ref={adManagerRef}
          onAdLoaded={() => {
            console.log('Ad loaded successfully');
            setIsAdLoading(false);
          }}
          onAdFailedToLoad={(error) => {
            console.log('Ad failed to load:', error);
            setIsAdLoading(false);
          }}
        />
      </View>

      {adManagerRef.current?.getInterstitialError() && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{adManagerRef.current.getInterstitialError()}</Text>
        </View>
      )}
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
    borderBottomColor: '#eee',
    paddingBottom: 16,
  },
  headerTop: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryInfo: {
    alignItems: 'center',
    paddingTop: 8,
  },
  content: {
    flex: 1,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  jobCount: {
    fontSize: 16,
    color: '#666',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a1a1a',
  },
  clearButton: {
    padding: 4,
  },
  filtersContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filtersList: {
    paddingHorizontal: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#f8f9fa',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  jobCardContainer: {
    marginBottom: 16,
  },
  jobCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoContainer: {
    width: 50,
    height: 50,
    marginRight: 12,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f8f9fa',
  },
  companyLogo: {
    width: '100%',
    height: '100%',
  },
  jobInfo: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  companyName: {
    fontSize: 14,
    color: '#666',
  },
  saveButton: {
    padding: 8,
  },
  jobDetails: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  jobTags: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  tag: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  tagText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  postedTime: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerContent: {
    alignItems: 'center',
    paddingTop: 8,
  },
  categoryName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
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
  jobCardLoading: {
    opacity: 0.7,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
  },
});

export default CategoryResultsScreen; 