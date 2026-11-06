---
# nfw-86sw
title: Share repeated Tailwind styles as components
status: completed
type: task
priority: normal
created_at: 2026-10-24T19:16:29Z
updated_at: 2026-11-06T11:40:27Z
---

The same Tailwind class strings are copied across ballot screens and club pages. Extract the repeated ones into components so buttons, cards, empty states, errors, and page heroes stay consistent.

- [x] Add Button, Card, EmptyState, and FieldError for the ballot UI
- [x] Add PageHero and the shared hero call-to-action for club pages
- [x] Replace the duplicated class strings with those components
- [x] Verify build and types

## Summary of Changes

Repeated Tailwind strings now live in shared components. Ballot UI uses Button, Card, EmptyState, FieldError, StatusNote, Muted, Heading, ChoiceButton, SideLabel, CenteredPanel, and UndoNotice. Club pages use PageHero and HeroLink.

`npm run check` and `npm run build` pass in the worktree. Clicked through home, about, schedule, lessons, a lesson, the missing-lesson page, join, and the ballots sign-in and sign-up forms, including a failed sign-in that shows the shared error.

## Rebase

Replayed onto current main. Kept the later ballot and lessons behavior, and put the shared components back on the screens that still used the duplicated styles. `npm run check` passes after the replay.

## Rebase onto speaker seats

Rebased onto main after the speaker-seat layout landed. Debate view keeps SpeakerSeatCard and still uses the shared heading, muted text, and side label. Public screenshots of home, about, schedule, join, lessons sign-in, and a failed sign-in match main pixel for pixel. `npm run check` passes.
