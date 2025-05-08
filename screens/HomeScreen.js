import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  StatusBar,
  TextInput,
  Animated,
  Dimensions,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import { fetchLatestJobs, fetchTodayJobs, searchJobs } from '../store/slices/jobSlice';
import AdLoadingManager from '../components/AdLoadingManager';
import AdBanner from '../components/AdBanner';
import JobCard from '../components/JobCard';

const RECENT_SEARCHES_KEY = '@recent_searches';
const SAVED_JOBS_KEY = '@saved_jobs';
const MAX_RECENT_SEARCHES = 5;

const getRandomColor = (companyName) => {
  const colors = [
    '#007AFF', // Blue
    '#34C759', // Green
    '#FF9500', // Orange
    '#FF2D55', // Pink
    '#5856D6', // Purple
    '#AF52DE', // Magenta
    '#5AC8FA', // Light Blue
    '#FF3B30'  // Red
  ];
  
  // Use company name to generate consistent color
  const index = companyName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[index % colors.length];
};

const CompanyLogo = ({ company, logo }) => {
  const [imageError, setImageError] = useState(false);
  const backgroundColor = getRandomColor(company);
  
  if (!logo || imageError) {
    return (
      <View style={[styles.companyLogo, { backgroundColor }]}>
        <Text style={styles.companyInitial}>
          {company.charAt(0).toUpperCase()}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.companyLogo}>
      <Image 
        source={{ uri: logo }} 
        style={styles.logoImage}
        onError={() => setImageError(true)}
      />
    </View>
  );
};

const HomeScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [savedJobs, setSavedJobs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [currentJobId, setCurrentJobId] = useState(null);
  const searchAnim = new Animated.Value(0);
  const adManagerRef = useRef(null);
  const dispatch = useDispatch();
  const { latestJobs, todayJobs, loading, error } = useSelector((state) => ({
    latestJobs: state.jobs.latestJobs?.data || [],
    todayJobs: state.jobs.todayJobs?.data || [],
    loading: state.jobs.loading,
    error: state.jobs.error
  }));

  useEffect(() => {
    console.log('HomeScreen mounted');
    loadData();
  }, []);

  useEffect(() => {
    console.log('Latest Jobs:', latestJobs);
    console.log('Today Jobs:', todayJobs);
  }, [latestJobs, todayJobs]);

  const loadData = async () => {
    try {
      console.log('Loading data...');
      await Promise.all([
        loadRecentSearches(),
        loadSavedJobs(),
        dispatch(fetchLatestJobs()),
        dispatch(fetchTodayJobs())
      ]);
      console.log('Data loaded successfully');
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const onRefresh = async () => {
    console.log('Refreshing data...');
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    console.log('Refresh completed');
  };

  const loadRecentSearches = async () => {
    try {
      const searches = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (searches) {
        setRecentSearches(JSON.parse(searches));
      }
    } catch (error) {
      console.error('Error loading recent searches:', error);
    }
  };

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

  const saveRecentSearch = async (query) => {
    try {
      const newSearches = [query, ...recentSearches.filter(s => s !== query)]
        .slice(0, MAX_RECENT_SEARCHES);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(newSearches));
      setRecentSearches(newSearches);
    } catch (error) {
      console.error('Error saving recent search:', error);
    }
  };

  const handleSearch = async () => {
    if (searchQuery.trim()) {
      console.log('Searching for:', searchQuery.trim());
      saveRecentSearch(searchQuery.trim());
      await dispatch(searchJobs(searchQuery.trim()));
      navigation.navigate('SearchResults', { query: searchQuery.trim() });
      setSearchQuery('');
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

  const handleJobPress = async (job) => {
    try {
      setCurrentJobId(job.id);
      if (adManagerRef.current) {
        await adManagerRef.current.showInterstitialAd();
      }
      navigation.navigate('JobDetails', {
        jobId: job.id,
        slug: job.slug
      });
    } catch (error) {
      console.error('Error showing ad:', error);
      // Still navigate to job details even if ad fails
      navigation.navigate('JobDetails', {
        jobId: job.id,
        slug: job.slug
      });
    } finally {
      setCurrentJobId(null);
    }
  };

  const handleCategoryPress = (category) => {
    navigation.navigate('CategoryResults', {
      categoryId: category.id,
      slug: category.slug
    });
  };

  const renderJobItem = ({ item }) => {
    const isJobLoading = item.id === currentJobId;
    const isSaved = savedJobs.some(savedJob => savedJob.id === item?.id);
    const isTodayJob = todayJobs.some(todayJob => todayJob.id === item?.id);
    
    return (
      <View style={[styles.jobCard, isJobLoading && styles.jobCardLoading]}>
        <View style={styles.jobHeader}>
          <CompanyLogo company={item.company} logo={item.companyLogo} />
          <View style={styles.jobInfo}>
            <Text style={styles.jobTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.companyName} numberOfLines={1}>
              {item.company}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.bookmarkButton}
            onPress={() => handleJobSave(item)}
          >
            <Ionicons
              name={isSaved ? "bookmark" : "bookmark-outline"}
              size={24}
              color={isSaved ? "#007AFF" : "#666"}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.jobDetails}>
          {item.location && (
            <View style={styles.detailItem}>
              <Ionicons name="location-outline" size={16} color="#666" />
              <Text style={styles.detailText}>{item.location}</Text>
            </View>
          )}
          {item.salary && (
            <View style={styles.detailItem}>
              <Ionicons name="cash-outline" size={16} color="#666" />
              <Text style={styles.detailText}>${item.salary}</Text>
            </View>
          )}
          {item.type && (
            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text style={styles.detailText}>{item.type}</Text>
            </View>
          )}
        </View>

        <View style={styles.jobFooter}>
          <View style={styles.jobType}>
            <Text style={styles.jobTypeText}>{item.type || 'Full-time'}</Text>
          </View>
          <TouchableOpacity
            style={styles.applyButton}
            onPress={() => handleJobPress(item)}
            disabled={isJobLoading}
          >
            {isJobLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.applyButtonText}>Apply Now</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderError = () => {
    if (error?.includes('Network access failed')) {
      return (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={64} color="#666" />
          <Text style={styles.errorTitle}>Network Error</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={loadData}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={64} color="#666" />
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={loadData}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading jobs...</Text>
      </View>
    );
  }

  if (error) {
    return renderError();
  }

  return (
    <View style={[styles.container]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Find Your</Text>
          <Text style={styles.name}>Dream Job</Text>
        </View>
      </View>

      <View style={styles.contentContainer}>
      <ScrollView 
        style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 200 }
          ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
      >
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search jobs..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Latest Jobs</Text>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.loadingText}>Loading latest jobs...</Text>
            </View>
          ) : latestJobs && latestJobs.length > 0 ? (
            <FlatList
              data={latestJobs}
              renderItem={renderJobItem}
              keyExtractor={(item) => item.id.toString()}
              horizontal={false}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
              contentContainerStyle={styles.jobList}
            />
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="briefcase-outline" size={48} color="#666" />
              <Text style={styles.emptyTitle}>No jobs available</Text>
              <Text style={styles.emptySubtitle}>Check back later for new opportunities</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Searches</Text>
            {recentSearches.length > 0 && (
              <TouchableOpacity 
                style={styles.clearAllButton}
                onPress={() => {
                  AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
                  setRecentSearches([]);
                }}
              >
                <Text style={styles.clearAllText}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.recentSearches}>
            {recentSearches.length > 0 ? (
              recentSearches.map((search, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.recentSearchItem}
                  onPress={() => {
                    setSearchQuery(search);
                    navigation.navigate('SearchResults', { query: search });
                  }}
                >
                  <Ionicons name="time-outline" size={20} color="#666" />
                  <Text style={styles.recentSearchText}>{search}</Text>
                  <TouchableOpacity
                    style={styles.clearSearchButton}
                    onPress={() => {
                      const newSearches = recentSearches.filter((_, i) => i !== index);
                      setRecentSearches(newSearches);
                      AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(newSearches));
                    }}
                  >
                    <Ionicons name="close-circle" size={20} color="#666" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.emptyText}>No recent searches</Text>
            )}
          </View>
        </View>
      </ScrollView>
      </View>

      <View style={styles.adContainer}>
        <AdLoadingManager ref={adManagerRef} />
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
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  greeting: {
    fontSize: 28,
    color: '#6c757d',
    marginBottom: 6,
    fontWeight: '500',
  },
  name: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginBottom: 24,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  searchIcon: {
    marginRight: 12,
    color: '#007AFF',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    padding: 0,
    fontWeight: '500',
  },
  clearButton: {
    padding: 6,
    marginLeft: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  clearAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  clearAllText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  jobCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  jobCardLoading: {
    opacity: 0.7,
  },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  jobInfo: {
    flex: 1,
    marginRight: 8,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  companyName: {
    fontSize: 14,
    color: '#666',
  },
  bookmarkButton: {
    padding: 8,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  detailText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#666',
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  jobType: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  jobTypeText: {
    color: '#1976d2',
    fontSize: 13,
    fontWeight: '500',
  },
  applyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  recentSearches: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  recentSearchText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: '#495057',
    fontWeight: '500',
  },
  clearSearchButton: {
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  emptyCard: {
    backgroundColor: '#fff',
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 20,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyText: {
    color: '#6c757d',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginVertical: 8,
  },
  jobList: {
    paddingVertical: 8,
  },
  contentContainer: {
    flex: 1,
    position: 'relative',
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
  companyLogo: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  companyInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
});

export default HomeScreen; 