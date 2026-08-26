#!/usr/bin/env bash
set -euo pipefail

REPO="aibossmobility/Codex"
ENVIRONMENT="production"
SSH_ALIAS="${PAPALIFE_SSH_ALIAS:-site-server}"
KEY_PATH="${HOME}/.ssh/papalife_github_actions_ed25519"

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "BLOCKED: required command '$1' is not installed." >&2
    exit 1
  }
}

for cmd in ssh ssh-keygen gh awk grep sed chmod mkdir mktemp; do
  need "$cmd"
done

mkdir -p "$HOME/.ssh"
chmod 700 "$HOME/.ssh"

# Resolve the already-configured and already-trusted SSH alias. This avoids
# inventing production connection details in the script.
SSH_CONFIG="$(ssh -G "$SSH_ALIAS" 2>/dev/null)" || {
  echo "BLOCKED: cannot resolve SSH alias '$SSH_ALIAS'." >&2
  exit 1
}

SSH_HOST="$(printf '%s\n' "$SSH_CONFIG" | awk '$1=="hostname" {print $2; exit}')"
SSH_USER="$(printf '%s\n' "$SSH_CONFIG" | awk '$1=="user" {print $2; exit}')"
SSH_PORT="$(printf '%s\n' "$SSH_CONFIG" | awk '$1=="port" {print $2; exit}')"

[[ -n "$SSH_HOST" && -n "$SSH_USER" && -n "$SSH_PORT" ]] || {
  echo "BLOCKED: SSH alias '$SSH_ALIAS' did not resolve host/user/port." >&2
  exit 1
}

# Prove the Mac can already reach the server using its existing trusted SSH
# configuration. StrictHostKeyChecking=yes prevents silent trust-on-first-use.
echo "Verifying existing trusted Papa Life SSH connection..."
ssh -o BatchMode=yes -o StrictHostKeyChecking=yes "$SSH_ALIAS" \
  'printf "PAPALIFE_SSH_TRUST_OK\n"' | grep -qx 'PAPALIFE_SSH_TRUST_OK' || {
    echo "BLOCKED: existing trusted SSH connection failed. No keys or GitHub secrets were changed." >&2
    exit 1
  }

# GitHub Actions connects by the resolved host rather than by the local alias,
# so require an existing trusted known_hosts entry for that exact endpoint.
if [[ "$SSH_PORT" == "22" ]]; then
  KNOWN_HOST_LOOKUP="$SSH_HOST"
else
  KNOWN_HOST_LOOKUP="[$SSH_HOST]:$SSH_PORT"
fi

KNOWN_HOSTS_VALUE="$(ssh-keygen -F "$KNOWN_HOST_LOOKUP" -f "$HOME/.ssh/known_hosts" 2>/dev/null | grep -v '^#' || true)"
[[ -n "$KNOWN_HOSTS_VALUE" ]] || {
  echo "BLOCKED: no already-trusted known_hosts entry exists for $KNOWN_HOST_LOOKUP." >&2
  echo "Refusing to use ssh-keyscan automatically because production host keys must be pinned from an existing trust source." >&2
  exit 1
}

# Create a dedicated deployment credential. Never reuse Brian's ordinary Mac key.
if [[ ! -f "$KEY_PATH" ]]; then
  echo "Creating dedicated GitHub Actions deployment key..."
  ssh-keygen -q -t ed25519 -N '' -C 'papalife-github-actions-deploy' -f "$KEY_PATH"
else
  echo "Dedicated deployment key already exists; reusing it."
fi
chmod 600 "$KEY_PATH"
chmod 644 "${KEY_PATH}.pub"

PUBKEY="$(cat "${KEY_PATH}.pub")"
[[ "$PUBKEY" == ssh-ed25519\ * ]] || {
  echo "BLOCKED: generated public key is not the expected Ed25519 format." >&2
  exit 1
}

