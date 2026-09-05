import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useApp } from '../lib/bootstrap';
import { SplashScreen } from '../screens/SplashScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { CreateFamilyScreen } from '../screens/CreateFamilyScreen';
import { JoinFamilyScreen } from '../screens/JoinFamilyScreen';
import { ChatRoomScreen } from '../screens/ChatRoomScreen';
import { NewChatScreen } from '../screens/NewChatScreen';
import { MemberDetailScreen } from '../screens/MemberDetailScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { BlockedScreen } from '../screens/BlockedScreen';
import { MainTabs } from './MainTabs';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * One stack for the whole app. The `key` remounts the navigator whenever the
 * auth or family state changes, so navigation state can never leak across
 * accounts - a member is never left holding another member's stack.
 */
export function RootNavigator() {
  const { user } = useApp();
  const hasFamily = Boolean(user && user.familyIds.length > 0);
  const sessionKey = user ? (hasFamily ? `family:${user.id}` : `setup:${user.id}`) : 'guest';

  return (
    <Stack.Navigator
      key={sessionKey}
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="Auth" component={AuthNavigator} options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="FamilySetup" component={FamilySetupNavigator} options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="Main" component={MainTabs} options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
      <Stack.Screen name="NewChat" component={NewChatScreen} />
      <Stack.Screen name="MemberDetail" component={MemberDetailScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Blocked" component={BlockedScreen} />
    </Stack.Navigator>
  );
}

const AuthStack = createNativeStackNavigator<AuthStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
    </AuthStack.Navigator>
  );
}

const SetupStack = createNativeStackNavigator<FamilySetupStackParamList>();

function FamilySetupNavigator() {
  return (
    <SetupStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <SetupStack.Screen name="CreateFamily" component={CreateFamilyScreen} />
      <SetupStack.Screen name="JoinFamily" component={JoinFamilyScreen} />
    </SetupStack.Navigator>
  );
}
