#!/usr/bin/env bash
# Drops ONLY what setup-local.sh created: mailbox_manager_dev, mailbox_manager_test and the
# mailbox_manager role. Asks for a typed confirmation first. Honours PGHOST and PGPORT.
set -euo pipefail

ROLE="mailbox_manager"
DATABASES=("mailbox_manager_dev" "mailbox_manager_test")

PSQL=""
CONN=()
for bin in "$(command -v psql || true)" /opt/homebrew/bin/psql /usr/local/bin/psql \
  /Applications/Postgres.app/Contents/Versions/latest/bin/psql; do
  [ -n "$bin" ] && [ -x "$bin" ] || continue
  for args in "-d postgres" "-U postgres -d postgres"; do
    # shellcheck disable=SC2086
    if "$bin" $args -X -At -w -c "select 1" >/dev/null 2>&1; then
      PSQL="$bin"; read -r -a CONN <<<"$args"; break 2
    fi
  done
done
[ -n "$PSQL" ] || { echo "Could not connect to PostgreSQL." >&2; exit 1; }
run() { "$PSQL" "${CONN[@]}" -X -At -w -v ON_ERROR_STOP=1 "$@"; }

echo "This drops ${DATABASES[*]} and the role $ROLE. Nothing else is touched."
read -r -p "Type 'teardown' to continue: " answer
[ "$answer" = "teardown" ] || { echo "Cancelled."; exit 1; }

for db in "${DATABASES[@]}"; do
  run -c "drop database if exists $db with (force)" >/dev/null && echo "Dropped database $db (if it existed)."
done
run -c "drop role if exists $ROLE" >/dev/null && echo "Dropped role $ROLE (if it existed)."
