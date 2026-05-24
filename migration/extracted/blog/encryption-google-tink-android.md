---
title: "Cryptography with Google Tink on Android"
slug: encryption-google-tink-android
date: 2024-05
type: blog
---
Securely storing customer information is really critical to an organisation's success. The customers will be storing some really sensitive information such as passwords, financial data etc. Implementing encryption will prevent unauthorised access to the data and also help with compliance and regulations.

Implementing cryptography can be complex though and traditional libraries often require extensive coding knowledge about the mathematics behind cryptographic algorithms.

This is exactly where the use case of Google Tink comes into picture. It is a user-friendly, open-source cryptography library which can be used for android app development along with a couple other languages.

### What is Google Tink

Tink is a multi-language, cross-platform, open source library that provides secure and easy-to-use cryptographic APIs, and was created and is being maintained by cryptographers and security engineers at Google.

### Advantages of using Tink

Tink offers several compelling advantages:

- **Ease of Use:** Tink's intuitive APIs make encryption and decryption very easy to implement, even for developers with limited cryptography experience.
- **Trusted Development:** Google cryptographers designed and maintain Tink, ensuring its security and reliability.
- **Versatility:** Tink supports a wide range of encryption algorithms, including symmetric (AES), asymmetric (RSA), and hybrid (combining both).
- **Security-Focused Design:** Tink prioritizes security best practices, guiding developers towards safer implementations.

### Integrating Tink in Android

Adding Tink to your project is straightforward. Include the dependency in your app-level Gradle file:

```kotlin
implementation("com.google.crypto.tink:tink-android:1.10.0")
```

### Android Keystore

"The Android Keystore system lets you store cryptographic keys in a container to make them more difficult to extract from the device. Once keys are in the keystore, you can use them for cryptographic operations, with the key material remaining non-exportable. Also, the keystore system lets you restrict when and how keys can be used, such as requiring user authentication for key use or restricting keys to use only in certain cryptographic modes." - [developer.android.com](https://developer.android.com/privacy-and-security/keystore)

We can use Android Keystore to manage (create, store and retrieve) the cryptographic keys securely and is actually one of the safest and easiest ways to securely manage the keys.

Let's have a look at some code on how to encrypt and decrypt using Tink. You can have a look at the complete code in the [Github repo](https://github.com/ksharma-xyz/TinkAndroidSample).

```kotlin
import androidx.security.crypto.MasterKeys
import com.google.crypto.tink.integration.android.AndroidKeystoreAesGcm

object TinkCryptoManager {

    // Get / Create Keys using Android Keystore
    private val aesKeystore =
        AndroidKeystoreAesGcm(MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC))

    fun encrypt(plainText: String): ByteArray =
        aesKeystore.encrypt(plainText.toByteArray(), "Data".toByteArray())

    fun decrypt(cipherText: ByteArray): String {
        val plaintTextBytes =
            aesKeystore.decrypt(cipherText, "Data".toByteArray())
        return String(plaintTextBytes)
    }
}
```

### Use Cases for Tink Android

**Encrypting SharedPreferences:**

SharedPreferences are quite commonly used to store small key value data in Android. We can use Tink to implement a secure way to save the app data.

It is also quite interesting to note that the library [EncryptedSharedPreferences](https://developer.android.com/reference/androidx/security/crypto/EncryptedSharedPreferences) uses Google Tink underneath, so we could use it directly in this case.

**Encrypting Files:**

Tink can also be used to encrypt files or large streams of data. [Read more](https://developers.google.com/tink/encrypt-data)

### Watch

<div class="video-embed">
  <iframe
    title="Cryptography with Google Tink on Android"
    src="https://player.vimeo.com/video/949883857?h=2247b92c05"
    referrerpolicy="strict-origin-when-cross-origin"
    allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
    allowfullscreen
    loading="lazy">
  </iframe>
</div>

### References

- [Documentation](https://developers.google.com/tink)
- [GitHub](https://github.com/tink-crypto)
- [Demo App](https://github.com/ksharma-xyz/TinkAndroidSample)
