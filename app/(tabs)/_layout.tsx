import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../lib/constants';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: 'rgba(255,255,255,0.92)',
          borderTopWidth: 0,
          height: 72,
          paddingBottom: 12,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.04,
          shadowRadius: 16,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '700',
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          marginTop: 2,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="⊞" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: 'Log',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="+" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="↗" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: 'Coach',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="✦" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="◉" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return (
    <View style={[tabIconStyles.container, focused && tabIconStyles.containerActive]}>
      <Text style={[tabIconStyles.icon, focused && tabIconStyles.iconActive]}>{icon}</Text>
    </View>
  );
}

const tabIconStyles = StyleSheet.create({
  container: {
    width: 36,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  containerActive: {
    backgroundColor: COLORS.primaryContainer + '40',
  },
  icon: {
    fontSize: 16,
    color: '#94a3b8',
  },
  iconActive: {
    color: COLORS.primary,
  },
});
