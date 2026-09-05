# FamilyConnect - Architecture

FamilyConnect is a private, invite-only messenger for families. The client is
React Native + Expo (TypeScript) and every screen talks to a single service
layer (`lib/api.ts`) that mirrors the production backend contract.

## Layers

```
screens/           UI only - reads snapshots, calls services
components/         reusable design-system pieces (Avatar, Card, MessageBubble...)
lib/api.ts          service layer: auth, families, conversations, members
lib/store.ts        local database: immutable snapshots + persistence + pub/sub
lib/bots.ts         realtime simulation (typing, replies, presence, read receipts)
lib/notify.ts       in-app notification centre + OS push bridge
lib/notifications.ts expo-notifications (FCM/APNs payload path)
lib/session.ts      secure session tokens + salted password hashing
lib/seed.ts         demo family, personas and conversation history
```

## Realtime contract

The store publishes immutable snapshots; components subscribe with
`useSyncExternalStore`, so a mutation re-renders exactly the screens that
depend on it. Typing indicators live in a separate lightweight channel
(`lib/typing.ts`) so high-frequency pings never re-render chat lists.

Message lifecycle (identical to the socket protocol in production):

1. client writes `status: sending`
2. server ack -> `sent`
3. recipients' devices ack -> `delivered`
4. recipient opens the conversation -> `read`

## Production mapping

For a hosted deployment replace `lib/store.ts` + `lib/api.ts` internals with:

- **Auth**: Firebase Auth / Auth0 (email + password), session token in Keychain.
- **Data**: Firestore collections `users`, `families`, `conversations`,
  `messages`, `notifications` guarded by security rules that require
  `familyId in request.auth.uid` membership (see SCHEMA.md).
- **Realtime**: Firestore snapshot listeners or a socket gateway for messages,
  presence and typing.
- **Push**: FCM/APNs data messages delivered only to `memberIds` of a
  conversation; the payload shape is the same as `AppNotificationRecord`.

## Security model

- Passwords: random 16-byte salt per account + SHA-256 digest (swap for
  bcrypt/Argon2 server-side). Never stored or logged in plain text.
- Sessions: token kept in expo-secure-store (Keychain/Keystore); web falls
  back to AsyncStorage because Keychain is unavailable in browsers.
- Access control: every service call re-checks conversation/family membership
  before a read or write (`assertConversationAccess`, `assertFamilyAdmin`).
- Discovery: families are never listable or searchable - membership is
  granted only by an exact 8-character invitation code issued by an admin.
- Input validation: name/email/password/bio/code validators plus
  `sanitizeText()` on every user-supplied string before render.
- Safety: block + report flows, per-conversation muting, message previews can
  be hidden in notification banners.
