---
name: android-foreground-notification
paths: ["**/*.kt", "**/*.java"]
---
# Android Foreground Service Notification Within 5 Seconds

Android enforces a 5-second deadline: after `startForegroundService()` is
called, the service must call `startForeground()` with a notification within
5 seconds or the system kills it. Show a minimal notification FIRST, then
request permissions, then upgrade the notification with rich content.

## Verify

"Is the foreground notification created within 5 seconds of startForeground?
Am I showing a minimal notification first and upgrading later?"

## Patterns

Bad — permission request delays notification past 5s deadline:

```kotlin
override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
  requestNotificationPermission()  // Blocks for user input
  val notification = buildRichNotification()  // After permission
  startForeground(ID, notification)  // Past 5s deadline — crash
}
```

Good — minimal notification first, upgrade after:

```kotlin
override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
  val minimal = buildMinimalNotification()
  startForeground(ID, minimal)  // Within 5s
  requestNotificationPermission()
  val rich = buildRichNotification()
  notificationManager.notify(ID, rich)  // Upgrade
}
```
