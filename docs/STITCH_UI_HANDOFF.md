# GuitarFlow Stitch UI handoff

## Project

- Project: `GuitarFlow — Adaptive Guitar Workspace`
- Stitch project ID: `STITCH_PROJECT_ID`
- Stitch URL: <https://stitch.withgoogle.com/projects/STITCH_PROJECT_ID>
- Design system: `Warm Songbook`
- Design system asset: `assets/STITCH_ASSET_ID`

The project deliberately reimagines the current UI instead of preserving its layout. It follows the product direction in `docs/notes/gpt_ui_notes.md`: the lead sheet is the primary surface, chord diagrams are contextual, and complexity is separated into Read, Practice, and Learn modes.

## Generated screens

| Screen | Device | Stitch screen ID |
| --- | --- | --- |
| Song library and repertoire workspace | Desktop | `STITCH_SCREEN_ID` |
| Read workspace for 沿著光走 | Desktop | `STITCH_SCREEN_ID` |
| Read workspace with Am7 bottom sheet | Mobile | `STITCH_SCREEN_ID` |
| Practice workspace for 沿著光走 | Desktop | `STITCH_SCREEN_ID` |
| Chord Lab and voicing comparison | Desktop | `STITCH_SCREEN_ID` |

Full resource names use this format:

```text
projects/STITCH_PROJECT_ID/screens/{screen-id}
```

## Visual direction

- Warm paper canvas: `#F7F5EF`
- Surface: `#FFFFFF`
- Ink: `#171A18`
- Muted ink: `#6E716B`
- Hairline: `#DEDCD4`
- Chord and primary action: `#4D5BD2`
- Practice state: `#2B6C59`
- Attention: `#D88736`
- Headings: Space Grotesk
- Lyrics and Traditional Chinese body: Noto Sans
- Chords and musical values: JetBrains Mono
- Primary radius: 12px

## UX decisions to preserve during implementation

1. Lead sheets use chords above lyrics and do not show six-line tablature in Read mode.
2. Desktop uses a contextual right inspector; mobile uses a draggable bottom sheet.
3. Transpose and capo remain separate concepts and controls.
4. Read stays visually quiet; Practice introduces playback, metronome, auto-scroll, count-in, and A–B looping.
5. Chord Lab supports curated and generated voicings, filtering, comparison, and repertoire references.
6. Navigation and touch controls remain usable at arm's length, with 44px minimum primary targets on mobile.
7. Avoid generic dashboard cards, stock photography, gradients, glass effects, and rainbow chord colors.

## Suggested implementation order

1. Shared application shell and design tokens
2. Desktop and mobile Read workspace
3. Contextual chord inspector and mobile bottom sheet
4. Practice toolbar and transport
5. Song library
6. Chord Lab comparison workspace
7. Learn mode and remaining responsive states
