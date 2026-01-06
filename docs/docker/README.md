# Standalone Docker Setup

This directory contains the standalone Docker Compose configuration for running the TellerQuoter services outside of the dev container.

## Files

- `docker-compose.standalone.yml` - Standalone PostgreSQL setup for local development without dev containers

## Usage

**Note:** If you're using the VSCode dev container (recommended), you don't need this setup. The dev container includes its own PostgreSQL instance.

### Running Standalone PostgreSQL

```bash
docker-compose -f docs/docker/docker-compose.standalone.yml up -d
```

This will start:
- PostgreSQL 15 on port 5433
- Data persisted in `postgres_data` volume

### Stopping

```bash
docker-compose -f docs/docker/docker-compose.standalone.yml down
```

### Removing Data

```bash
docker-compose -f docs/docker/docker-compose.standalone.yml down -v
```

## When to Use This

- Testing outside the dev container environment
- CI/CD pipelines that need a standalone database
- Developers who prefer not to use dev containers
