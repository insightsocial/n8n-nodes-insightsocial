# Changelog

## 0.1.4 - 2026-10-23

- The Platform list offers only LinkedIn, Pinterest, Reddit, TikTok, Twitter/X and YouTube, and the Platform default is now TikTok. A workflow that names a platform no longer on the list fails with the API's error.
- `x-insightsocial-client` sends `n8n/0.1.4`.

## 0.1.3 - 2026-10-05

- The credential's documentation link carries `utm_source=n8n`, so an account created from n8n's credential screen is attributed to n8n rather than to direct.
- `x-insightsocial-client` sends `n8n/0.1.3`.

## 0.1.2 - 2026-10-04

- The `x-insightsocial-client` header reports the package version (`n8n/0.1.2`); it still said `n8n/0.1.0`.
- README: the metered price example is TikTok Post/Comments at today's 20-60 credits.

## 0.1.0 - 2026-10-03

- First release: Call Endpoint, Get Credits and List Endpoints, with endpoints, parameters and prices loaded from the live catalogue.
- Return All Pages follows `pagination.next_cursor` up to Max Pages.
- Usable as an AI Agent tool.