# Add only the dedicated public key, idempotently, through the already-trusted
# connection. This does not broaden sudo or root access.
echo "Authorizing dedicated deploy public key on Papa Life server..."
printf '%s\n' "$PUBKEY" | ssh -o BatchMode=yes -o StrictHostKeyChecking=yes "$SSH_ALIAS" 'bash -s' <<'REMOTE'
set -euo pipefail
IFS= read -r PUBKEY
umask 077
mkdir -p "$HOME/.ssh"
touch "$HOME/.ssh/authorized_keys"
chmod 700 "$HOME/.ssh"
chmod 600 "$HOME/.ssh/authorized_keys"
if ! grep -qxF "$PUBKEY" "$HOME/.ssh/authorized_keys"; then
  printf '%s\n' "$PUBKEY" >> "$HOME/.ssh/authorized_keys"
fi
REMOTE

# Verify GitHub CLI authentication before attempting any secret writes.
gh auth status >/dev/null 2>&1 || {
  echo "BLOCKED: GitHub CLI is not authenticated. The deploy key was created and authorized, but no GitHub secrets were written." >&2
  echo "Run 'gh auth login' on this Mac, then rerun this script." >&2
  exit 1
}

# Ensure the production environment exists. No protection rules are weakened.
echo "Ensuring GitHub production environment exists..."
gh api --method PUT "repos/${REPO}/environments/${ENVIRONMENT}" >/dev/null

# Store values directly from the Mac into GitHub. The private key is never
# printed to stdout and never committed to the repository.
echo "Writing protected production secrets to GitHub..."
gh secret set PAPALIFE_SSH_PRIVATE_KEY --repo "$REPO" --env "$ENVIRONMENT" < "$KEY_PATH"
printf '%s' "$SSH_HOST" | gh secret set PAPALIFE_SSH_HOST --repo "$REPO" --env "$ENVIRONMENT"
printf '%s' "$SSH_USER" | gh secret set PAPALIFE_SSH_USER --repo "$REPO" --env "$ENVIRONMENT"
printf '%s' "$SSH_PORT" | gh secret set PAPALIFE_SSH_PORT --repo "$REPO" --env "$ENVIRONMENT"
printf '%s\n' "$KNOWN_HOSTS_VALUE" | gh secret set PAPALIFE_SSH_KNOWN_HOSTS --repo "$REPO" --env "$ENVIRONMENT"

# Verify only secret NAMES. Never read back values.
EXPECTED=(
  PAPALIFE_SSH_PRIVATE_KEY
  PAPALIFE_SSH_HOST
  PAPALIFE_SSH_USER
  PAPALIFE_SSH_PORT
  PAPALIFE_SSH_KNOWN_HOSTS
)
SECRET_NAMES="$(gh secret list --repo "$REPO" --env "$ENVIRONMENT" --json name --jq '.[].name')"
for name in "${EXPECTED[@]}"; do
  grep -qx "$name" <<<"$SECRET_NAMES" || {
    echo "BLOCKED: GitHub did not report required secret name '$name'." >&2
    exit 1
  }
done

# Validate the dedicated key independently. Use a temporary known_hosts file
# containing only the pinned production entry.
TMP_KNOWN_HOSTS="$(mktemp)"
trap 'rm -f "$TMP_KNOWN_HOSTS"' EXIT
printf '%s\n' "$KNOWN_HOSTS_VALUE" > "$TMP_KNOWN_HOSTS"
chmod 600 "$TMP_KNOWN_HOSTS"

ssh -i "$KEY_PATH" \
  -p "$SSH_PORT" \
  -o BatchMode=yes \
  -o IdentitiesOnly=yes \
  -o StrictHostKeyChecking=yes \
  -o UserKnownHostsFile="$TMP_KNOWN_HOSTS" \
  "$SSH_USER@$SSH_HOST" \
  'printf "PAPALIFE_GITHUB_DEPLOY_KEY_OK\n"' | grep -qx 'PAPALIFE_GITHUB_DEPLOY_KEY_OK' || {
    echo "BLOCKED: dedicated deployment key verification failed." >&2
    exit 1
  }

echo "READY: Papa Life GitHub deployment authentication is configured and independently verified."
echo "No production deployment was triggered by this bootstrap script."
