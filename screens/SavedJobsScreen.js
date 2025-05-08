import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Image,
  TextInput,
  Animated,
  Platform,
  ScrollView,
  Modal,
  ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mockJobs } from '../data/mockData';
import AdLoadingManager from '../components/AdLoadingManager';
import InterstitialAdComponent from '../components/InterstitialAd';
import JobCard from '../components/JobCard';

const DOGO = 'https://via.placeholder.com/50';
const SAVED_JOBS_KEY = '@saved_jobs';

const FILTERS = {
  JOB_TYPE: [
    { id: 'all', label: 'All Types' },
    { id: 'full-time', label: 'Full-time' },
    { id: 'part-time', label: 'Part-time' },
    { id: 'contract', label: 'Contract' },
    { id: 'remote', label: 'Remote' },
  ],
  SORT_BY: [
    { id: 'recent', label: 'Most Recent' },
    { id: 'salary', label: 'Salary' },
    { id: 'company', label: 'Company' },
  ]
};

const SavedJobsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [savedJobs, setSavedJobs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJobType, setSelectedJobType] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [isAdLoading, setIsAdLoading] = useState(false);
  const [adError, setAdError] = useState(null);
  const [currentJobId, setCurrentJobId] = useState(null);
  const interstitialAdRef = useRef(null);
  const adManagerRef = useRef(null);

  // Load saved jobs when screen focuses
  useFocusEffect(
    React.useCallback(() => {
      loadSavedJobs();
    }, [])
  );

  // Load interstitial ad when component mounts
  useEffect(() => {
    console.log('Setting up interstitial ad on saved jobs screen');
    const timer = setTimeout(() => {
      if (interstitialAdRef.current) {
        console.log('Loading interstitial ad in SavedJobsScreen');
        interstitialAdRef.current.loadAd();
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  const loadSavedJobs = async () => {
    try {
      console.log('Loading saved jobs...');
      const savedJobIds = await AsyncStorage.getItem(SAVED_JOBS_KEY);
      console.log('Raw saved jobs data:', savedJobIds);
      
      if (savedJobIds) {
        const jobs = JSON.parse(savedJobIds);
        console.log('Parsed saved jobs:', jobs);
        setSavedJobs(jobs);
      } else {
        console.log('No saved jobs found');
        setSavedJobs([]);
      }
    } catch (error) {
      console.error('Error loading saved jobs:', error);
      setSavedJobs([]);
    }
  };

  const removeSavedJob = async (jobId) => {
    try {
      console.log('Removing job:', jobId);
      const savedJobIds = await AsyncStorage.getItem(SAVED_JOBS_KEY);
      if (savedJobIds) {
        const jobs = JSON.parse(savedJobIds);
        const updatedJobs = jobs.filter(job => job.id !== jobId);
        console.log('Updated jobs after removal:', updatedJobs);
        await AsyncStorage.setItem(SAVED_JOBS_KEY, JSON.stringify(updatedJobs));
        setSavedJobs(updatedJobs);
      }
    } catch (error) {
      console.error('Error removing saved job:', error);
    }
  };

  const filterJobs = (jobs) => {
    return jobs.filter(job => {
      const matchesSearch = !searchQuery || 
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.location.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = selectedJobType === 'all' || 
        job.type?.toLowerCase() === selectedJobType ||
        (selectedJobType === 'remote' && job.location.toLowerCase().includes('remote'));

      return matchesSearch && matchesType;
    });
  };

  const sortJobs = (jobs) => {
    const sortedJobs = [...jobs];
    switch (sortBy) {
      case 'salary':
        return sortedJobs.sort((a, b) => {
          const salaryA = parseInt(a.salary?.replace(/[^0-9]/g, '') || '0');
          const salaryB = parseInt(b.salary?.replace(/[^0-9]/g, '') || '0');
          return salaryB - salaryA;
        });
      case 'company':
        return sortedJobs.sort((a, b) => a.company.localeCompare(b.company));
      case 'recent':
      default:
        return sortedJobs.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
    }
  };

  const renderFilterChip = ({ item, isSelected, onPress }) => (
    <TouchableOpacity
      style={[
        styles.filterChip,
        isSelected && styles.filterChipActive
      ]}
      onPress={() => onPress(item.id)}
    >
      <Text style={[
        styles.filterChipText,
        isSelected && styles.filterChipTextActive
      ]}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  const handleJobPress = async (item) => {
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
        fromScreen: 'SavedJobs'
      });
    } catch (error) {
      console.error('Error showing ad in SavedJobsScreen:', error);
      setAdError(error.message || 'Failed to show ad');
      
      // Still navigate to job details even if ad fails
      navigation.navigate('JobDetails', { 
        jobId: item.id,
        job: item,
        fromScreen: 'SavedJobs'
      });
    } finally {
      setIsAdLoading(false);
      setCurrentJobId(null);
    }
  };

  const renderJobCard = ({ item }) => (
    <JobCard
      job={item}
      onPress={() => handleJobPress(item)}
      onSave={() => removeSavedJob(item.id)}
      showBadge={false}
      isLoading={currentJobId === item.id && isAdLoading}
    />
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="bookmark-outline" size={60} color="#ccc" />
      <Text style={styles.emptyTitle}>No Saved Jobs</Text>
      <Text style={styles.emptySubtitle}>Save jobs you're interested in to view them here</Text>
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
            <Text style={styles.modalTitle}>Filter & Sort</Text>
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
                {FILTERS.JOB_TYPE.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.filterChip,
                      selectedJobType === item.id && styles.filterChipActive
                    ]}
                    onPress={() => setSelectedJobType(item.id)}
                  >
                    <Text style={[
                      styles.filterChipText,
                      selectedJobType === item.id && styles.filterChipTextActive
                    ]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Sort By Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Sort By</Text>
              <View style={styles.filterChips}>
                {FILTERS.SORT_BY.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.filterChip,
                      sortBy === item.id && styles.filterChipActive
                    ]}
                    onPress={() => setSortBy(item.id)}
                  >
                    <Text style={[
                      styles.filterChipText,
                      sortBy === item.id && styles.filterChipTextActive
                    ]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={() => {
                setSelectedJobType('all');
                setSortBy('recent');
              }}
            >
              <Text style={styles.clearButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.applyButton}
              onPress={() => setFilterModalVisible(false)}
            >
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const filteredAndSortedJobs = sortJobs(filterJobs(savedJobs));

  return (
    <View style={[styles.container]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Saved Jobs</Text>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setFilterModalVisible(true)}
        >
          <Ionicons name="options-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search saved jobs..."
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

      <FlatList
        data={filteredAndSortedJobs}
        renderItem={renderJobCard}
        keyExtractor={item => item.id?.toString() || Math.random().toString()}
        ListEmptyComponent={renderEmptyList}
        contentContainerStyle={[styles.listContainer, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      />

      {renderFilterModal()}

      <View style={[styles.adContainer, { paddingBottom: insets.bottom }]}> 
        <AdLoadingManager ref={adManagerRef} />
      </View>
      
      <InterstitialAdComponent
        ref={interstitialAdRef}
        onAdClosed={() => {
          console.log('Interstitial ad closed in SavedJobsScreen');
          // Reload the ad after it's closed
          interstitialAdRef.current?.loadAd();
        }}
        onAdFailedToLoad={(error) => {
          console.log('Interstitial ad failed to load in SavedJobsScreen:', error);
          setAdError('Failed to load ad. Please try again.');
          // Retry loading the ad after a delay
          setTimeout(() => {
            interstitialAdRef.current?.loadAd();
          }, 5000);
        }}
        onAdLoaded={() => {
          console.log('Interstitial ad loaded successfully in SavedJobsScreen');
          setAdError(null);
        }}
      />
      
      {adError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{adError}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  filterButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
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
    color: '#333',
  },
  clearButton: {
    padding: 4,
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  jobCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    width: 50,
    height: 50,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  companyLogo: {
    width: '100%',
    height: '100%',
  },
  jobInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  companyName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  jobMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  jobTags: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#666',
  },
  savedTime: {
    fontSize: 12,
    color: '#999',
    marginLeft: 'auto',
  },
  unsaveButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
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
  adContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    zIndex: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
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
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
});

export default SavedJobsScreen; 