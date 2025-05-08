import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AdBanner from '../components/AdBanner';

// Import screens
import {
  HomeScreen,
  JobDetailsScreen,
  JobsScreen,
  SavedJobsScreen,
  CategoriesScreen,
  CategoryResultsScreen,
  SearchResultsScreen,
  TodayJobsScreen
} from '../screens';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Main Stack
const MainStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen 
      name="MainTabs" 
      component={MainTabs} 
    />
    <Stack.Screen 
      name="JobDetails" 
      component={JobDetailsScreen}
      options={{
        headerShown: true,
        headerTitle: 'Job Details',
      }}
    />
    <Stack.Screen 
      name="CategoryResults" 
      component={CategoryResultsScreen}
      options={({ route }) => ({ 
        title: route.params?.category?.name || 'Category Jobs'
      })}
    />
    <Stack.Screen 
      name="SearchResults" 
      component={SearchResultsScreen}
      options={({ route }) => ({ 
        title: `Results for "${route.params?.query}"`
      })}
    />
  </Stack.Navigator>
);

// Main Tabs
const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;

        if (route.name === 'Home') {
          iconName = focused ? 'home' : 'home-outline';
        } else if (route.name === 'Jobs') {
          iconName = focused ? 'briefcase' : 'briefcase-outline';
        } else if (route.name === 'Categories') {
          iconName = focused ? 'grid' : 'grid-outline';
        } else if (route.name === 'Saved') {
          iconName = focused ? 'bookmark' : 'bookmark-outline';
        } else if (route.name === 'Today') {
          iconName = focused ? 'today' : 'today-outline';
        }

        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#007AFF',
      tabBarInactiveTintColor: 'gray',
    })}
  >
    <Tab.Screen 
      name="Home" 
      component={HomeScreen}
      options={{ headerShown: false }}
    />
    <Tab.Screen 
      name="Jobs" 
      component={JobsScreen}
      options={{ title: 'All Jobs' }}
    />
    <Tab.Screen 
      name="Categories" 
      component={CategoriesScreen}
      options={{ headerShown: false }}
    />
    <Tab.Screen 
      name="Saved" 
      component={SavedJobsScreen}
      options={{
        headerShown: true,
        headerTitle: 'Saved Jobs',
      }}
    />
    <Tab.Screen 
      name="Today" 
      component={TodayJobsScreen}
      options={{ title: 'Today Jobs' }}
    />
  </Tab.Navigator>
);

// Root Navigator
const AppNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Main" component={MainStack} />
    </Stack.Navigator>
  );
};

export default AppNavigator; 