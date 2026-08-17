# Podcast EP001 Voice Lock Design

## Decision

The original EP001 master audio is the only approved public voice and production reference for future SoFa Podcast episodes. The reference is `assets/audio/sofa-podcast-001.m4a`. Hana and the 2026-08-17 EP002-EP006 A/C YouTube batch are not approved references.

This decision applies to the official website, RSS distribution, and YouTube Podcast. All three surfaces must reuse one approved episode master instead of synthesizing platform-specific audio.

## Problem

The rejected EP002-EP006 A/C assets were produced as 24 kHz mono audio, while the approved EP001 master is 44.1 kHz stereo. The former pipeline concatenated provider MP3 segments before normalizing their channel layout and sample rate. Reusing the same A/C labels therefore did not reproduce the approved EP001 listening experience.

Voice labels and manifest metadata alone are insufficient release evidence. The generated artifact must satisfy both the locked synthesis policy and the locked media properties.

## Approved Production Contract

Each episode must use the EP001 synthesis and editorial pattern:

- Google Cloud Text-to-Speech under the `sofa-engine` project.
- The two Taiwan Mandarin voices recorded by the EP001 voice policy, alternating by the same semantic roles as EP001.
- The EP001 speaking pace, prompt rhythm, cue placement, six-second thinking pause, and answer cadence.
- No Hana, local macOS voice, browser TTS, or unapproved provider fallback.
- Every provider speech segment is decoded and normalized before concatenation.
- Each normalized segment is 44,100 Hz, two-channel stereo PCM during assembly.
- The assembled master is loudness-normalized once, then encoded to the distribution formats.
- MP3/M4A derivatives must preserve 44,100 Hz stereo output and identical program duration.
- The YouTube MP4 must mux the approved M4A with static Podcast artwork. It must not resynthesize, time-stretch, or otherwise alter the audio.

The first implementation deliverable is a 30-60 second audition derived from an EP002 source-locked passage. It remains local and private until Fay confirms that it matches the EP001 reference.

## Data Flow

1. Load a source-locked episode script and the versioned EP001 voice policy.
2. Synthesize each spoken segment once through Google Cloud TTS.
3. Decode each response to PCM and normalize it to 44.1 kHz stereo.
4. Generate the cue tone and silence directly at 44.1 kHz stereo.
5. Concatenate only normalized PCM segments.
6. Apply one master loudness-normalization pass.
7. Encode the approved master to MP3 and M4A.
8. Validate media properties, duration consistency, voice-policy ID, source hash, and listening-approval state.
9. Reuse the approved M4A for the website/RSS release and YouTube MP4 mux.

## Release Gates

Generation and publication are separate operations. A generated artifact cannot become public unless all gates pass:

- Google provider call succeeded without fallback.
- The exact approved voice-policy version is present.
- Every segment and final derivative are 44.1 kHz stereo.
- MP3 and M4A durations differ by no more than 0.10 seconds.
- The source script and final assets have recorded SHA-256 hashes.
- The audition or full episode has explicit Fay listening approval.
- The YouTube upload is initially private.
- Website, RSS, and YouTube reference the same approved master identity.
- Provider publication and marketing scheduling remain blocked until a private YouTube playback check passes.

Any failed or unavailable check returns a blocked state. The pipeline must not silently substitute another voice, provider, sample rate, channel layout, or public URL.

## Cost and Credentials

The existing `sofa-engine` Google Cloud project has Cloud Text-to-Speech enabled and an active trial credit. Credentials must be provided to CI through a GitHub secret or a keyless Google workload identity. They must never be committed, logged, copied into Notion, or embedded in public artifacts.

One episode is synthesized once. Website, RSS, and YouTube distribution reuse the same encoded master, so additional plays or platforms do not incur additional TTS character charges.

## Test Strategy

Tests are added before implementation and must demonstrate the current failure:

- A 24 kHz mono provider segment cannot pass the assembly contract unchanged.
- The normalization stage emits 44.1 kHz stereo input for concatenation.
- Cue and silence assets match the same media properties.
- The final MP3 and M4A satisfy the locked media contract.
- A missing credential, provider error, unsupported voice, media mismatch, absent source hash, or missing listening approval blocks release.
- The YouTube renderer muxes the approved master without a second synthesis call.
- Website/RSS/YouTube manifests resolve to the same approved episode master.

The relevant existing Podcast and YouTube contract suite must remain green.

## Rollout

1. Build and listen to one private 30-60 second EP002 audition.
2. After Fay confirms an EP001 match, rebuild EP002 in full and perform a complete private playback review.
3. Repeat sequentially for EP003-EP006; do not batch-approve listening.
4. Only approved episodes may be made public and re-enter the marketing schedule.
5. Keep the rejected 2026-08-17 A/C videos private as audit evidence until the corrected releases are verified.

