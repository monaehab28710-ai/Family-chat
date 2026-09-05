import React, { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AppProvider, useApp } from './lib/bootstrap';
import { ThemeProvider, useTheme } from './lib/theme';
import { ToastProvider } from './lib/toast';
import { RootNavigator } from './navigation/RootNavigator';
import { startAmbientEngine } from './lib/bots';

/** Keeps the family simulation running while a member is signed in. */
function AmbientController() {
  const { user } = useApp();
  useEffect(() => {
    if (!user) return;
    return startAmbientEngine();
  }, [user]);
  return null;
}

function AppShell() {
  const theme = useTheme();
  const { user } = useApp();

  const navTheme = useMemo(
    () => ({
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        background: theme.bg,
        card: theme.bg,
        text: theme.text,
        primary: theme.primary,
        border: theme.border,
        notification: theme.primary,
      },
    }),
    [theme]
  );

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={theme.name === 'dark' ? 'light' : 'dark'} />
      <RootNavigator />
      <AmbientController key={user?.id ?? 'guest'} />
    </NavigationContainer>
  );
}

function BootView() {
  return (
    <LinearGradient colors={['#FF8A5B', '#FF6B4A']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
      <View
        style={{
          width: 92,
          height: 92,
          borderRadius: 30,
          backgroundColor: 'rgba(255,255,255,0.22)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 44 }}>🏠</Text>
      </View>
      <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '900', letterSpacing: 0.3 }}>FamilyConnect</Text>
    </LinearGradient>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
    ...MaterialCommunityIcons.font,
  });

  if (!fontsLoaded) return <BootView />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <ThemedProviders>
            <AppShell />
          </ThemedProviders>
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function ThemedProviders({ children }: { children: React.ReactNode }) {
  const { themePreference, setThemePreference } = useApp();
  return (
    <ThemeProvider preference={themePreference} setPreference={setThemePreference}>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}
