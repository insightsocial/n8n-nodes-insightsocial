# n8n-nodes-insightsocial

An [n8n](https://n8n.io) community node for the [InsightSocial API](https://www.insightsocial.app/docs):
public data from Instagram, TikTok, Facebook, LinkedIn, X/Twitter, Threads, YouTube, Reddit and
Pinterest. Profiles, posts, comments, followers, search and transcripts, through one API key and
one credit balance, priced per call.

The node reads the live endpoint catalogue, so every endpoint, parameter and price appears in
n8n as soon as the API has it. No node update needed.

## Install

In n8n: **Settings → Community nodes → Install**, then enter:

```
n8n-nodes-insightsocial
```

Self-hosted from the command line: `npm install n8n-nodes-insightsocial` in your n8n custom
folder (usually `~/.n8n/custom`), then restart n8n.

## Credentials

1. Sign in at [insightsocial.app](https://www.insightsocial.app) and create an API key in the
   portal (**API → Keys**). Keys start with `isk_`.
2. In n8n, create an **InsightSocial API** credential and paste the key. Leave Base URL as it is.
3. Click **Test**. It calls `GET /v1/credits`, which is free.

## Operations

| Operation | What it does | Cost |
| --- | --- | --- |
| **Call Endpoint** | Pick a platform and an endpoint, fill its parameters, get the data | The endpoint's price |
| **Get Credits** | Your balance and this month's usage | Free |
| **List Endpoints** | Every endpoint on a platform, with parameters and price | Free |

**Call Endpoint** options:

- **Endpoint**: the dropdown shows each endpoint with its price, for example
  `Profile (10 credits)` or, for TikTok, `Post/Comments (10-30 credits, metered)`.
- **Parameters**: loaded for the endpoint you picked, with the required ones marked.
- **Return All Pages**: follows `pagination.next_cursor` until there are no more pages or
  **Max Pages** is reached. Every page is a separate, charged call.
- **Output**: *One Item per Row* splits list results into one n8n item per row, ready for
  Google Sheets or a CRM. *Full Response* returns the whole response per page, including
  `credits_used` and `credits_remaining`.

The node can also be used as a tool by n8n's **AI Agent**.

## Example: a TikTok account's followers into a sheet

1. **Manual Trigger** (or Schedule Trigger).
2. **InsightSocial**: Call Endpoint → Platform `TikTok` → Endpoint `User/Followers (10 credits)`
   → `handle` = `nasa`. Turn on **Return All Pages**, **Max Pages** `2`.
3. **Google Sheets**: Append Row.

Measured on 2026-10-03: 2 pages, 300 followers. At today's prices that is 20 credits.

A single profile lookup (`/v1/tiktok/profile`, `handle` = `nasa`) costs 10 credits.

## Pricing

- Every endpoint has its own price in credits. Read it in the Endpoint dropdown, or for free at
  [`GET https://api.insightsocial.app/v1/endpoints`](https://api.insightsocial.app/v1/endpoints).
- **Metered** endpoints show a range. The top of the range is held when the call starts, and you
  are charged what the call actually used.
- **Free**: failed calls, empty results, `dry_run=1` calls, Get Credits and List Endpoints.
- Every account gets **10 free calls**, once, for calls priced at 100 credits or less.
- Repeating a call is charged again, because it can return newer data.
- Plans: Free has 500 credits a month, Pro 10,000. The balance is shared with InsightSocial exports.
  See [pricing](https://www.insightsocial.app/pricing).
- Rate limits: 60 requests per minute and 10 in flight, per key.

## Errors

Errors come back with the API's own type and message, for example
`INVALID_REQUEST: ... Missing required parameter(s): one of handle, user_id.` or
`INSUFFICIENT_CREDITS`. A failed call is never charged. Turn on n8n's **Continue On Fail** to keep
a workflow running past a bad row.

## Links

- [API docs](https://www.insightsocial.app/docs) · [Quickstart](https://www.insightsocial.app/docs/quickstart) · [API Explorer](https://www.insightsocial.app/portal/api/explorer)
- [OpenAPI spec](https://github.com/insightsocial/openapi) · [CLI + MCP server](https://github.com/insightsocial/cli) · [Agent skills](https://github.com/insightsocial/skills)
- Support: [support@insightsocial.app](mailto:support@insightsocial.app)

## License

[MIT](LICENSE)
