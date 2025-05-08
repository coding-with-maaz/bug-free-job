import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert, Linking, TextInput, Modal, Animated, ActivityIndicator, Platform, Dimensions, BackHandler, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useDispatch, useSelector } from 'react-redux';
import { fetchJobById, fetchJobBySlug } from '../store/slices/jobSlice';
import { createApplication } from '../store/slices/applicationSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AdBanner from '../components/AdBanner';
import InterstitialAdComponent from '../components/InterstitialAd';

// Update these with your actual configuration
const BACKEND_IP = Platform.select({
  ios: 'localhost',
  android: '10.0.2.2', // For Android emulator
  default: '192.168.1.3' // For physical device
});

const API_URL = `http://${BACKEND_IP}:5000/api`;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
const ALLOWED_FILE_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const SAVED_JOBS_KEY = '@saved_jobs';

const JobDetailsScreen = ({ route, navigation }) => {
  const { jobId, slug, fromScreen } = route.params || {};
  const dispatch = useDispatch();
  const { selectedJob, loading, error } = useSelector((state) => state.jobs);
  const { currentJob: jobFromStore, loading: jobLoading, error: jobError } = useSelector((state) => state.jobs);
  const jobRaw = jobFromStore || selectedJob;
  const job = jobRaw && jobRaw.data ? jobRaw.data : jobRaw;
  const { loading: applicationLoading } = useSelector((state) => state.applications);

  const insets = useSafeAreaInsets();
  const [isSaved, setIsSaved] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    experience: '',
    coverLetter: '',
    resume: null
  });
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isAdExpanded, setIsAdExpanded] = useState(false);
  const [isAdLoading, setIsAdLoading] = useState(false);
  const [adError, setAdError] = useState(null);
  const interstitialAdRef = useRef(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const uploadAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const submitButtonScale = useRef(new Animated.Value(1)).current;
  const submitButtonColor = useRef(new Animated.Value(0)).current;

  // Track ad loading state
  const [isAdReady, setIsAdReady] = useState(false);

  // Handle back button press
  useEffect(() => {
    const backAction = () => {
      navigation.goBack();
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [navigation]);

  // Fetch job by ID or slug
  useEffect(() => {
    console.log('Job Details Screen - Job ID:', jobId, 'Slug:', slug, 'Type:', typeof jobId);
    console.log('Navigation source:', fromScreen);
    
    if (!jobId && !slug) {
      console.error('No job ID or slug provided');
      Alert.alert(
        'Error',
        'No job ID or slug provided. Please try again.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      return;
    }
    
    const loadJob = async () => {
      try {
        let result;
        if (slug) {
          console.log('Fetching job with slug:', slug);
          result = await dispatch(fetchJobBySlug(slug)).unwrap();
        } else {
          console.log('Fetching job with ID:', jobId);
          result = await dispatch(fetchJobById(String(jobId))).unwrap();
        }
        console.log('Job fetch result:', result);
        if (!result) {
          throw new Error('No job data received');
        }
      } catch (error) {
        console.error('Error fetching job details:', error);
        Alert.alert(
          'Error',
          `Failed to load job details: ${error.message || 'Unknown error'}. Please check your connection and try again.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    };
    loadJob();
  }, [dispatch, jobId, slug, navigation]);

  useEffect(() => {
    console.log('Unwrapped job object:', job);
  }, [job]);

  // Sync isSaved state with AsyncStorage
  useEffect(() => {
    const checkSaved = async () => {
      if (!jobId) return;
      try {
        const savedJobIds = await AsyncStorage.getItem(SAVED_JOBS_KEY);
        const currentSavedJobs = savedJobIds ? JSON.parse(savedJobIds) : [];
        setIsSaved(currentSavedJobs.some(savedJob => savedJob.id === jobId));
      } catch (error) {
        setIsSaved(false);
      }
    };
    checkSaved();
  }, [jobId]);

  // Load interstitial ad when component mounts
  useEffect(() => {
    console.log('Setting up interstitial ad on component mount');
    // We'll set a short delay to ensure component is fully mounted
    const timer = setTimeout(() => {
      if (interstitialAdRef.current) {
        console.log('Loading interstitial ad');
        interstitialAdRef.current.loadAd();
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  // Show interstitial ad if navigating from SavedJobs screen
  useEffect(() => {
    if (!fromScreen) return;
    
    console.log('Navigation source:', fromScreen);
    
    const showAdIfNeeded = async () => {
      if (fromScreen === 'SavedJobs' && interstitialAdRef.current && isAdReady) {
        try {
          console.log('Showing interstitial ad from SavedJobs navigation');
          setIsAdLoading(true);
          await interstitialAdRef.current.showAd();
        } catch (error) {
          console.error('Error showing interstitial ad:', error);
        }
      } else if (fromScreen === 'SavedJobs') {
        console.log('Ad not ready yet, setting up retry');
        // If ad is not ready yet but we should show it, set up a retry
        const retryTimer = setTimeout(() => {
          if (interstitialAdRef.current && isAdReady) {
            console.log('Retrying to show interstitial ad');
            interstitialAdRef.current.showAd();
          } else {
            console.log('Ad still not ready after retry');
          }
        }, 2000);
        
        return () => clearTimeout(retryTimer);
      }
    };
    
    // Give a slight delay to ensure the ad is loaded
    const adTimer = setTimeout(() => {
      showAdIfNeeded();
    }, 1000);
    
    return () => clearTimeout(adTimer);
  }, [fromScreen, isAdReady]);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^\+?[\d\s-]{10,}$/;
    return phoneRegex.test(phone);
  };

  const validateFileType = (mimeType) => {
    return ALLOWED_FILE_TYPES.includes(mimeType);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!formData.experience.trim()) {
      newErrors.experience = 'Experience is required';
    } else if (isNaN(formData.experience) || Number(formData.experience) < 0) {
      newErrors.experience = 'Please enter a valid number of years';
    }

    if (!formData.coverLetter.trim()) {
      newErrors.coverLetter = 'Cover letter is required';
    } else if (formData.coverLetter.length < 100) {
      newErrors.coverLetter = 'Cover letter should be at least 100 characters';
    }

    if (!formData.resume) {
      newErrors.resume = 'Resume is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveJob = async () => {
    try {
      const savedJobIds = await AsyncStorage.getItem(SAVED_JOBS_KEY);
      const currentSavedJobs = savedJobIds ? JSON.parse(savedJobIds) : [];
      let newSavedJobs;
      if (currentSavedJobs.some(savedJob => savedJob.id === jobId)) {
        // Remove job from saved jobs
        newSavedJobs = currentSavedJobs.filter(savedJob => savedJob.id !== jobId);
        setIsSaved(false);
        Alert.alert(
          'Job Removed',
          'Job has been removed from your saved jobs.'
        );
      } else {
        // Add job to saved jobs with current timestamp
        if (job) {
          newSavedJobs = [...currentSavedJobs, {
            ...job,
            savedAt: new Date().toISOString()
          }];
          setIsSaved(true);
          Alert.alert(
            'Job Saved',
            'Job has been saved to your bookmarks.'
          );
        } else {
          return;
        }
      }
      await AsyncStorage.setItem(SAVED_JOBS_KEY, JSON.stringify(newSavedJobs));
    } catch (error) {
      Alert.alert('Error', 'Failed to update saved jobs. Please try again.');
    }
  };

  const handleApply = () => {
    if (!job) return;

    // Directly show the application form without interstitial ad
    setShowForm(true);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleCloseForm = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 0.8,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowForm(false);
    });
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handleResumeUpload = async () => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setUploadError(null);

      console.log('Starting document picker...');
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      console.log('Document picker result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        console.log('Selected file:', file);

        // Check file type
        const fileType = file.mimeType;
        console.log('File type:', fileType);
        
        if (!validateFileType(fileType)) {
          setUploadError(`Invalid file type. Please select a PDF or Word document. Received: ${fileType}`);
          setIsUploading(false);
          return;
        }

        // Check file size
        console.log('File size:', file.size);
        if (file.size > MAX_FILE_SIZE) {
          setUploadError(`File size should be less than 5MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
          setIsUploading(false);
          return;
        }

        // Update form data with the resume file
        const newResumeData = {
          uri: file.uri,
          name: file.name,
          type: fileType,
          size: file.size,
        };
        
        console.log('Setting resume data:', newResumeData);
        setFormData(prev => ({
          ...prev,
          resume: newResumeData
        }));

        // Clear any previous resume errors
        if (errors.resume) {
          setErrors(prev => ({
            ...prev,
            resume: null
          }));
        }

        // Show success animation
        Animated.sequence([
          Animated.timing(successAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(bounceAnim, {
            toValue: 1.2,
            friction: 3,
            useNativeDriver: true,
          }),
          Animated.spring(bounceAnim, {
            toValue: 1,
            friction: 3,
            useNativeDriver: true,
          }),
          Animated.timing(successAnim, {
            toValue: 0,
            duration: 300,
            delay: 1000,
            useNativeDriver: true,
          }),
        ]).start();
      } else if (result.canceled) {
        console.log('Document picker was cancelled');
        setUploadError('File selection was cancelled');
      } else {
        console.log('No file selected');
        setUploadError('No file was selected. Please try again.');
      }
    } catch (err) {
      console.error('Error in handleResumeUpload:', err);
      setUploadError('Failed to upload resume. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRetryUpload = () => {
    setRetryCount(prev => prev + 1);
    setUploadError(null);
    handleResumeUpload();
  };

  const handlePreviewResume = () => {
    if (formData.resume) {
      setShowPreview(true);
    }
  };

  const handleSubmit = async () => {
    console.log('Starting form submission...');
    
    if (!validateForm()) {
      console.log('Form validation failed:', errors);
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      // Show success animation immediately
      setSubmitSuccess(true);
      Animated.parallel([
        Animated.timing(submitButtonColor, {
          toValue: 1,
          duration: 500,
          useNativeDriver: false,
        }),
        Animated.sequence([
          Animated.spring(submitButtonScale, {
            toValue: 1.1,
            friction: 3,
            useNativeDriver: true,
          }),
          Animated.spring(submitButtonScale, {
            toValue: 1,
            friction: 3,
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      // Show success message
      Alert.alert(
        'Success!',
        'Your application has been submitted successfully.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form and close modal
              setShowForm(false);
              setFormData({
                fullName: '',
                email: '',
                phone: '',
                experience: '',
                coverLetter: '',
                resume: null
              });
              // Reset submit button state after delay
              setTimeout(() => {
                setSubmitSuccess(false);
                submitButtonColor.setValue(0);
              }, 2000);
            }
          }
        ]
      );

    } catch (error) {
      console.error('Submission error:', error);
      Alert.alert(
        'Error',
        'Failed to submit application. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const renderSubmitButton = () => {
    const buttonColor = submitButtonColor.interpolate({
      inputRange: [0, 1],
      outputRange: ['#007AFF', '#4CAF50']
    });

    return (
      <TouchableOpacity 
        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting || submitSuccess}
      >
        <Animated.View 
          style={[
            styles.submitButtonContent,
            {
              transform: [{ scale: submitButtonScale }],
              backgroundColor: buttonColor
            }
          ]}
        >
          {isSubmitting ? (
            <View style={styles.submittingContainer}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.submittingText}>Submitting...</Text>
            </View>
          ) : submitSuccess ? (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.successText}>Submitted Successfully!</Text>
            </View>
          ) : (
            <Text style={styles.submitButtonText}>Submit Application</Text>
          )}
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const renderApplicationForm = () => (
    <Modal
      visible={showForm}
      transparent
      animationType="none"
      onRequestClose={handleCloseForm}
    >
      <View style={styles.modalOverlay}>
        <Animated.View 
          style={[
            styles.modalContent,
            {
              opacity: fadeAnim,
              transform: [
                { 
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [300, 0],
                  })
                },
                { scale: scaleAnim }
              ]
            }
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Apply for {job?.title || 'Untitled Job'}</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={handleCloseForm}
            >
              <Ionicons name="close-circle" size={28} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.formContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={[styles.input, errors.fullName && styles.inputError]}
                value={formData.fullName}
                onChangeText={(value) => handleInputChange('fullName', value)}
                placeholder="Enter your full name"
                placeholderTextColor="#999"
              />
              {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
                placeholder="Enter your email"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number *</Text>
              <TextInput
                style={[styles.input, errors.phone && styles.inputError]}
                value={formData.phone}
                onChangeText={(value) => handleInputChange('phone', value)}
                placeholder="Enter your phone number"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
              />
              {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Years of Experience *</Text>
              <TextInput
                style={[styles.input, errors.experience && styles.inputError]}
                value={formData.experience}
                onChangeText={(value) => handleInputChange('experience', value)}
                placeholder="Enter years of experience"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
              {errors.experience && <Text style={styles.errorText}>{errors.experience}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Cover Letter *</Text>
              <TextInput
                style={[styles.input, styles.textArea, errors.coverLetter && styles.inputError]}
                value={formData.coverLetter}
                onChangeText={(value) => handleInputChange('coverLetter', value)}
                placeholder="Write your cover letter here..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
              {errors.coverLetter && <Text style={styles.errorText}>{errors.coverLetter}</Text>}
            </View>

            {renderUploadSection()}

            {renderSubmitButton()}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );

  const renderResumePreview = () => (
    <Modal
      visible={showPreview}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowPreview(false)}
    >
      <View style={styles.previewContainer}>
        <View style={styles.previewHeader}>
          <Text style={styles.previewTitle}>Resume Preview</Text>
          <TouchableOpacity onPress={() => setShowPreview(false)}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>
        <View style={styles.previewContent}>
          <View style={styles.documentPreview}>
            <Ionicons 
              name={formData.resume?.mimeType === 'application/pdf' ? "document-text" : "document"} 
              size={64} 
              color="#007AFF" 
            />
            <Text style={styles.previewFileName}>{formData.resume?.name}</Text>
            <Text style={styles.previewFileSize}>
              {(formData.resume?.size / 1024 / 1024).toFixed(2)} MB
            </Text>
            <TouchableOpacity 
              style={styles.previewButton}
              onPress={() => {
                // Open document with system viewer
                Linking.openURL(formData.resume.uri).catch((err) => {
                  Alert.alert(
                    'Error',
                    'Unable to open the document. Please make sure you have an appropriate app installed to view this file type.'
                  );
                });
              }}
            >
              <Text style={styles.previewButtonText}>Open Document</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderUploadSection = () => (
    <View style={styles.uploadSection}>
      <TouchableOpacity 
        style={[styles.uploadButton, errors.resume && styles.uploadButtonError]} 
        onPress={handleResumeUpload}
        disabled={isUploading || isSubmitting}
      >
        <Ionicons 
          name={formData.resume ? "checkmark-circle" : "cloud-upload-outline"} 
          size={24} 
          color={formData.resume ? "#4CAF50" : "#007AFF"} 
        />
        <Text style={[styles.uploadText, formData.resume && styles.uploadTextSuccess]}>
          {formData.resume ? formData.resume.name : 'Upload Resume (PDF/DOC)'}
        </Text>
      </TouchableOpacity>

      {(isUploading || isSubmitting) && (
        <View style={styles.uploadProgressContainer}>
          <View style={styles.uploadProgressBar}>
            <View 
              style={[
                styles.uploadProgressFill,
                {
                  width: `${uploadProgress}%`
                }
              ]}
            />
          </View>
          <Text style={styles.uploadProgressText}>{uploadProgress}%</Text>
        </View>
      )}

      {uploadError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{uploadError}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={handleRetryUpload}
          >
            <Ionicons name="refresh" size={16} color="#007AFF" />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {formData.resume && (
        <TouchableOpacity 
          style={styles.previewLink}
          onPress={handlePreviewResume}
        >
          <Ionicons name="eye-outline" size={16} color="#007AFF" />
          <Text style={styles.previewLinkText}>Preview Resume</Text>
        </TouchableOpacity>
      )}

      {errors.resume && <Text style={styles.errorText}>{errors.resume}</Text>}
    </View>
  );

  const renderApplyButton = () => {
    return (
      <TouchableOpacity 
        style={styles.applyButton} 
        onPress={handleApply}
      >
        <Text style={styles.applyButtonText}>Apply Now</Text>
      </TouchableOpacity>
    );
  };

  if (jobLoading || loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading job details...</Text>
      </View>
    );
  }

  if (!job) {
    console.log('No job data available:', { job, selectedJob, jobFromStore });
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Job not found</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            if (slug) dispatch(fetchJobBySlug(slug));
            else dispatch(fetchJobById(String(jobId)));
          }}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Parse requirements and tags if they're strings
  const parsedRequirements = typeof job.requirements === 'string' 
    ? JSON.parse(job.requirements) 
    : job.requirements || [];

  const parsedTags = typeof job.tags === 'string'
    ? JSON.parse(job.tags)
    : job.tags || [];

  // Map backend fields to frontend
  const {
    title = '',
    company = '',
    location = '',
    type = '',
    salary = '',
    description = '',
    category = {},
    postedAt,
    companyLogo = job.companyLogo || job.company_logo || '',
  } = job;

  return (
    <View style={[styles.container]}>
      <StatusBar barStyle="dark-content" />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 180 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Job Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.jobTitle}>{title}</Text>
          <Text style={styles.companyName}>{company}</Text>
          
          <View style={styles.jobMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={16} color="#666" />
              <Text style={styles.metaText}>{location}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text style={styles.metaText}>{type}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="cash-outline" size={16} color="#666" />
              <Text style={styles.metaText}>{salary}</Text>
            </View>
          </View>
        </View>

        {/* Company Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Company</Text>
          <View style={styles.companyInfo}>
            <View style={styles.companyLogo}>
              {companyLogo ? (
                <Image source={{ uri: companyLogo }} style={{ width: 72, height: 72, borderRadius: 36 }} />
              ) : (
                <Text style={styles.companyInitial}>{company ? company.charAt(0).toUpperCase() : '?'}</Text>
              )}
            </View>
            <View style={styles.companyDetails}>
              <Text style={styles.companyName}>{company || 'Unknown Company'}</Text>
              <Text style={styles.companyLocation}>{location || 'Location not specified'}</Text>
              <Text style={styles.companyType}>{category?.name || 'Technology Company'}</Text>
            </View>
          </View>
        </View>

        {/* Description Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{description || 'No description available'}</Text>
        </View>

        {/* Requirements Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Requirements</Text>
          {parsedRequirements.map((requirement, index) => (
            <View key={index} style={styles.requirementItem}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#007AFF" />
              <Text style={styles.requirementText}>{requirement}</Text>
            </View>
          ))}
        </View>

        {/* Tags Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tags</Text>
          <View style={styles.tagsContainer}>
            {parsedTags.map((tag, index) => (
              <View key={index} style={[styles.tag, { backgroundColor: category?.color || '#007AFF' }]}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Last Date to Apply Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Application Timeline</Text>
          <View style={styles.timelineContainer}>
            <View style={styles.timelineItem}>
              <View style={styles.timelineIconContainer}>
                <Ionicons name="calendar" size={24} color="#007AFF" />
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>Posted Date</Text>
                <Text style={styles.timelineDate}>
                  {postedAt ? new Date(postedAt).toLocaleDateString() : 'Not specified'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Section */}
      <View style={styles.stickyBottom}>
        <View style={styles.adContainer}>
          <AdBanner />
        </View>
      <View style={styles.applyButtonContainer}>
          {renderApplyButton()}
      </View>
      </View>

      <InterstitialAdComponent
        ref={interstitialAdRef}
        onAdClosed={() => {
          console.log('Interstitial ad closed');
          setIsAdLoading(false);
          // Reload the ad after it's closed
          interstitialAdRef.current?.loadAd();
        }}
        onAdFailedToLoad={(error) => {
          console.log('Interstitial ad failed to load:', error);
          setAdError('Failed to load ad. Please try again.');
          setIsAdLoading(false);
          // Retry loading the ad after a delay
          setTimeout(() => {
            interstitialAdRef.current?.loadAd();
          }, 5000);
        }}
        onAdLoaded={() => {
          console.log('Interstitial ad loaded successfully');
          setAdError(null);
          setIsAdReady(true);
          
          // If we're coming from SavedJobs and ad is now ready, show it immediately
          if (fromScreen === 'SavedJobs' && !isAdLoading) {
            console.log('Ad ready now, showing immediately');
            interstitialAdRef.current?.showAd();
          }
        }}
      />

      {adError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{adError}</Text>
        </View>
      )}

      {renderApplicationForm()}
      {renderResumePreview()}
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
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  backButton: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
  },
  saveButton: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  titleSection: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  jobTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  companyName: {
    fontSize: 18,
    color: '#495057',
    marginBottom: 20,
    fontWeight: '600',
  },
  jobMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  metaText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#495057',
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 15,
    color: '#495057',
    lineHeight: 24,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  requirementText: {
    marginLeft: 12,
    fontSize: 15,
    color: '#495057',
    flex: 1,
    lineHeight: 24,
  },
  postedDate: {
    fontSize: 14,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  applyButtonContainer: {
    padding: 16,
    backgroundColor: '#fff',
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 16,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
    marginLeft: 8,
  },
  companyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  companyLogo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  companyInitial: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  companyDetails: {
    flex: 1,
  },
  companyLocation: {
    fontSize: 15,
    color: '#495057',
    marginTop: 6,
  },
  companyType: {
    fontSize: 15,
    color: '#495057',
    marginTop: 6,
  },
  benefitsGrid: {
    marginTop: 8,
  },
  benefitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  benefitItem: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    flexDirection: 'row',
    alignItems: 'center',
  },
  benefitText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#495057',
    fontWeight: '500',
    flex: 1,
  },
  timelineContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineDivider: {
    height: 1,
    backgroundColor: '#e9ecef',
    marginVertical: 16,
  },
  timelineIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '600',
  },
  lastDate: {
    color: '#dc3545',
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
    height: '90%',
    paddingBottom: 34,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  closeButton: {
    padding: 4,
  },
  formContainer: {
    padding: 20,
    backgroundColor: '#fff',
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    color: '#495057',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#1a1a1a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputError: {
    borderColor: '#dc3545',
    backgroundColor: '#fff5f5',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 13,
    marginTop: 8,
    fontWeight: '500',
  },
  textArea: {
    height: 120,
    paddingTop: 16,
    textAlignVertical: 'top',
  },
  uploadSection: {
    marginBottom: 24,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  uploadButtonError: {
    borderColor: '#dc3545',
    backgroundColor: '#fff5f5',
  },
  uploadText: {
    color: '#007AFF',
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  uploadTextSuccess: {
    color: '#28a745',
  },
  uploadProgressContainer: {
    marginTop: 16,
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  uploadProgressBar: {
    height: 6,
    backgroundColor: '#e9ecef',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  uploadProgressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  uploadProgressText: {
    fontSize: 13,
    color: '#6c757d',
    textAlign: 'center',
    fontWeight: '500',
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
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  retryText: {
    color: '#007AFF',
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
  },
  previewLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  previewLinkText: {
    color: '#007AFF',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 50,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  previewTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  previewContent: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  documentPreview: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  previewFileName: {
    fontSize: 20,
    color: '#1a1a1a',
    marginTop: 24,
    marginBottom: 8,
    fontWeight: '600',
    textAlign: 'center',
  },
  previewFileSize: {
    fontSize: 15,
    color: '#6c757d',
    marginBottom: 32,
    fontWeight: '500',
  },
  previewButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  previewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  submittingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submittingText: {
    color: '#fff',
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#007AFF',
  },
  tagText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  stickyBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 2,
  },
  adContainer: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 8,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
});

export default JobDetailsScreen; 