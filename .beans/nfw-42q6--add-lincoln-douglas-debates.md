---
# nfw-42q6
title: Add Lincoln-Douglas debates
status: completed
type: feature
priority: normal
created_at: 2026-11-04T14:47:03Z
updated_at: 2026-11-04T14:59:19Z
---

Club ballots only model Team Policy: four speakers, partner fill-in, and ranks 1–4. Lincoln-Douglas is the other NCFCA debate style, and club needs to schedule and judge those rounds too.

Sources (NCFCA, season 2026–27, ballot PDF V 2026.01, August 2026):

- Ballot sample: https://ncfca.org/wp-content/uploads/Ballot-Sample_Rubric-_-Lincoln-Douglas-Debate.pdf
- Team Policy ballot (comparison): https://ncfca.org/wp-content/uploads/Ballot-Sample_Rubric-_-Team-Policy-Debate.pdf
- LD overview and rules: https://ncfca.org/compete/debate/lincoln-douglas-value-debate/ and .../rules
- Speaking order: https://ncfca.org/rules/lincoln-douglas-value-speaking-order-and-times/
- Judge prep, including how to choose a winner: https://ncfca.org/judge/debate/judge-prep/
- 2026–27 resolution: Resolved: It is just for a criminal justice system to value retribution over rehabilitation.

## What stays the same

The speaker-point rubric is the same document for both events. A text diff of the two ballot PDFs changes only the title. Each speaker is scored 1–5 (Beginning, Developing, Capable, Proficient, Excellent) in:

- Delivery
- Organization
- Evidence & Support
- Refutation
- Cross Examination
- Conduct

The decision block is also the same: Affirmative or Negative, a reason for decision, a speaker rank, a speaker-point total, and comments. Speaker points do not decide the winner. Existing Team Policy rounds must keep working unchanged. Do not add extra decision fields the NCFCA form does not have.

## How the LD form differs

- One debater on each side. The sample shows two speaker cards, labeled (Affirmative) and (Negative). Team Policy shows four cards.
- No speaker order. Team Policy marks Speaker Order 1 or 2 on each card. LD has a single speaker per side, so there is no 1st/2nd speaker and no partner seat.
- Rank is 1 or 2, among the two speakers. Team Policy ranks 1–4.
- The create-debate form should ask for the event, then one student per side. Do not auto-fill a debate partner on an LD round. Team Policy keeps the current partner fill-in and four seats.
- Cards and ballots should make the event obvious (LD vs Team Policy) so a one-person side is not mistaken for a Team Policy team that is missing a speaker.

Store the event on the debate (`tp` or `ld`). Inferring it from team size is wrong: a Team Policy round can be saved with an empty seat. Existing debates are Team Policy.

## Judge criteria that are not form fields

These belong in the bean so we do not invent ballot questions. They are how a judge decides, not extra inputs.

LD asks who was more persuasive as a value debate: reasoning tied to the values in the round, focus on the resolution, clarity, quality and depth of arguments, support (verbal citation and quotation when a source is used), clash, and proof of their side as a general principle. Do not expect a plan, perfect proof, or an answer to every argument. A debater who is plainly deceitful or rude should not win. New lines of argument raised only in rebuttal are set aside. Set aside personal opinion, name recognition, and experience.

Team Policy instead weighs the affirmative plan (is reform needed, will it work, is it worth the disadvantages, is it on topic), plus reasoning, argument quality, clarity, support, and any alternative approach.

Speaking order (context only; the ballot does not time speeches). Each side has up to 3 minutes of prep, not immediately before cross-examination:

| Speech | Who | Time |
| --- | --- | --- |
| Affirmative Constructive | Affirmative | 6 min |
| Cross-examination | Negative asks | 3 min |
| Negative Constructive | Negative | 7 min |
| Cross-examination | Affirmative asks | 3 min |
| 1st Affirmative Rebuttal | Affirmative | 4 min |
| Negative Rebuttal | Negative | 6 min |
| 2nd Affirmative Rebuttal | Affirmative | 3 min |

## Work

- [x] Add an event field on debates, defaulting existing rounds to Team Policy
- [x] Let the debate form choose LD and collect one student per side, without partner fill-in
- [x] Show an LD ballot with two speaker cards, ranks 1–2, and the same six scores
- [x] Label LD rounds on debate cards and lists
- [x] Keep Team Policy create, ballot, rank, and partner behavior unchanged
- [x] Verify both forms in the browser

## Summary of Changes

Debates store an `event` of `tp` or `ld`. The create form picks the event; LD uses one student per side with no partner fill-in. Ballots for LD show two speaker cards, ranks 1–2, and the same six NCFCA scores. Cards and lists label Lincoln-Douglas vs Team Policy. Existing rounds default to Team Policy. Verified both create and ballot forms against a local PocketBase.
