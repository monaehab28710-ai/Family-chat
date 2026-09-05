# FamilyConnect - Database schema

The local store (`lib/store.ts`) and the hosted Firestore design share the
same documents. IDs are opaque uids; all timestamps are epoch milliseconds.

## users/{userId}

| field | type | notes |
| --- | --- | --- |
| name | string | 2-40 chars, validated |
| email | string | unique, lowercased lookup key |
| passwordHash | string | salted SHA-256 digest (server: bcrypt/Argon2) |
| salt | string | 16 chars, random per account |
| relationship | enum | Mother, Father, Sister, Brother, Grandmother, Grandfather, Aunt, Uncle, Cousin, Daughter, Son, Partner, Guardian, Other |
| bio | string | max 140 chars |
| avatarColor / avatarEmoji | string | identity styling |
| online / lastSeenAt | bool / number | presence |
| blockedUserIds | string[] | privacy control |
| familyIds | string[] | a user may belong to one private family |
| settings | map | theme, notificationsEnabled, soundEnabled, previewTextEnabled |
| isBot / botPersonaId | bool / string | simulated relatives (demo data only) |

## families/{familyId}

| field | type | notes |
| --- | --- | --- |
| name / emoji / color | string | family identity |
| inviteCode | string(8) | `A-Z2-9`, the ONLY way to join |
| adminUserIds | string[] | admins manage members, codes and settings |
| memberIds | string[] | membership = access to every conversation |
| createdBy / createdAt | string / number | audit |

Security rule: `allow read, write: if request.auth.uid in family.memberIds`.
There is intentionally no query that can enumerate families.

## conversations/{conversationId}

| field | type | notes |
| --- | --- | --- |
| type | 'dm' \| 'group' | |
| familyId | string | every conversation belongs to a family |
| name / emoji / color | string \| null | group metadata |
| memberIds | string[] | subset of family members (or all for the family room) |
| adminIds | string[] | group admins |
| mutedBy | string[] | per-user notification mute |
| isFamilyRoom | bool | the always-on family group |
| lastMessageAt | number | drives chat list ordering |

## messages/{conversationId}/messages/{messageId}

| field | type | notes |
| --- | --- | --- |
| senderId | string | must be in conversation.memberIds |
| kind | 'text' \| 'image' \| 'voice' \| 'system' | |
| text / imageUri | string | content |
| voiceUri / voiceDurationMs / voicePeaks | - | voice note + waveform |
| replyTo | { messageId, senderId, senderName, preview } | quoted reply |
| status | 'sending' \| 'sent' \| 'delivered' \| 'read' | delivery/read receipts |
| systemKind | 'created' \| 'joined' \| 'left' \| 'removed' \| 'code' | group events |
| createdAt | number | shown on every bubble |

## notifications/{notificationId}

userId, kind ('message' | 'family' | 'member' | 'system'), title, body, emoji,
conversationId?, familyId?, createdAt, read. Delivery is suppressed while the
member is looking at that conversation; previews can be hidden by settings.

## reports/{reportId}

reporterId, reportedId, reason, detail, createdAt - private to family admins
and the safety team, never exposed to other members.
