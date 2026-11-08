// Canonical metadata for every blog post, newest first.
// Used by restyle-posts.mjs and generate-blog.mjs to build each post's page shell
// (title, meta tags, previous/next links). The post body itself lives in
// docs/blog/<slug>/index.html and is hand-edited after generation, so it is never
// regenerated from here.
export const POSTS = [
  {
    slug: 'building-veduta-on-device-ai-agents',
    title: 'How AI agents built Veduta in 82 reviewed steps, and what on-device AI taught me',
    date: '2026-10', read: 19,
    description: 'A team of AI agents built my app in 82 reviewed steps. How they built it, what it cost, and what I learnt putting small AI models inside the app itself.',
    image: '/blog/building-veduta-on-device-ai-agents/images/30-collage.webp',
  },
  {
    slug: 'jetpack-compose-best-practices',
    title: 'Best practices for designing Jetpack Compose APIs',
    date: '2025-08', read: 8,
    description: 'How to keep Compose UI code consistent across teams, so reviews stop circling the same comments about modifiers and state hoisting.',
  },
  {
    slug: 'google-io-extended-2025-compose-multiplatform-to-city',
    title: 'Google I/O Extended 2025 (Brisbane): Compose Multiplatform to the City',
    date: '2025-06', read: 5,
    description: 'How I used Compose Multiplatform to build KRAIL, a Sydney public transport app for Android and iOS. From my talk at Google I/O Extended 2025 in Brisbane.',
    image: '/blog/google-io-extended-2025-compose-multiplatform-to-city/images/img-1.webp',
  },
  {
    slug: 'protobuf-generate-kotlin-code',
    title: 'Sugar, Spice, and Protobuf: cross-platform collaboration',
    date: '2024-07', read: 9,
    description: 'Using Protocol Buffers to keep data structures consistent across iOS, Android, desktop and web, and generating Kotlin code from them.',
    image: '/blog/protobuf-generate-kotlin-code/images/hero.webp',
  },
  {
    slug: 'graphite-improve-dev-velocity-using-git',
    title: 'Ship faster with Graphite: improve dev velocity',
    date: '2024-06', read: 6,
    description: 'Stacked pull requests with Graphite, and how the tool cuts down the repetitive parts of working with git.',
  },
  {
    slug: 'android-adb-shortcuts-for-productivity',
    title: 'Android: adb shortcuts for productivity',
    date: '2024-06', read: 2,
    description: 'Custom adb commands that automate repetitive manual testing on Android: TalkBack, font scale, dark mode, layout bounds and more.',
  },
  {
    slug: 'encryption-google-tink-android',
    title: 'Cryptography with Google Tink on Android',
    date: '2024-05', read: 2,
    description: 'Encrypting sensitive data on Android with Google Tink, without needing to know the mathematics behind the algorithms.',
  },
  {
    slug: 'jetpack-compose-security-disable-screenshots-recordings',
    title: 'Protect data by blocking screenshots in Jetpack Compose',
    date: '2024-04', read: 4,
    description: 'Blocking screenshots and screen recordings in Jetpack Compose for only the screens that need it.',
  },
  {
    slug: 'a11y-weather-app-android',
    title: 'Accessible Weather App in Jetpack Compose',
    date: '2023-02', read: 5,
    description: 'What the iOS Weather app does at large font sizes, and how to build the same accessible behaviour on Android with Jetpack Compose.',
  },
  {
    slug: 'accessibility-list-item-android-jetpack-compose',
    title: 'Accessibility: List Item Design in Jetpack Compose',
    date: '2023-01', read: 5,
    description: 'Building an accessible list item component in Jetpack Compose, with support for right-to-left languages and dark mode.',
  },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const dateLabel = d => { const [y, m] = d.split('-'); return `${MONTHS[Number(m) - 1]} ${y}`; };
