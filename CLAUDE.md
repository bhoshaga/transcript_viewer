# Claude Code Guidelines

## IMPORTANT: Read Docs and Test Before Coding

**NEVER make code changes before testing APIs first.**

1. Read `FRONTEND_API.md` IN FULL before asking questions - it has test tokens, curl examples, and endpoint docs
2. Test API endpoints with curl BEFORE writing any code
3. Don't ask for tokens or info that's already in the docs

Test token is in `FRONTEND_API.md` at the "Test Token (Development Only)" section.

## Build & Lint

**Always run `npm run build` after making code changes to catch errors before completing a task.**

The build command runs TypeScript compilation and ESLint checks.

## Tech Stack

- React 19 + TypeScript
- Tailwind CSS (dark mode only)
- GraphQL API (`/api/2/graphql`)
- Geist Sans + Geist Mono fonts

## Page Naming

- **Transcript List View** - The main page showing all meetings as cards (`/` route, `selectedMeeting` is null)
- **Transcript View** - The detail page showing a specific meeting's transcript (`/t/:id` route, `selectedMeeting` is set)

Both views are rendered by `src/pages/Transcript.tsx` based on whether a meeting is selected.

## Style Guidelines

- Dark mode only (no light mode support)
- Neutral gray colors (no blue tints)
- Use memoization for performance (`React.memo`, `useCallback`, `useMemo`)
- Geist Sans for UI, Geist Mono for code
