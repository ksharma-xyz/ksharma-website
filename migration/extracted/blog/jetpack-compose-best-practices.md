---
title: "Best practices for designing Jetpack Compose APIs"
source: https://www.ksharma.xyz/jetpack-compose-best-practices
date: 2025-08
type: blog
---
Best practices for designing Jetpack Compose APIs

When building UIs with Jetpack Compose (or Compose Multiplatform), especially in apps where all of the UI is now written in Compose, one of the biggest challenges I’ve seen is how inconsistent things can get across teams.

Here are two examples from my past experience:

-   PR reviews get stuck on the same comments over and over. I’ve been in reviews where half the discussion is just about the order of modifiers, or whether a parameter should be hoisted or not. These things matter, but it slows everyone down when the same points have to be raised repeatedly.  
      
    
-   Every engineer has a different idea of how to build a Compose component. Once I saw two engineers build a card/tile component in completely different ways. One passed all the state down, the other used CompositionLocal to read the state. Both worked, but it felt like two different approaches living in the same codebase. Both approaches had their own scalability and maintainability issues, we’ll cover it below.
    

Problems like these aren’t just technical, they’re also about the team and the time and effort put into building software. More time ends up being spent debating code style than shipping features. Alignment across large teams is also critical but harder to achieve, which is why onboarding new engineers can either be super painful or super smooth depending on whether patterns are clearly set. Having guidelines enforced in the codebase means engineers know at the time of writing what’s acceptable, and more importantly, why.

That’s what led me to write this post. These are the 5 most common mistakes I’ve seen people make (the ones I’ve caught in reviews many times), along with how to fix them. I’ll also show how to automate some of these checks with lint rules, so we don’t have to rely on manual review comments for every PR.

I’ve been building design systems in Compose for the past 4 years now. While my approach isn’t perfect, these are some of the learnings that have worked well for me and my teams. 

### 

