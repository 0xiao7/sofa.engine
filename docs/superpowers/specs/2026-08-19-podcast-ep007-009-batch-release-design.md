# Podcast EP007–EP009 Batch Release Design

**Date:** 2026-08-19  
**Status:** Approved design, pending written-spec confirmation  
**Scope:** EP007, EP008, EP009 only

## Objective

Reduce the Podcast release cycle from one episode at a time to one bounded three-episode batch without weakening official-source accuracy, the approved Azure voice contract, per-batch human listening approval, or provider readback requirements.

The batch covers three 記帳士 episodes from the current queue:

| Episode | Law | Article | Official URL |
|---|---|---|---|
| EP007 | 加值型及非加值型營業稅法 | 1 | `https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=G0340080&flno=1` |
| EP008 | 加值型及非加值型營業稅法 | 1-1 | `https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=G0340080&flno=1-1` |
| EP009 | 加值型及非加值型營業稅法 | 2 | `https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=G0340080&flno=2` |

## Current Defects to Repair

- Queue `officialLawUrl` values use invalid `flno` forms (`01`, encoded `01之1`, `02`) and currently return an official-site parameter error.
- EP008's SoFa source API `original_text` is truncated after `本法所稱加值型之營業稅，係指依`.
- EP009's stored source has whitespace corruption inside `買受人` and `不符免稅`.
- EP007–EP009 have no production scripts, final assets, duration, immutable GUID, master hash, voice policy ID, or YouTube video.
- All three remain `content_verified_audio_pending` with pending listen approval.

## Source-of-Truth Contract

The National Laws and Regulations Database `LawAll.aspx?pcode=G0340080` is the primary statutory source. The source API remains the source for stored SoFa analysis sections, but never overrides official statutory wording.

The implementation shall:

1. Correct the three queue permalinks to the exact URLs in this specification.
2. Update the EP008 official-source override identity to the corrected permalink while preserving its recorded truncated-source SHA-256 and full official text.
3. Normalize EP009 statutory whitespace from the official rendering before spoken production.
4. Add a regression fixture containing the exact official text for Articles 1, 1-1, and 2.
5. Fail content QC when a production script omits, changes, truncates, or labels a paraphrase as statutory text.

The exact official text for EP008 is:

> 本法所稱加值型之營業稅，係指依第四章第一節計算稅額者；所稱非加值型之營業稅，係指依第四章第二節計算稅額者。

## Episode Structure

Each episode follows the approved EP001 A/C active-recall structure:

1. Role A: show identification, exam, law, article, and `先聽條文原文`.
2. Role C: exact official statutory text.
3. Role A: one concrete recall question derived from the statutory structure.
4. Six-second thinking pause.
5. Role C: compact answer using only source-supported distinctions.
6. Role A: memory rule and one high-value exam trap.
7. Role C: short CTA to the episode-specific SoFa practice URL.

Scripts must not claim an official answer, guarantee an exam outcome, introduce unsourced legal doctrine, or include product-led sales language. Public metadata must retain `SoFa Engine 參考解析` and `非考選部官方標準答案`.

## Voice and Media Contract

- Provider: Microsoft Azure Speech paid tier.
- Voice policy: `podcast-ep001-master-v1`.
- Roles: the locked EP001 A/C voices and settings only.
- Assembly: normalized 44.1 kHz stereo PCM segments before final encoding.
- Thinking pause: six seconds.
- Derivatives: MP3 for the website, M4A for RSS/Apple, VTT captions, and a 16:9 MP4 for YouTube.
- Every derivative records SHA-256; the queue records `masterSha256`, `assetSha256`, duration, final GUID, and `voicePolicyId`.
- The production workflow must use configured GitHub Azure secrets. It must fail closed if paid credentials are absent or the provider response is invalid.

The implementation must not use legacy Hana, Meijia, Edge TTS, device speech, or old private YouTube assets.

## Batch Approval and State Transitions

The batch removes repeated setup work, not the listen gate.

```text
content_verified_audio_pending
  -> production_pending_listen_approval
  -> one three-episode private artifact package
  -> explicit Fay approval covering EP007, EP008, EP009
  -> approved_for_release
  -> released / private_ready / published (per platform evidence)
```

