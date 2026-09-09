# Threads Podcast Priority and Full Show Notes Design

## Goal

While YouTube has no fresh public inventory, use Threads to promote one public Podcast episode per day and make every Podcast episode description useful on its own: real transcript text, an exact official episode/transcript link, and an exact practice link.

## Channel boundary

- This is a temporary routing policy, not a permanent YouTube ban.
- YouTube production and native publication continue independently.
- Threads does not promote YouTube while `youtube_threads_promotion.status` is `paused_inventory_not_ready`.
- Threads adds one Podcast promotion beside the existing daily content. It may reference only an anonymously public Podcast episode.
- A future YouTube resumption requires fresh public inventory and a separately recorded routing decision; it must not silently replace the Podcast lane.

## Podcast episode notes

- `<description>` remains a concise plain-text summary so all RSS clients have readable metadata.
- `<content:encoded>` contains the complete source-locked episode transcript, not a three-line excerpt.
- The complete transcript is rendered from the same `content.transcriptText` used by the website and VTT production path.
- Every episode note ends with two distinct links: the official episode transcript/player and the exact SoFa practice route.
- XML/HTML escaping and paragraph boundaries are preserved.
- `<podcast:transcript>` remains present. It is not treated as proof that Apple displays a native Chinese transcript.

## Daily Threads Podcast lane

- The daily automation maintains one additional Podcast Threads item.
- Copy uses a new hook or angle and must not repeat an exact prior caption.
- CTA points to the official SoFa episode/transcript URL with `utm_source=threads` and an episode-specific campaign.
- The post may also contain the official practice link, but never a YouTube URL while the temporary pause is active.
- Draft, provider scheduled, provider sent, and publicly verified remain separate states.

## Acceptance

- Generator tests prove complete transcript paragraphs and both exact links appear in episode show notes.
- Heartbeat verifier rejects prompts missing the daily Podcast post, official transcript link, practice link, or temporary YouTube-pause/resume boundary.
- Existing historical schedules and published permalinks remain unchanged.
- No new episode or Threads post is called public without its own provider/public evidence.
