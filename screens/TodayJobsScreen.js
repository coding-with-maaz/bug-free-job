import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  RefreshControl,
  Image,
  Animated,
  ActivityIndicator,
  Alert,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTodayJobs } from '../store/slices/jobSlice';
import JobCard from '../components/JobCard';
import { colors } from '../theme/colors';
import AdBanner from '../components/AdBanner';
import AdLoadingManager from '../components/AdLoadingManager';
import InterstitialAdComponent from '../components/InterstitialAd';

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

const SAVED_JOBS_KEY = '@saved_jobs';

const TodayJobsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { todayJobs: allTodayJobs, todayJobsPagination, loading, error } = useSelector(state => {
    console.log('🔵 Redux State:', state.jobs); // Debug log
    return {
      todayJobs: Array.isArray(state.jobs.todayJobs) ? state.jobs.todayJobs : [],
      todayJobsPagination: state.jobs.todayJobsPagination || {},
      loading: state.jobs.loading,
      error: state.jobs.error
    };
  });
  
  // Filter to only include jobs from today
  const todayJobs = useMemo(() => {
    if (!Array.isArray(allTodayJobs)) return [];
    
    return allTodayJobs.filter(job => {
      if (!job?.postedAt) return false;
      
      const jobDate = new Date(job.postedAt);
      const today = new Date();
      
      return jobDate.getDate() === today.getDate() && 
             jobDate.getMonth() === today.getMonth() && 
             jobDate.getFullYear() === today.getFullYear();
    });
  }, [allTodayJobs]);
  
  // Check if there are jobs with dates older than today that are incorrectly included
  const hasOlderJobs = useMemo(() => {
    if (!Array.isArray(allTodayJobs)) return false;
    
    return allTodayJobs.some(job => {
      if (!job?.postedAt) return false;
      
      const jobDate = new Date(job.postedAt);
      const today = new Date();
      
      return !(jobDate.getDate() === today.getDate() && 
               jobDate.getMonth() === today.getMonth() && 
               jobDate.getFullYear() === today.getFullYear());
    });
  }, [allTodayJobs]);
  
  const [refreshing, setRefreshing] = useState(false);
  const [savedJobs, setSavedJobs] = useState(new Set());
  const [showQuickApplyModal, setShowQuickApplyModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applying, setApplying] = useState(false);
  const [page, setPage] = useState(1);
  const [isAdLoading, setIsAdLoading] = useState(false);
  const [adError, setAdError] = useState(null);
  const [currentJobId, setCurrentJobId] = useState(null);
  const interstitialAdRef = useRef(null);
  const adManagerRef = useRef(null);

  const loadSavedJobs = async () => {
    try {
      const savedJobIds = await AsyncStorage.getItem(SAVED_JOBS_KEY);
      if (savedJobIds) {
        setSavedJobs(new Set(JSON.parse(savedJobIds)));
      }
    } catch (error) {
      console.error('Error loading saved jobs:', error);
    }
  };

  useEffect(() => {
    loadSavedJobs();
  }, []);

  const loadJobs = async (pageNum = 1) => {
    try {
      console.log('🔵 Loading jobs...'); // Debug log
      const result = await dispatch(fetchTodayJobs({ page: pageNum, limit: 10 })).unwrap();
      console.log('🔵 Jobs Result:', result); // Debug log
    } catch (error) {
      console.error('🔵 Error loading jobs:', error);
      Alert.alert('Error', 'Failed to load jobs. Please try again.');
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    console.log('Setting up interstitial ad on today jobs screen');
    const timer = setTimeout(() => {
      if (interstitialAdRef.current) {
        console.log('Loading interstitial ad in TodayJobsScreen');
        interstitialAdRef.current.loadAd();
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    await loadJobs(1);
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (!loading && todayJobsPagination.hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadJobs(nextPage);
    }
  };

  const handleSaveJob = useCallback(async (job) => {
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
      setSavedJobs(new Set(newSavedJobs.map(job => job.id)));
    } catch (error) {
      console.error('Error saving job:', error);
      Alert.alert(
        'Error',
        'Failed to save job. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, []);

  const handleQuickApply = useCallback((job) => {
    setSelectedJob(job);
    setShowQuickApplyModal(true);
  }, []);

  const handleConfirmQuickApply = useCallback(async () => {
    if (!selectedJob) return;

    setApplying(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      Alert.alert(
        'Application Submitted',
        'Your application has been submitted successfully!',
        [{ 
          text: 'OK',
          onPress: () => {
            setShowQuickApplyModal(false);
            setSelectedJob(null);
          }
        }]
      );
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to submit application. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setApplying(false);
    }
  }, [selectedJob]);

  const handleJobPress = async (job) => {
    if (!job?.id) {
      Alert.alert('Error', 'Invalid job data');
      return;
    }

    try {
      setCurrentJobId(job.id);
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
        jobId: job.id,
        job: job,
        fromScreen: 'TodayJobs'
      });
    } catch (error) {
      console.error('Error showing ad in TodayJobsScreen:', error);
      setAdError(error.message || 'Failed to show ad');
      
      // Still navigate to job details even if ad fails
    navigation.navigate('JobDetails', { jobId: job.id });
    } finally {
      setIsAdLoading(false);
      setCurrentJobId(null);
    }
  };

  // Function to check if a job was posted today
  const isPostedToday = (job) => {
    if (!job.postedAt) return false;
    
    const jobDate = new Date(job.postedAt);
    const today = new Date();
    
    return jobDate.getDate() === today.getDate() && 
           jobDate.getMonth() === today.getMonth() && 
           jobDate.getFullYear() === today.getFullYear();
  };

  const renderQuickApplyModal = () => (
    <Modal
      visible={showQuickApplyModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowQuickApplyModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Quick Apply</Text>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowQuickApplyModal(false)}
            >
              <Ionicons name="close-circle" size={28} color="#666" />
            </TouchableOpacity>
          </View>

          {selectedJob && (
            <View style={styles.quickApplyContent}>
              <View style={styles.jobPreview}>
                <Text style={styles.jobPreviewTitle}>{selectedJob.title}</Text>
                <Text style={styles.jobPreviewCompany}>{selectedJob.company}</Text>
                <Text style={styles.jobPreviewLocation}>{selectedJob.location}</Text>
              </View>

              <Text style={styles.confirmText}>
                Your profile and resume will be submitted to this job. Continue?
              </Text>

              <TouchableOpacity
                style={[styles.confirmButton, applying && styles.confirmButtonDisabled]}
                onPress={handleConfirmQuickApply}
                disabled={applying}
              >
                {applying ? (
                  <View style={styles.applyingContainer}>
                    <ActivityIndicator color="#fff" />
                    <Text style={styles.applyingText}>Submitting...</Text>
                  </View>
                ) : (
                  <Text style={styles.confirmButtonText}>Submit Application</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Animated.View>
        <Ionicons name="today-outline" size={80} color="#ccc" />
      </Animated.View>
      <Text style={styles.emptyTitle}>No Jobs Today</Text>
      <Text style={styles.emptySubtitle}>
        {error || 'Check back tomorrow for new opportunities'}
      </Text>
      <TouchableOpacity 
        style={styles.refreshEmptyButton}
        onPress={handleRefresh}
      >
        <Ionicons name="refresh-outline" size={20} color="#fff" />
        <Text style={styles.refreshEmptyText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading jobs...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Today's Jobs</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={handleRefresh}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#007AFF" />
          ) : (
            <Ionicons name="refresh-outline" size={24} color="#007AFF" />
          )}
        </TouchableOpacity>
      </View>

      {hasOlderJobs && (
        <View style={styles.warningContainer}>
          <Ionicons name="warning-outline" size={18} color="#ff9500" />
          <Text style={styles.warningText}>
            Some jobs showing here are from previous days. Backend integration may need to be fixed.
          </Text>
        </View>
      )}

      <FlatList
        data={todayJobs}
        renderItem={({ item }) => (
          <JobCard
            job={item}
            onPress={() => handleJobPress(item)}
            onSave={handleSaveJob}
            showBadge={isPostedToday(item)}
            isLoading={currentJobId === item.id}
          />
        )}
        keyExtractor={(item) => item?.id?.toString() || Math.random().toString()}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        contentContainerStyle={[
          styles.listContainer,
          !todayJobs?.length && styles.emptyListContainer,
          { paddingBottom: 80 + insets.bottom } // Add padding for the ad banner
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyList}
      />

      {/* Ad Banner at bottom of screen */}
      <View style={[styles.adContainer, { paddingBottom: insets.bottom }]}>
        <AdBanner />
      </View>

      <InterstitialAdComponent
        ref={interstitialAdRef}
        onAdClosed={() => {
          console.log('Interstitial ad closed in TodayJobsScreen');
          // Reload the ad after it's closed
          interstitialAdRef.current?.loadAd();
        }}
        onAdFailedToLoad={(error) => {
          console.log('Interstitial ad failed to load in TodayJobsScreen:', error);
          setAdError('Failed to load ad. Please try again.');
          // Retry loading the ad after a delay
          setTimeout(() => {
            interstitialAdRef.current?.loadAd();
          }, 5000);
        }}
        onAdLoaded={() => {
          console.log('Interstitial ad loaded successfully in TodayJobsScreen');
          setAdError(null);
        }}
      />
      
      {adError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{adError}</Text>
        </View>
      )}

      {renderQuickApplyModal()}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
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
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 400,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 24,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  refreshEmptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  refreshEmptyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  companyInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  modalCloseButton: {
    padding: 4,
  },
  quickApplyContent: {
    padding: 20,
  },
  jobPreview: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  jobPreviewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  jobPreviewCompany: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  jobPreviewLocation: {
    fontSize: 14,
    color: '#666',
  },
  confirmText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 24,
  },
  confirmButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  applyingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    paddingVertical: 20,
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
    borderRadius: 12,
  },
  errorContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    backgroundColor: '#ffebee',
    padding: 10,
    alignItems: 'center',
    zIndex: 10,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    padding: 12,
    margin: 16,
    marginTop: 0,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffe69c',
  },
  warningText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#856404',
  },
});

export default TodayJobsScreen; 