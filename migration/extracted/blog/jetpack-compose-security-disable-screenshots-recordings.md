---
title: "Security: Protect data by blocking screenshots in Jetpack Compose"
slug: jetpack-compose-security-disable-screenshots-recordings
date: 2024-04
type: blog
---
One of the most common ways to improve the security for the android application is to prevent screenshots and disallow the data to be displayed on non secure external displays. It is also very easy to implement. We need to set the following flag to the Activity, and all the content displayed inside the activity will not appear in the screenshots.

An important thing to keep in mind is that , when this flag is applied, it will prevent all screens data from screenshots. It's a good and easy solution if that's the requirement. However, if we want to prevent screenshots for only a few screens in the app, then how do we do it?

Let's look at some code to understand this.

```kotlin
activity.getWindow().setFlags(LayoutParams.FLAG_SECURE, LayoutParams.FLAG_SECURE)
```

## Prevent screenshots for entire app

Whenever the application starts, set the flag LayoutParams.FLAG_SECURE to the activity window. This will ensure, all screens content will not be captured in screenshots / screen recording.

## Prevent screenshots for individual screens only

If we wanna prevent individual screens only, then we can simply set and unset the flag for those screens. We will need to listen to the activity lifecycle. When the secure screen content is started to be displayed, we will set the secure flag so it cannot be captured and when the user navigates away from the screen, we will clear the flag, so other screens can still be available for screenshot or screen recording. Let's look at some code on how to do it.

### Step - 1 Create a Composable Lifecycle listener

We need a way to listen to the lifecycle changes in Compose, and we can do so using [LifecycleOwner](https://developer.android.com/reference/androidx/lifecycle/LifecycleOwner).

- LifecycleOwner is a class through which we can access the android [Lifecycle](https://developer.android.com/reference/androidx/lifecycle/Lifecycle).
- Lifecycle class contains the following methods [removeObserver](https://developer.android.com/reference/androidx/lifecycle/Lifecycle#removeObserver%28androidx.lifecycle.LifecycleObserver%29)(@[NonNull](https://developer.android.com/reference/androidx/annotation/NonNull)[LifecycleObserver](https://developer.android.com/reference/androidx/lifecycle/LifecycleObserver) observer) and addObserver(@[NonNull](https://developer.android.com/reference/androidx/annotation/NonNull)[LifecycleObserver](https://developer.android.com/reference/androidx/lifecycle/LifecycleObserver) observer).
- Via Lifecycle class, we can access the enum Lifecycle.Event. It contains the constant value (eg. ON_CREATE, ON_PAUSE etc.) to represent the event of the LifecycleOwner.
- We can use DisposableEffect because we want to listen to certain events and clean up after we're done. We want to clean up either when the LifecycleOwner changes or when the composable we're using it in leaves composition (navigating away from the screen).

```kotlin
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.LifecycleOwner

@Composable
fun ComposableLifecycleListener(
    lifecycleOwner: LifecycleOwner = LocalLifecycleOwner.current,
    onEvent: (LifecycleOwner, Lifecycle.Event) -> Unit,
) {
    DisposableEffect(key1 = lifecycleOwner) {
        val observer = LifecycleEventObserver { source, event ->
            onEvent(source, event)
        }

        lifecycleOwner.lifecycle.addObserver(observer)

        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }
}
```

### Step - 2 Using ComposableLifecycleListener to set and clear flags

We can use the ComposableLifecycleListener in the Screen level composable to listen to the changes in android lifecycle.

Important Points

- We need a reference to the Activity in order to access the Window, so we can set set / clear the flags on it. How do we get the Activity reference in a Composable function? We are utilizing an approach we saw in the [accompanist](https://github.com/google/accompanist/blob/a9506584939ed9c79890adaaeb58de01ed0bb823/permissions/src/main/java/com/google/accompanist/permissions/PermissionsUtil.kt#L132) library code.
- By setting thge flag in ON_START and clearing the flag in ON_STOP event, we can ensure the user will not be able to take a screenshot. However, we might still leak some sensitive information, if we're capturing a screen recording and navigate away from the secure screen. This happens because the ON_STOP lifecycle event has been fired and we've received the event in the ComposableLifecycleListener, however the actual screen transition has not completed. Therefore, the content may still be visible on insecure displays. In order to tackle this, we can add a slight delay to clear the flag which ensures that the navigation is complete and we're safe to clear the flag.

Let's look at some code on how to do this.

```kotlin
import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.view.WindowManager.LayoutParams.FLAG_SECURE
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.lang.IllegalStateException

@Composable
fun SecureScreen() {
    val context: Context = LocalContext.current
    val activity = context.findActivity()

    SecureScreenContent(modifier = Modifier.fillMaxSize())

    ComposableLifecycleListener { source, event ->
        when (event) {
            Lifecycle.Event.ON_START -> activity.window.setFlags(FLAG_SECURE, FLAG_SECURE)
            Lifecycle.Event.ON_STOP -> {
                source.lifecycleScope.launch {
                    /*
                    Add a small delay to ensure we have navigated away from the secure screen.
                    Otherwise, it will still be visible during screen recording.
                     */
                    delay(200)
                    activity.window.clearFlags(FLAG_SECURE)
                }
            }
            else -> Unit
        }
    }
}

@Composable
private fun SecureScreenContent(modifier: Modifier) {
    Box(
        modifier = modifier.background(color = Color.Red),
        contentAlignment = Alignment.Center
    ) {
        Text(text = "Secure Screen")
    }
}

fun Context.findActivity(): Activity {
    var context = this
    while (context is ContextWrapper) {
        if (context is Activity) return context
        context = context.baseContext
    }
    throw IllegalStateException("Activity not found")
}
```