Before approval, the system may create only the private GitHub production artifact package; it must not upload to YouTube, add the episodes to public RSS, or change any provider state. One batch review manifest names all three episode IDs and artifact hashes. After the user approves the package, the same approval time is written to each episode's existing `listenApproval` record; no script may self-author approval.

If one episode fails listening review, only that episode returns to production. The other two keep their approved artifacts but the default public release remains a single bounded batch unless the user explicitly narrows the release set.

## Website and RSS Release

After approval, the existing release path shall publish all three episodes in one transaction-like run:

- Update `podcast-release.json`, `podcast.xml`, `podcast.html`, and `data/podcast-law-queue.json`.
- Preserve latest-first RSS order: EP009, EP008, EP007, then the existing episodes.
- Give each episode a final immutable GUID and matching enclosure URL.
- Use distinct RFC 2822 publication timestamps in episode order so clients have a deterministic sequence.
- Keep the channel `lastBuildDate` at least as new as the newest episode.
- Abort before committing if any asset, source-locked content row, pronunciation review, or approval record is missing.

## YouTube Podcast Release

For each approved episode:

1. Validate exact asset and metadata SHA-256 values.
2. Upload privately through the idempotent YouTube release client when credentials are available.
3. Attach the exact video ID to Podcast playlist `PLSYv3TKyUtG8`.
4. Read back the private provider record and exact URL.
5. Publish only after the website/RSS release and approval evidence are committed.
6. Read back public privacy status and playlist membership by video ID, not title.

Provider credentials unavailable in the local environment are not a reason to weaken the validator. GitHub Actions secrets are the preferred unattended provider path; authenticated YouTube Studio is a fallback only when the API workflow cannot mutate provider state.

## Promotion Routing

All three episodes are single-exam 記帳士 content. Threads Topic must therefore be `記帳士`, not `國考`.

Promotion copy shall expose a short transcript excerpt rather than a bare link:

- one statutory sentence or structured list excerpt;
- one recall question;
- one source-boundary sentence;
- an episode-specific YouTube or website URL with platform-specific UTM.

Threads, Instagram, and LINE are separate provider records. A draft is not scheduled; scheduled is not published. Acceptance requires provider ID, provider status, exact `dueAt`, Topic readback where applicable, and then the exact public permalink after sending.

## Error Handling

- Official URL or statutory mismatch: stop before synthesis.
- Missing Azure credentials: fail the production workflow without fallback voice generation.
- Missing or malformed MP3/M4A/VTT/MP4: stop before approval packaging.
- `會計` present without the Taiwan pronunciation record `ㄎㄨㄞˋ ㄐㄧˋ`: stop release.
- Missing per-batch user approval: keep all provider outputs private and RSS unchanged.
- YouTube upload succeeds but playlist attach fails: persist the uploaded video ID and retry only playlist attachment.
- Provider asset or metadata hash conflict: stop and require explicit reconciliation; never upload a duplicate automatically.
- Buffer or social provider readback unavailable: keep the Notion row as draft/待確認.

## Verification

Local and CI verification must cover:

- queue URL correction and official-text fixture equality;
- EP008 truncation override and EP009 whitespace normalization;
- A/C script role order, six-second pause, exact statutory segment, and forbidden wording;
- Azure paid provider and 44.1 kHz stereo media contract;
- VTT timing/order and Taiwan pronunciation record;
- SHA-256, GUID, enclosure, transcript, MP4, and YouTube metadata readiness;
- three-episode selection without skipping a blocked head episode;
- RSS order EP009→EP001 and immutable older GUID/media URLs;
- YouTube idempotency and private-before-public state changes;
- Threads Topic `記帳士` and provider evidence fields.

Release completion requires all tests passing, PR checks passing, merged deployment, public RSS readback, every public media URL returning HTTP 200, exact YouTube public URLs in the Podcast playlist, and Notion TASK_DB/CHANGELOG_DB updates with `是否公告=false`.

## Out of Scope

- EP010 and later episodes.
- Removing the human listen-approval gate.
- Replacing the approved EP001 Azure voice policy.
- Changing the Apple feed URL or episode GUIDs already published.
- Calling social drafts or provider acceptance public success.
