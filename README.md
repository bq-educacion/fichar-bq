This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Variables

For new users, the default manager is configured through:

```bash
DEFAULT_MANAGER_EMAIL=alberto.valero@bqeducacion.cc
```

If not provided, the app falls back to `alberto.valero@bqeducacion.cc`.

You can start editing the page by modifying `pages/index.tsx`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/api-routes/introduction) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.ts`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/api-routes/introduction) instead of React pages.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Testing

Run unit tests with:

```bash
pnpm test
```

Tests are located in `src/__tests__/` and cover all utility functions in `src/lib/utils.ts`:

- `computeElapsedHours` — pair-based elapsed time calculation (core function)
- `getHoursToday` — today's worked hours, optionally including current open session
- `statsFromLogs` — computes total, average, days, and manual days count from a log set
- `numberOfManualDays` — counts distinct days with manually introduced logs
- `numberOfDays` — counts distinct days in a log set
- `realLogs` — truncates logs after the last `out` event
- `decimalToHours` — formats decimal hours as `Xh Ym`
- `datetoHHMM` — formats a Date as `H:MM`
- `logsIn` / `logsOut` — backward-compatible helpers

## Key Utility Functions (`src/lib/utils.ts`)

### `computeElapsedHours(logs, addCurrentTime?, now?)`

The core elapsed time function. Pairs each `in` log with the next `out`/`pause` log and sums the durations. If `addCurrentTime` is true and the last log is `in`, it counts time up to `now`.

### `statsFromLogs(logs)`

Computes `{ total, average, logsDays, manualLogsDays }` for a set of logs. Uses `realLogs` to strip incomplete trailing sessions and `computeElapsedHours` for the time calculation.

### `getHoursToday(logs, now?)`

Wrapper around `computeElapsedHours` for today's logs. Automatically detects if the user is currently clocked in (last log is `in`) and adds current time accordingly.

## Manual Log Entry

The application no longer uses error logs (`LOG_TYPE.error` and `USER_STATUS.error` have been removed). Instead, when a user clicks "Corregir fichaje", a modal opens allowing the user to manually enter:

- **Start hour** — when the work day started
- **Pauses** — zero or more pause periods (start/end time each)
- **End hour** — when the work day ended

On submit, all existing logs for the day are cleared and replaced with the manually entered ones. These logs are flagged with `manual: true` in the database.

- A pencil icon appears next to manually entered logs in the log viewer (for both user and manager)
- The stats table shows a "Días manuales" column counting how many days have manually introduced logs per period

### API: `POST /api/manualLogs`

Body: `{ startHour: "HH:MM", endHour: "HH:MM", pauses: [{ start: "HH:MM", end: "HH:MM" }] }`

Clears today's logs and creates manual entries. Requires authentication.

### Auto-close on forgotten clock-out

If a user forgets to clock out and their last log is from a previous day (not `out`), the system automatically creates an `out` log at 23:59 of that day and resets the user status to `not_started`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
