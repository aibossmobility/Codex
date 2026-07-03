# ElevenLabs Voice Agent Setup

The Papa Life voice page uses the ElevenLabs Conversational AI widget with a private server-side signed URL.

Do not paste the ElevenLabs API key into chat, HTML, or client-side JavaScript. Store it only in the live server `.env` file.

## One-time setup on the live server

```bash
cd /var/www/html/bossmobilelifecoach.com
bash scripts/set-elevenlabs-key.sh
```

Paste the ElevenLabs API key when prompted. The input is hidden.

Then restart the two Papa Life services one at a time:

```bash
bash scripts/restart.sh
```

## Manual fallback

If the helper script is not available, edit `/var/www/html/bossmobilelifecoach.com/.env` and add:

```env
ELEVENLABS_API_KEY=PASTE_KEY_HERE
ELEVENLABS_AGENT_ID=agent_7601kt209ptbe0qrd9b3e4gezyv6
ELEVENLABS_AGENT_NAME=Brian Keith Hill
ELEVENLABS_VOICE_ID=Eo4ci7V2rQPrk0GndhOG
ELEVENLABS_VOICE_NAME=Brian Keith Hill
```

Then run:

```bash
bash scripts/restart.sh
```

## Verification

The endpoint should return `ok: true` after the key is configured:

```bash
curl -s https://bossmobilelifecoach.com/api/ai/voice/signed-url
```

Do not share the returned signed URL. It is temporary, but it still starts a private voice session.

## Required voice configuration

The live ElevenLabs agent must use:

```text
Provider: elevenlabs
Agent: Brian Keith Hill
Agent ID: agent_7601kt209ptbe0qrd9b3e4gezyv6
TTS model: eleven_v3_conversational
Voice: Brian Keith Hill
Voice ID: Eo4ci7V2rQPrk0GndhOG
Voice override: disabled
```

The server validates these values on startup and before creating a signed voice session. If the voice ID changes or override is enabled, the voice endpoint fails instead of silently using a fallback voice.

## HeyGen video voice guard

The separate HeyGen video-generation tool must use Brian Keith Hill's HeyGen voice:

```text
HEYGEN_DEFAULT_VOICE_ID=1d5b92d8097541f881d1be4a061b6559
BRIAN_HEYGEN_VOICE_ID=1d5b92d8097541f881d1be4a061b6559
```

If a video request passes a different `voice_id`, the request fails instead of falling back to another avatar or provider default.
