---
title: "Ship faster with Graphite - Improve dev velocity"
slug: graphite-improve-dev-velocity-using-git
date: 2024-06
type: blog
---
What is the most precious thing about being a developer? Is it the intelligence or the knowledge? I reckon it's time. Because if you can do more in less time that's a win.

What if I told you there was a tool that can slash through your repetitive tasks and free you to focus on the code that matters.

Example 1: You have to migrate a component from View based to Jetpack Compose. This will need following workflow:

PR 1 - Build the new component in Compose + Deprecate the usages of old component.

PR 2..n - Replace the usages of XXView to XXCompose(). Now this could be n number of PRs depending upon the codebase and you obviously want to handle one usage at a time in order to reduce any risks of introducing errors. If any errors happen you wanna nail the root cause fast and pivot faster. Which is why, it's best to keep separate PRs for each usage migration.

Example 2: You are building an MVVM android app.

PR 1 - Build the data layer

PR 2 - Build the Domain Layer

PR 3 - Build the UI Layer

In this workflow, you can start in any order, however you don't want to wait and do nothing while the Data layer PR is in review. You still wanna go ahead and build that awesome UI your design team has built in Figma coz you're too eager to build it. Bonus: This UI is also new to design system and other teams will also use it in the future, so you are going nuts.

We make 3 branches from main as follows:
`main ----feature1/data----feature1/domain----feature1/UI`

Now what If:

There are so many changes in data layer PR that might actually end up affecting UI layer branch and it needs lot of rework.

Data layer PR review takes so many back and forth decision making that I end up rebasing 3 branches again and again. It is hard to maintain 3 branches in sync.

The main branch has some changes that I need to resolve conflict 3 times.

Now it's very tempting for engineer to think, there are too many issues so let's wait for Data Layer to be final and then start other work. BUT, What If, your awesome colleague told you that there is a place on earth where you go and these issues will look so simple and silly that you'll not even think about it before making 3, 5, or even 10 branches.

## Introducing Graphite

Graphite helps you create smaller pull requests, stay unblocked, and ship faster. Let's look at some advantages of Graphite and then we'll dive into the workflow that I use while creating PRs.

**Effortless Branch management:** When the data layer branch gets merged, we need to rebase the main branch and then perform interactive rebase on the UI layer branch (all the dependant branches). Imagine if this was automated somehow. Graphite does that, we'll see how.

**Frictionless Conflict Resolution:** Let's say data layer branch got merged but with some changes that will introduce conflicting changes in UI layer branch. With graphite, this will never happen, coz all conflicts will need to be resolved as and when you update the data layer branch itself. When the parent branch changes, graphite will automatically attempt re-stacking the child branch. In cases changes are without conflicts, the UI layer branch will automatically be up to date, without us needing to switch the branch and rebase manually. How cool is that?

**Intuitive Navigation:** Can your colleague look at your branches and tell which branch is the parent and which one is the child. git branch command does not tell anything about that. So if you're a CLI nerd like me how can you navigate to the parent branch of x-branch? Or even a little complex action such as go to the root of this stack of branches. Forget complex git commands for switching branches. Graphite offers user-friendly navigation with commands like `gt u` (up), `gt d` (down), and autocomplete for branch selection. No need to memorize which branch depends on which.

**Effortless PR Creation and Updates:** I will push a branch and then go to github to create a PR right? With Graphite, you can create and update PRs right from the CLI. Use `gt ss` (stack submit) to effortlessly submit a new PR or update an existing one. Need to make changes after raising a PR? No sweat! Simply stage your changes with `gt add -A`, commit them with `gt m -c` (modify commit) or `gt m` (modify / amend), and finally resubmit with `gt ss`.

**Maintaining PR Harmony:** Keeping your PR train on track can be a headache. Thankfully, Graphite automates branch dependency checks. Whenever you update a branch, dependent branches are automatically re-stacked, ensuring everything stays in sync.

**Type Less, Do More:** git has painfully long and complex commands sometimes and we often create alias to make them shorter. Graphite lets you define aliases for frequently used commands. This means less typing and more productivity. E.g. we can use `gt ss` instead of the full `gt stack submit`, among others.

## My Workflow

### Install Graphite

```bash
brew install withgraphite/tap/graphite
gt --version
```

### Authenticate with CLI

After installing, authenticate with your GitHub account. See the [Installing & authenticating the CLI](https://graphite.dev/docs/installing-the-cli) guide on Graphite Docs.

### Initialize Graphite for your repository

```bash
gt init
# Would you like to start tracking existing branches to create your first stack? › (y/N)
```

### Checkout a branch

```bash
gt checkout main
# shorthand:
gt co main
```

### Build something cool 🛠️

**Feature Part 1**

```bash
# add all unstaged changes (same syntax as git add)
gt add -A

# single command to commit and create branch
gt create -m "Commit message" branch_name

# automatic branch name
gt create -m "Commit message"

# shorthand alias
gt c -m "Commit message"
```

**Feature Part 2**

```bash
gt add -A

# new branch in town
gt c "Cool Feature Part2"
```

### Where am I (view log)? 📍

```bash
gt log    # view stack of branches
# Aliases:
gt l
gt ll     # log long
gt ls     # log short - the one I use the most.
```

### Upside Down Log (Cake)

```bash
gt l --reverse
```

### How to navigate (switch branches)? 🚗

```bash
gt u      # gt up
gt u 2    # jump 2 levels up

gt d      # gt down

# Not sure which branch to navigate to? Let's choose.
gt co     # gt checkout - shows autocomplete picker
```

```
? Checkout a branch (autocomplete or arrow keys) ›
  pp--06-14-part_3
  pp--06-14-part_2
❯ pp--06-14-part_1
  main
```

```bash
# To the top or down the hill
gt t      # gt branch top
gt b      # gt bottom
```

### Can I make a PR using Graphite?

```bash
gt ss     # gt stack submit - Create / Update PR's

# Make changes then update:
gt add -A  # add all unstaged changes
gt m       # gt modify
gt m -c    # gt modify commit
gt ss      # stack submit - update PR's
```

### Wanna update to latest trunk?

```bash
gt sync   # pull latest main and update stack automatically

# Main already up to date, just restack?
gt r      # gt restack

# Restack only current branch
gt restack
```

### Fold two branches

```bash
gt fold   # combines the current branch into its parent
```

### Can this be two PRs?

```bash
gt sp     # gt split --by-commit
```

### Change Branch Order

```bash
gt move           # select base branch (rebase current onto target, restack descendants)
gt reorder        # manually reorder branch names by typing
gt pop            # delete current branch but retain state of files in working tree
gt rename [name]  # rename a branch
gt trunk          # checkout main / trunk branch
```

### Resolve Conflicts

```bash
gt add -A
gt cont   # gt continue
```

### Not reinventing the wheel

```bash
# Standard git commands still work:
git add
git stash
git diff
git status   # gt status
```

Trust me once you are comfortable with Graphite, it will save a huge amount of time and what's more precious than saving those couple minutes a day just trying to make sure your branch is up to date. Nah! We've got Graphite.dev
