---
title: "graphite improve dev velocity using git"
source: https://www.ksharma.xyz/graphite-improve-dev-velocity-using-git
date: 2024-06
type: blog
---
# 

[

](#h.7xdqal2l0ly6)

Ship faster with Graphite - Improve dev velocity 

What is the most precious thing about being a developer? Is it the intelligence or the knowledge? I reckon it's time. Because if you can do more in less time that's a win.

What if I told you there was a tool that can slash through your repetitive tasks and free you to focus on the code that matters. 

Example 1: You have  to migrate a component from View based to Jetpack Compose. This will need following workflow:

-   PR 1 - Build the new component in Compose + Deprecate the usages of old component.
    
-   PR 2..n - Replace the usages of XXView to XXCompose(). Now this could be n number of PR's depending upon the codebase and you obviously want to handle one usage at a time in order to reduce any risks of introducing errors. If any errors happen you wanna nail the root cause fast and pivot faster. Which is why, it's best to keep separate PR's for each usage migration.
    

Example 2: You are building an MVVM android app.

-   PR 1 - Build the data layer
    
-   PR 2 - Build the Domain Layer
    
-   PR 3 - Build the UI Layer
    

In this workflow, you can start in any order, however you don't want to wait and do nothing while the Data layer PR is in review. You still wanna go ahead and build that awesome UI your design team has built in Figma coz you're too eager to build it. Bonus: This UI is also new to design system and other teams will also use it in the future, so you are going nuts.

We make 3 branches from main as follows:  
main ----feature1/data\----feature1/domain\----feature1/UI

Now what If:

-   There are so many changes in data layer PR that might actually end up affecting UI layer branch and it needs lot of rework.
    
-   Data layer PR review takes so many back and forth decision making that I end up rebasing 3 branches again and again. It is hard to maintain 3 branches in sync.
    
-   The main branch has some changes that I need to resolve conflict 3 times.
    

Now it's very tempting for engineer to think, there are too many issues so let's wait for Data Layer to be final and then start other work. BUT,  What If, your awesome colleague told you that there is a place on earth where you go and these issues will look so simple and silly that you'll no even think about it before making 3, 5, or even 10 branches. 

### 

[

](#h.hwfsxh28sfc)

Introducing [Graphite.dev](https://graphite.dev)

### 

[

](#h.z07yiimjpqk)

Graphite helps you create smaller pull requests, stay unblocked, and ship faster. Let's look at some advantages of Graphite and then we'll dive into the workflow that I use while creating PR's.

-   Effortless Branch management:  When the data layer branch gets merged, we need to rebase the main branch and then perform interactive rebase on the UI layer branch (all the dependant branches). Imagine if this was automated somehow. Graphite does that, we'll see how. 
    
-   Frictionless Conflict Resolution: Let's say data layer branch got merged but with some changes that will introduce conflicting changes in UI layer branch. With graphite, this will never happen, coz all conflicts will need to be resolved as and when you update the data layer branch itself. When the parent branch changes, graphite will automatically attempt re-stacking the child branch.  
    In cases changes are without conflicts, the UI layer branch will automatically be up to date, without us needing to switch the branch and rebase manually.. How cool is that? 
    
-   Intuitive Navigation: Can your colleague look at your branches and tell which branch is the parent and which one is the child. git branch command does not tell anything about that. So if you're a CLI nerd like me how can you navigate to the parent branch of x-branch? Or even a little complex action such as go to the root of this stack of branches. Forget complex git commands for switching branches. Graphite offers user-friendly navigation with commands like gt u (up), gt d (down), and autocomplete for branch selection. No need to memorize which branch depends on which.
    
-   Effortless PR Creation and Updates: I will push a branch and then go to github to create a PR right? With Graphite, you can create and update PRs in right from the CLI. Use gt ss (stack submit) to effortlessly submit a new PR or update an existing one. Need to make changes after raising a PR? No sweat! Simply stage your changes with gt add -A, commit them with gt m -c (modify commit) or gt m (modify / amend), and finally resubmit with gt ss.
    

-   Maintaining PR Harmony: Keeping your PR train on track can be a headache. Thankfully, Graphite automates branch dependency checks. Whenever you update a branch, dependent branches are automatically re-stacked, ensuring everything stays in sync.
    
-   Type Less, Do More: git has painfully long and complex commands sometimes and we often create alias to make them shorter. Graphite lets you define aliases for frequently used commands. This means less typing and more productivity. E.g we can use uses gt ss instead of the full gt stack submit, among others.
    

## 

[

](#h.x5856wxt28qq)

My workflow

### 

[

](#h.nucx6avcsoyd)

Install Graphite from Homebrew ███████▒▒▒ 70%

brew install withgraphite/tap/graphite

gt --version

### 

[

](#h.m8xvvxannly9)

Authenticate with CLI ᕙ(  •̀ ᗜ •́  )ᕗ 

[Installing & authenticating the CLI | Graphite Docs](https://graphite.dev/docs/installing-the-cli#authenticating-the-cli)

### 

[

](#h.i3s36ykx716f)

Initialize Graphite for your repository

gt init

\# Would you like to start tracking existing branches to create your first stack? › (y/N)

### 

[

](#h.l6cc08njjqdm)

Checkout a branch

gt checkout main

OR

gt co main

### 

[

](#h.j5p9trbuqf15)

Build something cool 🛠️

  

Feature Part - 1

\# add all unstaged change (same syntax as git add)

gt add -A

  

\# Single command to Commit and Create Branch

gt create -m "Commit message" branch\_name

  

\# Automatic branch name

gt create -m “Commit message”

  

\# Shorthand Alias

gt c -m "Commit message"

  

Feature Part - 2

\# Build cool feature Part-2

gt add -A

  

\# New Branch in Town

gt c "Cool Feature Part2"

### 

[

](#h.u6etdu2xc86w)

Where am I (view log)?  📍

gt log # view stack of branches

  

\# Alias

gt l

  

gt ll # log long

  

gt ls # log short - the one I use the most.

  

\# Upside Down Log (Cake)

gt l --reverse

### 

[

](#h.xi1r97v5rn29)

How to navigate (switch branches) ? 🚗

gt u # gt up

  

gt u 2 # Let’s Jump ┏(❛̃ ͜ʖ❛̃)┛

  

gt d # gt down

  

\# Not sure, which branch to navigate to? Let’s choose.   👈 / 👉

gt co # gt checkout

  

? Checkout a branch (autocomplete or arrow keys) ›

pp--06-14-part\_3

pp--06-14-part\_2

❯   pp--06-14-part\_1

main

  

\# To the top or down the hill  🚁 🪂

gt t # gt branch top

gt b # gt bottom

### 

[

](#h.l2ohc2r480nv)

Can I make a PR using Graphite ? (▀ ̿ĺ̯ ▀̿ ̿)

gt ss # gt stack submit - Create / Update PR's

  

\# Comments on PR ? Let’s make an update.

\# Make the changes

gt add -A # Add all unstaged changes

  

gt m # gt  modify

  

gt m -c # gt modify commit

  

gt ss # stack submit - Update PR's

### 

[

](#h.vgmayar3qtql)

Wanna update to latest trunk?

gt sync # gt sync. Pull latest master and update stack automatically.

\# It’s magic. ✧ 

  

\# Master already up to date, Just restack ?

gt r # gt restack

  

\# Restack only current branch

gt restack # - restacks only the current branch onto its parent

### 

[

](#h.l38ttp73yzyf)

Fold two branches. ¯\\\_(ツ)\_/¯

gt fold - (combines) the current branch into its parent

### 

[

](#h.9dxbjgz9h2zl)

Can this be two PRs? (◑\_◑)

gt sp # gt split --by-commit 

### 

[

](#h.nbv9e96jc3vc)

[Change Branch Order](https://graphite.dev/docs/edit-branch-order)

gt move  # Select the base branch

Rebase the current branch onto the target branch and restack all of its descendants

  

gt redorder # Manually reorder branch names by typing

  

gt pop # Delete the current branch but retain the state of files in the working tree

gt rename \[name\] # Rename a branch

gt trunk # Checkout main / trunk branch

  

### 

[

](#h.bor5hzj5fyn4)

Resolve Conflicts

gt add -A

gt cont # gt continue

### 

[

](#h.tqm2j04z305u)

Not reinventing the wheel 𖥞

git add

git stash

git diff

git status # gt status

  
  

\# Thank You ツ

  

Trust me once you are comfortable with Graphite, it will save a huge amount of time and what's more precious than saving those couple minutes a day just trying to make sure your branch is up to date. Nah! We've got [Graphite.dev](https://graphite.dev)

  
  
  

Page updated

Google Sites

Report abuse
