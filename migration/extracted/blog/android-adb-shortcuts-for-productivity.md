---
title: "Android: adb shortcuts for productivity"
slug: android-adb-shortcuts-for-productivity
date: 2024-06
type: blog
---
As an engineer, I share the enthusiasm for automating repetitive tasks. Manual testing of Android apps during development can be tedious, especially when it involves running the same sequence of steps repeatedly. This is where the power of [ADB](https://developer.android.com/tools/adb) (Android Debug Bridge) and scripting comes in. By creating custom commands, we can automate these workflows, saving valuable time and boosting development velocity.

Development velocity is a crucial metric for any organization. Automating tasks not only expedites the development process but also frees up developers to focus on more creative and challenging areas of the project. Beyond efficiency gains, these tools inject a bit of fun into the development cycle, replacing monotonous tasks with streamlined automation.

Let's delve deeper into the specific functionalities we can automate using ADB and scripting to transform your Android app development workflow. Gist - [Android - adb commands with alias](https://gist.github.com/ksharma-xyz/50ca32b4781affaf15e52128719e44c9)

```kotlin
## Read Blog - https://www.ksharma.xyz/android-adb-shortcuts-for-productivity

## A11y - Talkback
alias TalkbackOn="adb shell settings put secure enabled_accessibility_services com.google.android.marvin.talkback/com.google.android.marvin.talkback.TalkBackService"

alias TalkbackOff="adb shell settings put secure enabled_accessibility_services com.android.talkback/com.google.android.marvin.talkback.TalkBackService"

## A11y - FontSize
alias LargeFontSize="adb shell settings put system font_scale 2.0" # Largest font size for android devices
alias MediumFontSize="adb shell settings put system font_scale 1.5"
alias DefaultFontSize="adb shell settings put system font_scale 1.0"

## Derk / Light Mode
alias Sunset="adb shell \"cmd uimode night yes\"" # Dark mode
alias Sunrise="adb shell \"cmd uimode night no\"" # Light mode

#@ A11y - Magnification
alias MagnifyScale="adb shell settings put secure accessibility_display_magnification_scale 5.0"
alias Magnify="adb shell settings put secure accessibility_display_magnification_enabled 1"
alias MagnifyDisable="adb shell settings put secure accessibility_display_magnification_enabled 0"

## Show Touch
alias ShowTouch="adb shell settings put system show_touches 1"
alias HideTouch="adb shell settings put system show_touches 0"

## Show Pointer Location
alias ShowPointer="adb shell settings put system pointer_location 1"
alias HidePointer="adb shell settings put system pointer_location 0"

## Layout Bounds
alias LayoutBoundsEnable="adb shell setprop debug.layout true && adb shell service call activity 1599295570"
alias LayoutBoundsDisable="adb shell setprop debug.layout false && adb shell service call activity 1599295570"
```
