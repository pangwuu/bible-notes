# DISPATCH — Explorer 2 (Milestone 3: YouVersion-Style Passage Picker)

## 2026-09-23T04:51:43Z

### Mission
You are Explorer 2 for Milestone 3 (R3: Swedish Method Note Editor & Domain Utilities).
Investigate and design `src/components/PassagePicker.tsx`:
1. UI Flow:
   - YouVersion-style 3-step drill-down: Book -> Chapter -> Verse Range (Start Verse, End Verse).
   - OT (39 books) and NT (27 books) segmentation tabs or clean divider sections.
   - Quick reset, confirmation button, and dismiss/close.
2. Styling & Design Token Conformance:
   - Strict adherence to `DESIGN.md`: base `#1A1816`, surface `#242019`, surfaceRaised `#2E2921`, text `#EDE7DD`, hairline border `#332E27`, Swedish accents, control radius 8px, modal sheet radius 16px.
   - NO banned colors (`#000000`, `#0B0B0B`, `#111111`, `#D97757`), NO ALL-CAPS tracked labels, NO generic drop shadows.
3. Component Props & Interface:
   - Initial reference input (`book`, `startChapter`, `startVerse`, `endChapter`, `endVerse`).
   - Callback `onSelect(passage: { book: string, startChapter: number, startVerse: number, endChapter: number, endVerse: number, startOrdinal: number, endOrdinal: number }): void`.
   - Visibility / modal state control.

### Input Files
- `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/ORIGINAL_REQUEST.md` (authoritative user request)
- `/Users/johnnywu/Desktop/My-small-projects/bible_notes/DESIGN.md`
- `/Users/johnnywu/Desktop/My-small-projects/bible_notes/specs.md`
- `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/orchestrator_1/PROJECT.md`

### Deliverables
- Detailed report at `.agents/explorer_m3_2/report.md`
- Hard handoff at `.agents/explorer_m3_2/handoff.md` with complete proposed component code.
- Send a completion message to the parent orchestrator (conversation ID: 0a72a93f-be19-49c0-81f1-95f8e8f40226).
