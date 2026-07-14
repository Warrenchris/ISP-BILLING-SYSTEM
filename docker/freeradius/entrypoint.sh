#!/bin/bash
set -e

echo "🔒 Validating RADIUS security configuration..."

# Enforce check for RADIUS_SHARED_SECRET
if [ -z "${RADIUS_SHARED_SECRET}" ]; then
  echo "🚨 ERROR: RADIUS_SHARED_SECRET environment variable is not set!"
  echo "   You must set RADIUS_SHARED_SECRET in your .env file."
  exit 1
fi

if [ "${RADIUS_SHARED_SECRET}" = "testing123" ]; then
  echo "🚨 ERROR: RADIUS_SHARED_SECRET is set to the default weak value 'testing123'!"
  echo "   For security reasons, FreeRADIUS will not start with this weak credential."
  echo "   Please update RADIUS_SHARED_SECRET in your .env to a strong, unique secret."
  exit 1
fi

if [ ${#RADIUS_SHARED_SECRET} -lt 12 ]; then
  echo "🚨 ERROR: RADIUS_SHARED_SECRET is too short (must be at least 12 characters)!"
  exit 1
fi

echo "✅ Security validation passed. Starting FreeRADIUS..."

# Execute standard FreeRADIUS entrypoint command
exec radiusd -f -l stdout
