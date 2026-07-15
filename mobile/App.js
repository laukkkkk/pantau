import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import DashboardScreen from './src/screens/DashboardScreen';
import MonitoringScreen from './src/screens/MonitoringScreen';
import AccountingScreen from './src/screens/AccountingScreen';
import GisScreen from './src/screens/GisScreen';
import { colors } from './src/theme/colors';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size }) => {
            let iconName;

            if (route.name === 'Dashboard') {
              iconName = 'grid-outline';
            } else if (route.name === 'Monitoring') {
              iconName = 'leaf-outline';
            } else if (route.name === 'Accounting') {
              iconName = 'cash-outline';
            } else if (route.name === 'GIS') {
              iconName = 'map-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: 5,
            paddingTop: 5,
            height: 60,
          },
          headerStyle: {
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
            elevation: 1,
            shadowOpacity: 0.1,
          },
          headerTitleStyle: {
            fontWeight: 'bold',
            color: colors.text,
          },
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Monitoring" component={MonitoringScreen} />
        <Tab.Screen name="Accounting" component={AccountingScreen} />
        <Tab.Screen name="GIS" component={GisScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
