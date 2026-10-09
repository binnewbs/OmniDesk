## Table `profiles`

### Columns

| Name         | Type          | Constraints |
| ------------ | ------------- | ----------- |
| `user_id`    | `uuid`        | Primary     |
| `username`   | `text`        |             |
| `bio`        | `text`        |             |
| `avatar`     | `text`        | Nullable    |
| `created_at` | `timestamptz` |             |
| `updated_at` | `timestamptz` |             |

## Table `assignments`

### Columns

| Name          | Type          | Constraints |
| ------------- | ------------- | ----------- |
| `id`          | `text`        | Primary     |
| `user_id`     | `uuid`        |             |
| `title`       | `text`        |             |
| `course`      | `text`        |             |
| `description` | `text`        |             |
| `due_date`    | `text`        |             |
| `priority`    | `text`        |             |
| `status`      | `text`        |             |
| `created_at`  | `timestamptz` |             |
| `updated_at`  | `timestamptz` |             |
| `deleted_at`  | `timestamptz` | Nullable    |

## Table `note_folders`

### Columns

| Name         | Type          | Constraints |
| ------------ | ------------- | ----------- |
| `id`         | `text`        | Primary     |
| `user_id`    | `uuid`        |             |
| `name`       | `text`        |             |
| `created_at` | `int8`        |             |
| `updated_at` | `timestamptz` |             |
| `deleted_at` | `timestamptz` | Nullable    |

## Table `notes`

### Columns

| Name            | Type          | Constraints |
| --------------- | ------------- | ----------- |
| `id`            | `text`        | Primary     |
| `user_id`       | `uuid`        |             |
| `content`       | `text`        |             |
| `last_modified` | `int8`        |             |
| `pinned`        | `bool`        |             |
| `folder_id`     | `text`        | Nullable    |
| `created_at`    | `int8`        |             |
| `updated_at`    | `timestamptz` |             |
| `deleted_at`    | `timestamptz` | Nullable    |

## Table `transactions`

### Columns

| Name          | Type          | Constraints |
| ------------- | ------------- | ----------- |
| `id`          | `text`        | Primary     |
| `user_id`     | `uuid`        |             |
| `type`        | `text`        |             |
| `amount`      | `numeric`     |             |
| `category`    | `text`        |             |
| `description` | `text`        |             |
| `date`        | `timestamptz` |             |
| `created_at`  | `timestamptz` |             |
| `updated_at`  | `timestamptz` |             |
| `deleted_at`  | `timestamptz` | Nullable    |

## Table `subscriptions`

### Columns

| Name             | Type          | Constraints |
| ---------------- | ------------- | ----------- |
| `id`             | `text`        | Primary     |
| `user_id`        | `uuid`        |             |
| `name`           | `text`        |             |
| `amount`         | `numeric`     |             |
| `category`       | `text`        |             |
| `start_date`     | `timestamptz` |             |
| `last_processed` | `timestamptz` |             |
| `created_at`     | `timestamptz` |             |
| `updated_at`     | `timestamptz` |             |
| `deleted_at`     | `timestamptz` | Nullable    |

## Table `schedule_classes`

### Columns

| Name          | Type          | Constraints |
| ------------- | ------------- | ----------- |
| `id`          | `text`        | Primary     |
| `user_id`     | `uuid`        |             |
| `name`        | `text`        |             |
| `room`        | `text`        |             |
| `day`         | `text`        |             |
| `start_time`  | `text`        |             |
| `end_time`    | `text`        |             |
| `color_theme` | `text`        |             |
| `created_at`  | `timestamptz` |             |
| `updated_at`  | `timestamptz` |             |
| `deleted_at`  | `timestamptz` | Nullable    |

## Table `cashflow_settings`

### Columns

| Name         | Type          | Constraints |
| ------------ | ------------- | ----------- |
| `user_id`    | `uuid`        | Primary     |
| `currency`   | `text`        |             |
| `updated_at` | `timestamptz` |             |

## RLS Policies

### `profiles`

| Policy                | Command | Roles  | Action     | USING                    | WITH CHECK               |
| --------------------- | ------- | ------ | ---------- | ------------------------ | ------------------------ |
| `profiles_own_delete` | DELETE  | public | PERMISSIVE | `(auth.uid() = user_id)` | —                        |
| `profiles_own_insert` | INSERT  | public | PERMISSIVE | —                        | `(auth.uid() = user_id)` |
| `profiles_own_select` | SELECT  | public | PERMISSIVE | `(auth.uid() = user_id)` | —                        |
| `profiles_own_update` | UPDATE  | public | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |

