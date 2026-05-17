# Alexa Forge Database Schema

## workspaces

```sql
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## api_keys

```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  provider TEXT NOT NULL,
  label TEXT NOT NULL,
  secret_encrypted TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  state TEXT NOT NULL DEFAULT 'active',
  priority INTEGER NOT NULL DEFAULT 100,
  region TEXT,
  last_error TEXT,
  cooldown_until TIMESTAMPTZ,
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  avg_latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_keys_provider_state ON api_keys(provider, state, is_active);
```

## presets

```sql
CREATE TABLE presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  mode TEXT NOT NULL,
  prompt_template TEXT NOT NULL,
  negative_prompt TEXT,
  provider_preferences JSONB NOT NULL DEFAULT '[]',
  default_settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## tasks

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  user_id UUID,
  project_id UUID,
  preset_id UUID REFERENCES presets(id),
  type TEXT NOT NULL,
  mode TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  provider TEXT,
  model TEXT,
  api_key_id UUID REFERENCES api_keys(id),
  input_payload JSONB NOT NULL,
  output_payload JSONB,
  error TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  fallback_from UUID REFERENCES tasks(id),
  cost_estimate_usd NUMERIC(12,6),
  queued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE INDEX idx_tasks_status ON tasks(status, queued_at);
CREATE INDEX idx_tasks_workspace ON tasks(workspace_id, queued_at DESC);
```

## assets

```sql
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  task_id UUID REFERENCES tasks(id),
  kind TEXT NOT NULL,
  url TEXT NOT NULL,
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  duration_seconds NUMERIC(8,2),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## key_events

```sql
CREATE TABLE key_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id),
  task_id UUID REFERENCES tasks(id),
  event_type TEXT NOT NULL,
  message TEXT,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
