export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  FamilySetup: undefined;
  Main: undefined;
  ChatRoom: { conversationId: string };
  NewChat: undefined;
  MemberDetail: { userId: string };
  Settings: undefined;
  EditProfile: undefined;
  Blocked: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

export type FamilySetupStackParamList = {
  CreateFamily: undefined;
  JoinFamily: undefined;
};

export type TabParamList = {
  Chats: undefined;
  Family: undefined;
  Notifications: undefined;
  Profile: undefined;
};
