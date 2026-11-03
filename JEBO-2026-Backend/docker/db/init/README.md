# Place a prepared dump here as 01_backup.sql (gitignored).
#
# From the repo root:
#   cp "../jebo_2026_backup_20260624_102025.sql" docker/db/init/01_backup.sql
#
# Postgres only loads these files on the FIRST volume init.
# To re-load: docker compose down -v && docker compose up --build
#
# Without a dump, the API entrypoint creates schema via Knex migrations only.