[

](#h.uc0rehjhyfvt)

1\. Correct usage and order of Modifier

The first thing that comes to mind is Modifier and its correct usage.

Modifiers let us customize the appearance, behavior, and layout of UI elements. For example, we can change size, padding, background color, or add scrolling capability to a composable. Modifiers are immutable, so if we chain multiple modifiers, a new instance is created each time. The order of chaining is important here because it affects the final output.

### 

[

](#h.7msx33ezjybn)

Here are some of the other guidelines that should be followed when using Modifiers.

-   Always take modifier: Modifier = Modifier as the first optional parameter.
    

-   Apply the modifier to the root layout of your composable.
    

-   Don’t reuse the same modifier for multiple composables. (unless you want to introduce bugs! 😉)
    
-   Chain modifiers in a logical order (e.g., padding → background → clickable), otherwise ripple effects may be incorrect or you may wonder, where did the padding go.
    

Read more here: [modifier-paramater](https://github.com/androidx/androidx/blob/androidx-main/compose/docs/compose-component-api-guidelines.md#modifier-parameter) 

### 

[

](#h.dg1st7mvvwmt)

a.) Order of Modifiers is important

### 

[

](#h.hzdj335t4tba)

b.) Always take Modifier as the first optional parameter.

### 

[

](#h.77itzvuazt3n)

c.) Apply the modifier to the root layout of your composable.

### 

[

](#h.rkz2rb7bjn0h)

2\. Stable and Immutable Parameters

  

Compose has 3 phases before it’s rendered on your favourite Pixel / Samsung.  
  
1\. Composition: Compose runs composable functions and outputs a tree structure consisting of layout nodes that represents the UI.

2\. Layout: This phase is about measurement and placement for each node in the layout tree.

3\. Drawing: This phase will draw into a Canvas on the screen.

Compose uses a smart recomposition system that skips recomposition when inputs haven’t changed. If your parameters are mutable or unstable, it forces unnecessary recompositions which can result in poor performance of the app.  
  
It is therefore important to understand the @Stable and @Immutable annotations properly and their usage. To learn in deeper detail about stability and immutability, I would highly recommend reading this [post](https://chrisbanes.me/posts/composable-metrics/) from Chris Banes.

Immutable  
An object is considered Immutable if all of its properties and fields can't be changed after it's created. If you need to update it, a new instance with the new information must be created. Compose can easily detect a change by checking if the new object is different from the old one.  
  
E.g. Theming related classes such as Typography or Colors, therefore these are perfect examples for being marked as Immutable. You can create them once and then use a new instance if the theme is changed rather than changing the original one.

Stable  
  
A class is considered stable when its properties may change over time, but Compose can still reliably track those changes. Marking it with @Stable tells Compose: this object might mutate, but I’ll notify you correctly when it does.  
Here, IntroState is marked as @Stable because title and items can change, but Compose will still know when to recompose.  
  

@Stable

data class IntroState(

    val title: String,

    val items: List<String>

)

Tip: If you use immutable types (like ImmutableList from kotlinx.collections.immutable), then you don’t need @Stable annotation since Compose already knows they’re safe.  
  
General Guidelines

-   Prefer immutable types like ImmutableList, ImmutableSet, or val data classes over mutable ones and avoid passing mutable types like MutableList into composables
    
-   Annotate classes with @Stable or @Immutable when it makes sense. A lot of this is handled by [strong skipping mode](https://developer.android.com/develop/ui/compose/performance/stability/strongskipping) in compose if you’re using Kotlin version 2.0.20 or higher, but still it’s nicer to keep following these practices.
    

  

// ❌ Don't do this

// Do not use mutable list

@Composable

fun MyComponent(data: MutableList<String>) { 

    //...

}

  

// ✅ Do this

// use immutable list to avoid unnecessary recompositions.

@Composable

fun MyComponent(data: ImmutableList<String>) { 

    //...

}

Here are some more resources to deep dive into stability in compose:

-   [Stability in Compose](https://developer.android.com/develop/ui/compose/performance/stability)
    
-   [Performance Best Practices - I/O Talk](https://www.youtube.com/watch?v=EOQB8PTLkpY)
    
-   [Compose Phases](https://developer.android.com/develop/ui/compose/phases)
    

### 

[

](#h.iawf95ibryku)

3\. Prefer slot APIs for flexibility and customisation

A common mistake is overloading your composables with too many parameters. Instead, provide slots that let callers inject their own composables. Example: If you build a Button that only supports a label, later when the design team asks for an optional icon, you’ll have to change the API and break existing usages.  
  
See the approach 1 below in code example. This approach is rigid. It also raises questions like: should the icon be a drawable, or a design system icon type? What if we need something else? With slots, we don’t have to anticipate every future requirement up front.

### 

[

](#h.ntpxk3ykgt8y)

4\. State Hoisting for Reusability

State hoisting in Jetpack Compose is a design pattern where the state of a composable is moved to its caller (parent). You should keep the state closest to where it is consumed. State hoisting allows the caller to manage state, making your components more reusable and testable.  
  
Code Exmaple:  
In this approach 1, the switch owns its own state, so we can’t control it externally.  
  
In the approach 2, the parent manages state, and the component stays reusable. If an external event or a ui other than MySwitch wants to toggle it, now it is possible too.

### 

[

](#h.ikjfjaqpabf2)

5\. Use Composition Locals Sparingly

I think, using Composition Locals in Compose, is like adding spices to a dish. You need just the right amount otherwise it’s ruined.

We should use Composition locals for truly global values such as colors and typography. The things that probably won't change throughout the app session. However, we should avoid overusing them. Even though Composition Locals help us pass data down the tree without having to go through every composable child, they hide dependencies, affect testability, and make debugging harder. This can sometimes make us wonder why the composables are behaving in a way that isn't clear from just looking at the code.

### 

[

](#h.tvw0euc62xjd)

Automating Best Practices with Lint Rules

Catching these issues in code review works, but it’s repetitive and slows down development. A better approach is to automate them with lint rules. These rules were originally built by engineers at Twitter, and are now maintained in this repository [Compose Rules](https://mrmans0n.github.io/compose-rules/) by Nacho Lopez.

They work with Compose Multiplatform or Android projects, and can be added as a Detekt plugin. For example:

detekt-compose = { group = "io.nlopez.compose.rules", name = "detekt", version = ”0.4.27" }

Once enabled, they’ll flag things like:

-   Wrong Modifier usage or order
    
-   Mutable parameters in composables
    
-   Missing state hoisting
    
-   Overuse of CompositionLocal
    
-   Poor slot API design
    

Here’s an example of usage in my project KRAIL: [KRAIL App - PR #813](https://github.com/ksharma-xyz/KRAIL/pull/813/files) This way, engineers don’t have to manually catch these in every PR. The checks run automatically and give instant feedback during development.

### 

[

](#h.u7ao83huirb3)

Bonus Tip:

Do not declare variables inside the composable functions. This leads to redecoration of variables every time the layout recomposes. This may lead to performance issues and must be strictly avoided. 

By following these guidelines, I hope your Compose APIs will feel more scalable. You can read in detail about compose api guidelines in the doc from androidx repository: [Compose Component API Guidelines](https://github.com/androidx/androidx/blob/androidx-main/compose/docs/compose-component-api-guidelines.md)

Page updated

Google Sites

Report abuse
