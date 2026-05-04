---
name: build-minimal-test-host-apps
paths: ["**/*.{ts,tsx,kt,swift,gradle,xml}", "**/Podfile", "**/*.xcconfig"]
---

# Build Minimal Native Test Host Apps Instead of Relying on Consumer Apps

Build minimal native test host apps (Android Activity + iOS SwiftUI) that consume your brownfield SDK from local artifacts. Don't rely on consumer apps for integration testing.

Consumer apps have their own dependency trees, build configs, and complexity. A minimal test host isolates your SDK's integration surface. If it works in the test host, any consumer failure is their configuration, not your SDK.

## Verify

"Can I verify my SDK integration without a consumer app? Does a minimal test host exercise the same code path?"

## Patterns

Bad — relying on consumer app for integration testing:

```text
# No test host — wait for consumer team to report integration failures
# Consumer app fails → is it your SDK or their config?
# Round-trip time: hours to days per iteration
```

Good — minimal test host apps that consume the SDK directly:

```text
test-hosts/
  android/
    app/build.gradle.kts  # depends on mavenLocal() AAR
    MainActivity.kt       # one button per surface
  ios/
    project.yml           # XcodeGen spec
    TestHost/
      ContentView.swift   # one button per surface
```

Good — test host exercises the real integration surface:

```kotlin
// MainActivity.kt — minimal consumer
class MainActivity : AppCompatActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContentView(R.layout.activity_main)
    findViewById<Button>(R.id.launch_surface).setOnClickListener {
      ReactNativeBrownfield.startSurface("CheckoutSurface", this)
    }
  }
}
```

TwinMind brownfield SDK — built test host apps to verify v0.3.1 AAR/XCFramework integration without waiting for the consumer team.
