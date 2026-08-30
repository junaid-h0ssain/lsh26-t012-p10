# Third-Party Material and AI Disclosure

This project uses the following frameworks, libraries, starter code, UI kit, and assets:

| Name | Version or source URL | Licence | Used for |
|---|---|---|---|
| TanStack Start | package.json | MIT License, TanStack authors | Application and SSR framework |
| TanStack Router | package.json | MIT License, TanStack authors | File-based routing |
| React and React DOM | package.json | MIT License, Meta Platforms, Inc. | UI rendering |
| Vite | package.json | MIT License, Vite contributors | Development and production builds |
| Tailwind CSS | package.json | MIT License, Tailwind Labs | Utility CSS |
| DaisyUI | package.json | MIT License, DaisyUI authors | UI component classes and themes |
| TypeScript | package.json | Apache License 2.0, Microsoft Corporation | Type checking and compilation |
| Biome | package.json | MIT License, Biome authors | Formatting and linting |
| Nitro | package.json | MIT License, UnJS contributors | Production server adapter |
| Emoji symbols | src/routes/index.tsx | Unicode emoji characters | Text icons in the UI |

No external fonts, icon packages, image assets, or paid services are used.

## AI tools

List each AI tool in `evaluation-manifest.json`, what it was used for and how the output was verified. Write `None` if no AI tool was used.

| Tool | Used for | How output was verified |
|---|---|---|
| Antigravity CLI / Opencode (Muse Spark) | Implemented prepaid meter calculation, daily balance tracking, recharge logic and debugging | Reviewed against AGENTS.md, ran engine across all public cases, verified `bun run build` succeeds |

See `evaluation-manifest.json` for the structured AI disclosure.

## Original-work statement

Everything not declared in this file or `EVENT.md` was created by the registered team during the event window. The LofiStack submission kit (`LofiStack-Hackathon-2026-Submission-Kit-v2.2/`) was used as the supplied event template and fixture source.
