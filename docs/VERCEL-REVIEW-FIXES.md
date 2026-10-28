# Vercel saved-output review corrections — October 27, 2026

No provider calls, refetches or profile approvals. Re-materialized the three previously saved GPT-5.5 outputs against the same saved source set using the normal atomic state save path. The workspace remains `needs_review`.

## Competitor retention

The organization reviewer previously returned an empty competitor list without reasons. Confirmed deterministic first-party comparison candidates now survive omissions. Rejection requires a specific reason naming the candidate and a verbatim supporting quote. Rejected candidates remain visible with their reason, comparison receipt and a one-click Restore button; restoration edits the draft, invalidates previous acknowledgments and records an audit event. It never approves.

All three comparisons were retained from [Vercel's saved comparisons index](https://domains.vercel.com/kb/comparisons):

| Competitor | Exact saved quote | Domain |
| --- | --- | --- |
| Cloudflare | TanStack Start on Vercel vs Cloudflare Compare running TanStack Start on Vercel Functions with Fluid compute against Cloudflare Workers. | Missing |
| Netlify | TanStack Start on Vercel vs Netlify Compare running TanStack Start on Vercel Functions with Fluid compute against Netlify Functions. | Missing |
| Webflow | Astro on Vercel vs Webflow Cloud Compare running Astro on Vercel Functions with Fluid compute against Webflow Cloud on Cloudflare Workers. | Missing |

The saved sources establish these competitor names, but contain no outbound links establishing their domains. The old materializer discarded even confirmed names when a domain was missing. These three grounded names are now retained with `domain_missing`; each domain has a visible blocking warning for owner review. Domains were not guessed. Customer entries are unchanged: 12 retained, two with sourced domains.

## Size and approval

`minEmployees`, floor 100, is a measurable employee-count rule. CamelCase, underscore and hyphen identifiers are recognized without rewriting model output. Enterprise/floor contradiction checks still apply when a target size is supplied.

Vercel has **three blocking quality warnings**, all missing competitor domains, and **zero advisories**. The empty competitor and unmeasurable-size warnings are resolved. The blank `targetCompanySize` remains a required editable owner field, not a contradiction; approval remains disabled until it is filled. No size description or acknowledgment was written on the owner's behalf.
