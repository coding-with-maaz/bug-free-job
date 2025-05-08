import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const CompanyLogo = ({ company, logo }) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const getInitialBackgroundColor = (name) => {
    const colors = [
      '#007AFF', // Blue
      '#34C759', // Green
      '#FF9500', // Orange
      '#5856D6', // Purple
      '#FF2D55', // Pink
      '#AF52DE', // Magenta
    ];
    
    const charCode = name.toUpperCase().charCodeAt(0) || 0;
    return colors[charCode % colors.length];
  };

  if (!logo || imageError) {
    const backgroundColor = getInitialBackgroundColor(company);
    return (
      <View style={[styles.logo, styles.logoPlaceholder, { backgroundColor }]}>
        <Text style={styles.logoText}>
          {company?.charAt(0)?.toUpperCase() || '?'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.logoContainer}>
      <Image 
        source={{ uri: logo }} 
        style={styles.logo}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        onError={() => setImageError(true)}
      />
      {isLoading && (
        <View style={[styles.logo, styles.logoLoading]}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
    </View>
  );
};

const JobCard = ({ job, onPress, onSave, showBadge = false, isLoading = false }) => {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(!saved);
    if (onSave) {
      onSave(job);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <TouchableOpacity 
      style={[styles.card, isLoading && styles.cardLoading]}
      onPress={() => onPress?.(job)}
      activeOpacity={0.8}
      disabled={isLoading}
    >
      {showBadge && (
        <View style={styles.todayBadgeContainer}>
          <View style={styles.todayBadge}>
            <Ionicons name="today" size={14} color="#fff" />
            <Text style={styles.todayBadgeText}>Today's Job</Text>
          </View>
        </View>
      )}

      <View style={styles.header}>
        <View style={styles.companyInfo}>
          <CompanyLogo 
            company={job.company || 'Unknown'} 
            logo={job.companyLogo} 
          />
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {job.title || 'Untitled Position'}
            </Text>
            <Text style={styles.company} numberOfLines={1}>
              {job.company || 'Unknown Company'}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleSave}>
          <Ionicons 
            name={saved ? "bookmark" : "bookmark-outline"} 
            size={24} 
            color={saved ? colors.primary : colors.textSecondary} 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.detailText}>
            {job.location || 'Location not specified'}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="cash-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.detailText}>
            {job.salary || 'Salary not specified'}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.detailText}>
            {job.postedAt ? formatDate(job.postedAt) : 'Date not specified'}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.badges}>
          <View style={[styles.tag, { backgroundColor: job.category?.color + '20' || colors.primary + '20' }]}>
            <Text style={[styles.tagText, { color: job.category?.color || colors.primary }]}>
              {job.type || 'Full-time'}
            </Text>
          </View>
          {showBadge && job.isFeatured && (
            <View style={[styles.badge, { backgroundColor: colors.warning + '20' }]}>
              <Ionicons name="star" size={12} color={colors.warning} />
              <Text style={[styles.badgeText, { color: colors.warning }]}>
                Featured
              </Text>
            </View>
          )}
          {showBadge && job.quickApplyEnabled && (
            <View style={[styles.badge, { backgroundColor: colors.success + '20' }]}>
              <Ionicons name="flash" size={12} color={colors.success} />
              <Text style={[styles.badgeText, { color: colors.success }]}>
                Quick Apply
              </Text>
            </View>
          )}
        </View>
      </View>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  companyInfo: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 8,
  },
  logoContainer: {
    position: 'relative',
    width: 40,
    height: 40,
    marginRight: 12,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  logoPlaceholder: {
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  company: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  details: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  detailText: {
    marginLeft: 6,
    fontSize: 13,
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  todayBadgeContainer: {
    position: 'absolute',
    top: -10,
    right: 16,
    zIndex: 10,
  },
  todayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30', // Bright red color to stand out
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  todayBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 4,
  },
  cardLoading: {
    opacity: 0.7,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
  },
});

export default JobCard; 