### `assignments`

| Policy                   | Command | Roles  | Action     | USING                    | WITH CHECK               |
| ------------------------ | ------- | ------ | ---------- | ------------------------ | ------------------------ |
| `assignments_own_delete` | DELETE  | public | PERMISSIVE | `(auth.uid() = user_id)` | —                        |
| `assignments_own_insert` | INSERT  | public | PERMISSIVE | —                        | `(auth.uid() = user_id)` |
| `assignments_own_select` | SELECT  | public | PERMISSIVE | `(auth.uid() = user_id)` | —                        |
| `assignments_own_update` | UPDATE  | public | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |

### `note_folders`

| Policy                    | Command | Roles  | Action     | USING                    | WITH CHECK               |
| ------------------------- | ------- | ------ | ---------- | ------------------------ | ------------------------ |
| `note_folders_own_delete` | DELETE  | public | PERMISSIVE | `(auth.uid() = user_id)` | —                        |
| `note_folders_own_insert` | INSERT  | public | PERMISSIVE | —                        | `(auth.uid() = user_id)` |
| `note_folders_own_select` | SELECT  | public | PERMISSIVE | `(auth.uid() = user_id)` | —                        |
| `note_folders_own_update` | UPDATE  | public | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |

### `notes`

| Policy             | Command | Roles  | Action     | USING                    | WITH CHECK               |
| ------------------ | ------- | ------ | ---------- | ------------------------ | ------------------------ |
| `notes_own_delete` | DELETE  | public | PERMISSIVE | `(auth.uid() = user_id)` | —                        |
| `notes_own_insert` | INSERT  | public | PERMISSIVE | —                        | `(auth.uid() = user_id)` |
| `notes_own_select` | SELECT  | public | PERMISSIVE | `(auth.uid() = user_id)` | —                        |
| `notes_own_update` | UPDATE  | public | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |

### `transactions`

| Policy                    | Command | Roles  | Action     | USING                    | WITH CHECK               |
| ------------------------- | ------- | ------ | ---------- | ------------------------ | ------------------------ |
| `transactions_own_delete` | DELETE  | public | PERMISSIVE | `(auth.uid() = user_id)` | —                        |
| `transactions_own_insert` | INSERT  | public | PERMISSIVE | —                        | `(auth.uid() = user_id)` |
| `transactions_own_select` | SELECT  | public | PERMISSIVE | `(auth.uid() = user_id)` | —                        |
| `transactions_own_update` | UPDATE  | public | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |

### `subscriptions`

| Policy                     | Command | Roles  | Action     | USING                    | WITH CHECK               |
| -------------------------- | ------- | ------ | ---------- | ------------------------ | ------------------------ |
| `subscriptions_own_delete` | DELETE  | public | PERMISSIVE | `(auth.uid() = user_id)` | —                        |
| `subscriptions_own_insert` | INSERT  | public | PERMISSIVE | —                        | `(auth.uid() = user_id)` |
| `subscriptions_own_select` | SELECT  | public | PERMISSIVE | `(auth.uid() = user_id)` | —                        |
| `subscriptions_own_update` | UPDATE  | public | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |

### `schedule_classes`

| Policy                        | Command | Roles  | Action     | USING                    | WITH CHECK               |
| ----------------------------- | ------- | ------ | ---------- | ------------------------ | ------------------------ |
| `schedule_classes_own_delete` | DELETE  | public | PERMISSIVE | `(auth.uid() = user_id)` | —                        |
| `schedule_classes_own_insert` | INSERT  | public | PERMISSIVE | —                        | `(auth.uid() = user_id)` |
| `schedule_classes_own_select` | SELECT  | public | PERMISSIVE | `(auth.uid() = user_id)` | —                        |
| `schedule_classes_own_update` | UPDATE  | public | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |

### `cashflow_settings`

| Policy                         | Command | Roles  | Action     | USING                    | WITH CHECK               |
| ------------------------------ | ------- | ------ | ---------- | ------------------------ | ------------------------ |
| `cashflow_settings_own_delete` | DELETE  | public | PERMISSIVE | `(auth.uid() = user_id)` | —                        |
| `cashflow_settings_own_insert` | INSERT  | public | PERMISSIVE | —                        | `(auth.uid() = user_id)` |
| `cashflow_settings_own_select` | SELECT  | public | PERMISSIVE | `(auth.uid() = user_id)` | —                        |
| `cashflow_settings_own_update` | UPDATE  | public | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |
