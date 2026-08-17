# Podcast official Azure production gate

Public Podcast audio uses the paid Azure Speech service with the exact approved EP001 voices:

- `zh-TW-HsiaoChenNeural`, rate `-10%`, pitch `-2Hz`
- `zh-TW-YunJheNeural`, rate `-10%`, pitch `-3Hz`

The free Edge Read Aloud transport is allowed only for local/private auditions because Microsoft does not publish explicit commercial output rights for that transport. Public production requires the paid Azure tier, whose product terms explicitly grant commercial use rights for prebuilt neural-voice output.

Required GitHub secrets:

- `AZURE_SPEECH_KEY`
- `AZURE_SPEECH_REGION`

Run `Paid Azure Podcast Production Candidate` separately for EP002 through EP006. Every artifact remains approval-gated. Do not replace website/RSS audio or publish YouTube until the paid-provider report, media hashes, VTT, and listening approval all pass.

Official references:

- https://www.microsoft.com/licensing/terms/productoffering/MicrosoftAzure/MCA
- https://learn.microsoft.com/azure/ai-services/speech-service/language-support
- https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech
