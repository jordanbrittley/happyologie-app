# Editing Happyologie's content

Everything the app says lives in plain JSON files in `data/`. You can edit any
of these directly on GitHub (click the file, click the pencil icon) or in any
text editor — no code, no build step. Save, commit, and the next time someone
opens the app they'll see the change (the service worker refreshes content
in the background on each visit).

All copy — new or edited — should still pass the happyologie-voice proof
test before it ships.

## `data/permission-cards.json`

The permission card deck. A `cards` array of plain strings, one card per line.

```json
{
  "cards": [
    "It's okay to turn it in good instead of perfect.",
    "You're allowed to rest before everything is finished."
  ]
}
```

To add a card: add a new string to the array. Don't forget the comma on the
line above it. To remove one, delete its line. Order doesn't matter for the
in-deck experience, but the **daily card** on the Today screen is picked by
day-of-year position in this array (`array[dayOfYear % array.length]`), so
reordering will shuffle which card shows on which date going forward. That's
fine — it's not a promise to any one user, just worth knowing.

## `data/stress-cards.json`

The stress reset deck. Each card has a `front` (the spiral thought) and a
`back` (the reframe or tiny action). `intro` is the one-time explainer shown
before someone's first stress card, and the same disclaimer text used in
Settings — keep it warm, never clinical, never use the words "cognitive
distortion" anywhere a user sees them.

```json
{
  "intro": "These aren't therapy, and your brain deserves real support when things get heavy...",
  "cards": [
    { "front": "\"I'm so behind.\"", "back": "Behind compared to what? Name one real deadline. Make a plan for that one, not the imaginary ones." }
  ]
}
```

## `data/daily-prompts.json`

The daily journal prompts. A `prompts` array of plain strings, same
day-of-year rotation logic as the permission cards (90 prompts = one per day,
about three months before repeating).

## `data/joy-lines.json`

**This is the one Jordan wants to edit.** The rotating one-line affirmations
that show up in the toast when someone saves a card or keeps a journal entry
("noted, beautiful brain," "that one's a keeper," etc.) — the "big joy"
moment. A `lines` array of short strings. They rotate in order, not
randomly, so the sequence you write them in is the sequence users will see
them in over repeat visits.

```json
{
  "lines": [
    "noted, beautiful brain",
    "good one"
  ]
}
```

Add a new line anywhere in the array. Keep them short (they're a toast pill,
not a sentence) and in the same register as the rest of the affirmations —
warm, a little wry, never a compliment that sounds like it's grading them.

## Things that are NOT in these JSON files (and shouldn't be edited without Jordan's say-so)

- Brand colors, fonts, and the joy-moment sparkle/heart symbols and colors —
  these live in `css/app.css` and `js/app.js` as design tokens, not content.
- The non-therapy disclaimer wording in Settings (`index.html`,
  `#screen-settings .disclaimer`) — this is a safety-reviewed line, not
  ordinary copy. Changes should go through the same review the original did.
- Card/prompt counts and targets, deck names, screen labels — these are
  structural, not content-bank copy.

## A note on format

Every file must stay valid JSON: double quotes only (no smart quotes, no
single quotes), commas between array items but never after the last one, and
any literal `"` inside a string escaped as `\"` (see the stress-cards example
above, where the front text itself uses quotation marks). If the app shows
"Something didn't load right" after an edit, the JSON is almost always the
culprit — paste the file into a JSON validator (e.g. jsonlint.com) to find
the typo before committing.
