import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, Image } from 'react-native';

import DashboardScreen from './src/screens/DashboardScreen';
import AccountingScreen from './src/screens/AccountingScreen';
import KegiatanScreen from './src/screens/KegiatanScreen';
import ScanHamaScreen from './src/screens/ScanHamaScreen';
import EdukasiScreen from './src/screens/EdukasiScreen';
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
            } else if (route.name === 'Scan Hama') {
              iconName = 'camera-outline';
            } else if (route.name === 'Accounting') {
              iconName = 'cash-outline';
            } else if (route.name === 'Kegiatan') {
              iconName = 'calendar-outline';
            } else if (route.name === 'Edukasi') {
              iconName = 'book-outline';
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
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image 
                source={require('./assets/pantau.png')} 
                style={{ width: 26, height: 26, marginRight: 8 }} 
                resizeMode="contain"
              />
              <Text style={{ fontWeight: 'bold', fontSize: 18, color: colors.text }}>
                {route.name}
              </Text>
            </View>
          ),
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Scan Hama" component={ScanHamaScreen} />
        <Tab.Screen name="Accounting" component={AccountingScreen} />
        <Tab.Screen name="Kegiatan" component={KegiatanScreen} />
        <Tab.Screen name="Edukasi" component={EdukasiScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
