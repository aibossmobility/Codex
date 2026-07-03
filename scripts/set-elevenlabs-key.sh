#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

agent_id="${ELEVENLABS_AGENT_ID:-agent_7601kt209ptbe0qrd9b3e4gezyv6}"
voice_id="${ELEVENLABS_VOICE_ID:-Eo4ci7V2rQPrk0GndhOG}"

if [[ ! -f .env ]]; then
  touch .env
  chmod 600 .env
fi

backup=".env.backup-$(date +%Y%m%d%H%M%S)"
cp .env "$backup"

read -rsp "Paste ElevenLabs API key (input hidden): " elevenlabs_api_key
echo

if [[ -z "${elevenlabs_api_key// }" ]]; then
  echo "No key entered. .env was not changed."
  exit 1
fi

upsert_env() {
  local key="$1"
  local value="$2"
  local tmp
  tmp="$(mktemp)"

  awk -v key="$key" -v value="$value" '
    BEGIN { found = 0 }
    $0 ~ "^" key "=" {
      print key "=" value
      found = 1
      next
    }
    { print }
    END {
      if (!found) print key "=" value
    }
  ' .env > "$tmp"

  mv "$tmp" .env
  chmod 600 .env
}

upsert_env "ELEVENLABS_API_KEY" "$elevenlabs_api_key"
upsert_env "ELEVENLABS_AGENT_ID" "$agent_id"
upsert_env "ELEVENLABS_AGENT_NAME" "Brian Keith Hill"
upsert_env "ELEVENLABS_VOICE_ID" "$voice_id"
upsert_env "ELEVENLABS_VOICE_NAME" "Brian Keith Hill"

echo "ElevenLabs settings saved. Backup created at $backup."
echo "Next run: bash scripts/restart.sh"
