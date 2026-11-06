#!/usr/bin/env bash
# Creates the mailbox_manager role and the mailbox_manager_dev / mailbox_manager_test databases
# on an EXISTING local PostgreSQL server. Idempotent: a second run changes nothing.
# Never edits pg_hba.conf, postgresql.conf, other roles or other databases.
# Honours PGHOST and PGPORT.
set -euo pipefail

ROLE="mailbox_manager"
ROLE_PASSWORD="mailbox_manager"
DATABASES=("mailbox_manager_dev" "mailbox_manager_test")

candidates=()
if command -v psql >/dev/null 2>&1; then candidates+=("$(command -v psql)"); fi
for p in /opt/homebrew/bin/psql /usr/local/bin/psql \
  /opt/homebrew/opt/postgresql@*/bin/psql /usr/local/opt/postgresql@*/bin/psql \
  /Applications/Postgres.app/Contents/Versions/latest/bin/psql; do
  [ -x "$p" ] && candidates+=("$p")
done

PSQL=""
CONN=()
for bin in "${candidates[@]}"; do
  for args in "-d postgres" "-U postgres -d postgres"; do
    # shellcheck disable=SC2086
    if "$bin" $args -X -At -w -c "select 1" >/dev/null 2>&1; then
      PSQL="$bin"
      read -r -a CONN <<<"$args"
      break 2
    fi
  done
done

if [ -z "$PSQL" ]; then
  echo "Could not connect to PostgreSQL as a password-less superuser." >&2
  echo "Tried: psql -d postgres and psql -U postgres -d postgres (PGHOST=${PGHOST:-default} PGPORT=${PGPORT:-default})." >&2
  exit 1
fi

run() { "$PSQL" "${CONN[@]}" -X -At -w -v ON_ERROR_STOP=1 "$@"; }

echo "Using: $PSQL ${CONN[*]} (host=${PGHOST:-default}, port=${PGPORT:-default})"
if [ "$(run -c "select rolsuper from pg_roles where rolname = current_user")" != "t" ]; then
  echo "The connected user is not a superuser; cannot create roles." >&2
  exit 1
fi

list_dbs() { run -c "select datname from pg_database where not datistemplate order by datname"; }
BEFORE="$(list_dbs)"
echo "Databases before:"; echo "$BEFORE" | sed 's/^/  /'

if [ "$(run -c "select 1 from pg_roles where rolname = '$ROLE'")" = "1" ]; then
  echo "Role $ROLE already exists, skipping."
else
  run -c "create role $ROLE with login password '$ROLE_PASSWORD' nosuperuser nocreaterole createdb" >/dev/null
  echo "Created role $ROLE (LOGIN, NOSUPERUSER, NOCREATEROLE, CREATEDB for the Prisma shadow database)."
fi

for db in "${DATABASES[@]}"; do
  if [ "$(run -c "select 1 from pg_database where datname = '$db'")" = "1" ]; then
    echo "Database $db already exists, skipping."
  else
    run -c "create database $db owner $ROLE encoding 'UTF8' template template0" >/dev/null
    echo "Created database $db owned by $ROLE."
  fi
done

AFTER="$(list_dbs)"
echo "Databases after:"; echo "$AFTER" | sed 's/^/  /'
ADDED="$(comm -13 <(echo "$BEFORE") <(echo "$AFTER"))"
REMOVED="$(comm -23 <(echo "$BEFORE") <(echo "$AFTER"))"
echo "Added: ${ADDED:-(none)}" | tr '\n' ' '; echo
echo "Removed: ${REMOVED:-(none)}"
