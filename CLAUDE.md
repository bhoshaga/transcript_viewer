# Claude Code Guidelines

## Build & Lint

**Always run `npm run build` after making code changes to catch errors before completing a task.**

The build command runs TypeScript compilation and ESLint checks.

## Tech Stack

- React 19 + TypeScript
- Tailwind CSS (dark mode only)
- GraphQL API (`/api/2/graphql`)
- Geist Sans + Geist Mono fonts

## Style Guidelines

- Dark mode only (no light mode support)
- Neutral gray colors (no blue tints)
- Use memoization for performance (`React.memo`, `useCallback`, `useMemo`)
- Geist Sans for UI, Geist Mono for code
