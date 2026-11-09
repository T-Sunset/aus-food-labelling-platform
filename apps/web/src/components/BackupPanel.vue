<script setup lang="ts">
import { onMounted, ref } from 'vue';
import {
  type LocalFoodStore,
  type RecoveryPointRecord,
  type RestoreInspection,
} from '@aus-food/storage';
import AppButton from './ui/button/AppButton.vue';

const props = defineProps<{ store: LocalFoodStore }>();
const emit = defineEmits<{ restored: [] }>();

const passphrase = ref('');
const selectedFile = ref<File>();
const fileInput = ref<HTMLInputElement>();
const backupContents = ref('');
const inspection = ref<RestoreInspection>();
const recoveryPoints = ref<RecoveryPointRecord[]>([]);
const errorMessage = ref('');
const statusMessage = ref('');
const busy = ref(false);
const durabilityMessage = ref('');
const maximumBackupBytes = 100 * 1024 * 1024;

onMounted(async () => {
  try {
    recoveryPoints.value = await props.store.recoveryPoints.list();
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Could not load recovery point details.';
  }
});

function resetMessages(): void {
  errorMessage.value = '';
  statusMessage.value = '';
}

function onFileChange(event: Event): void {
  resetMessages();
  inspection.value = undefined;
  backupContents.value = '';
  selectedFile.value = (event.currentTarget as HTMLInputElement).files?.[0];
}

async function downloadBackup(encrypted: boolean): Promise<void> {
  resetMessages();
  if (busy.value) {
    return;
  }
  if (
    !encrypted &&
    !window.confirm(
      'This backup will be unencrypted and readable by anyone who can access the file. Continue?',
    )
  ) {
    return;
  }
  if (encrypted && !passphrase.value.trim()) {
    errorMessage.value =
      'Enter a passphrase before creating an encrypted backup. Keep it safe; it cannot be recovered.';
    return;
  }
  busy.value = true;
  try {
    const content = await props.store.exportBackup(
      encrypted
        ? { encryption: 'passphrase', passphrase: passphrase.value }
        : { encryption: 'none' },
    );
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `aus-food-workspace-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    statusMessage.value = encrypted
      ? 'Encrypted workspace backup downloaded. The passphrase is not stored here and cannot be recovered.'
      : 'Unencrypted workspace backup downloaded. Protect the file as sensitive business data.';
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Could not create the workspace backup.';
  } finally {
    busy.value = false;
  }
}

async function inspectSelectedBackup(): Promise<void> {
  resetMessages();
  if (!selectedFile.value || busy.value) {
    errorMessage.value = 'Choose a backup file before inspecting it.';
    return;
  }
  if (selectedFile.value.size > maximumBackupBytes) {
    errorMessage.value = 'Backup exceeds the 100 MiB inspection limit.';
    return;
  }
  busy.value = true;
  inspection.value = undefined;
  try {
    backupContents.value = await selectedFile.value.text();
    inspection.value = await props.store.inspectBackup(
      backupContents.value,
      passphrase.value || undefined,
    );
    statusMessage.value =
      'Backup integrity and record format verified. Review the counts and conflicts before restoring.';
  } catch (error) {
    backupContents.value = '';
    errorMessage.value = error instanceof Error ? error.message : 'Could not inspect this backup.';
  } finally {
    busy.value = false;
  }
}

async function restoreSelectedBackup(): Promise<void> {
  resetMessages();
  const currentInspection = inspection.value;
  if (!currentInspection || !backupContents.value || busy.value) {
    errorMessage.value = 'Inspect a backup before restoring it.';
    return;
  }
  const replacing = currentInspection.requiresExplicitReplace;
  const confirmMessage = replacing
    ? 'Restoring this backup will replace all current workspace records. This cannot be undone. Continue?'
    : 'Restore this workspace backup to this browser profile?';
  if (!window.confirm(confirmMessage)) {
    return;
  }
  busy.value = true;
  try {
    await props.store.restoreBackup(backupContents.value, {
      ...(passphrase.value ? { passphrase: passphrase.value } : {}),
      ...(replacing ? { replaceExisting: true } : {}),
    });
    statusMessage.value = replacing
      ? 'Workspace restored. Existing records were replaced by the verified backup.'
      : 'Workspace restored from the verified backup.';
    emit('restored');
    inspection.value = undefined;
    backupContents.value = '';
    selectedFile.value = undefined;
    if (fileInput.value) {
      fileInput.value.value = '';
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Could not restore this backup.';
    return;
  } finally {
    busy.value = false;
  }
  try {
    recoveryPoints.value = await props.store.recoveryPoints.list();
  } catch (error) {
    errorMessage.value = `Workspace restored, but recovery point details could not be refreshed: ${error instanceof Error ? error.message : 'unknown storage error'}`;
  }
}

async function requestDurability(): Promise<void> {
  resetMessages();
  try {
    const result = await props.store.requestDurableStorage();
    durabilityMessage.value = !result.supported
      ? 'This browser does not support a durable-storage request. Browser data can still be removed or evicted.'
      : result.granted
        ? 'The browser granted a request to protect this site’s storage from routine eviction. Keep separate backups; this is not a guarantee.'
        : 'The browser did not grant a durable-storage request. Keep separate backups because browser data can be removed or evicted.';
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Could not request durable storage.';
  }
}
</script>

<template>
  <section class="page">
    <div class="page-heading compact">
      <div>
        <p class="eyebrow">
          LOCAL DATA PROTECTION
        </p>
        <h1>Backup &amp; restore</h1>
        <p class="lede">
          Create a versioned workspace backup or restore a verified file. Workspace data stays in
          this browser unless you choose to download or restore a file.
        </p>
      </div>
    </div>

    <div
      class="notice notice-warning backup-warning"
      role="status"
    >
      <strong>Browser storage is not a backup.</strong>
      <span>Browser data may be cleared or evicted. Encrypted backup passphrases cannot be recovered;
        unencrypted backups are readable by anyone who can access the file.</span>
    </div>
    <div
      v-if="statusMessage"
      class="notice notice-success"
      role="status"
      aria-live="polite"
    >
      {{ statusMessage }}
    </div>
    <div
      v-if="errorMessage"
      class="notice notice-error"
      role="alert"
    >
      <strong>Action could not be completed.</strong> {{ errorMessage }}
    </div>

    <section
      class="panel backup-panel"
      aria-labelledby="create-backup-title"
    >
      <div class="panel-heading">
        <div>
          <p class="eyebrow">
            EXPORT
          </p>
          <h2 id="create-backup-title">
            Create a backup
          </h2>
        </div>
      </div>
      <label class="field backup-passphrase">
        <span>Passphrase for encrypted backup or restore</span>
        <input
          v-model="passphrase"
          type="password"
          autocomplete="new-password"
          placeholder="Enter only when using encryption"
        >
        <small class="field-hint">The passphrase is not stored. Losing it means an encrypted backup cannot be
          opened.</small>
      </label>
      <div class="backup-actions">
        <AppButton
          type="button"
          :disabled="busy"
          @click="downloadBackup(true)"
        >
          Download encrypted backup
        </AppButton>
        <AppButton
          variant="outline"
          type="button"
          :disabled="busy"
          @click="downloadBackup(false)"
        >
          Download unencrypted backup
        </AppButton>
      </div>
    </section>

    <section
      class="panel backup-panel"
      aria-labelledby="restore-backup-title"
    >
      <div class="panel-heading">
        <div>
          <p class="eyebrow">
            IMPORT
          </p>
          <h2 id="restore-backup-title">
            Inspect and restore a backup
          </h2>
        </div>
      </div>
      <label class="field">
        <span>Workspace backup file</span>
        <input
          ref="fileInput"
          type="file"
          accept=".json,application/json"
          @change="onFileChange"
        >
      </label>
      <p
        v-if="selectedFile"
        class="field-hint"
      >
        Selected: {{ selectedFile.name }} · {{ selectedFile.size }} bytes
      </p>
      <div class="backup-actions">
        <AppButton
          variant="outline"
          type="button"
          :disabled="busy || !selectedFile"
          @click="inspectSelectedBackup"
        >
          Inspect backup
        </AppButton>
      </div>

      <section
        v-if="inspection"
        class="backup-inspection"
        aria-labelledby="inspection-title"
      >
        <h3 id="inspection-title">
          Inspection results
        </h3>
        <p>
          Backup counts: {{ inspection.backupCounts.ingredients }} ingredients,
          {{ inspection.backupCounts.formulations }} formulations,
          {{ inspection.backupCounts.products }} products,
          {{ inspection.backupCounts.approvedVersions }} versioned reviews.
        </p>
        <p>
          Current workspace: {{ inspection.existingCounts.ingredients }} ingredients,
          {{ inspection.existingCounts.formulations }} formulations,
          {{ inspection.existingCounts.products }} products,
          {{ inspection.existingCounts.approvedVersions }} versioned reviews.
        </p>
        <p>Conflicting record IDs: {{ inspection.conflictingRecordIds.length }}.</p>
        <div
          v-if="inspection.requiresExplicitReplace"
          class="notice notice-warning"
          role="status"
        >
          <strong>Restore will replace existing workspace records.</strong>
          <span>Conflicting records are not merged. Inspect the counts above and confirm replacement in
            the next step.</span>
        </div>
        <AppButton
          type="button"
          :disabled="busy"
          @click="restoreSelectedBackup"
        >
          {{
            inspection.requiresExplicitReplace
              ? 'Confirm and replace workspace'
              : 'Confirm restore to this device'
          }}
        </AppButton>
      </section>
    </section>

    <section
      class="panel backup-panel"
      aria-labelledby="durability-title"
    >
      <div class="panel-heading">
        <div>
          <p class="eyebrow">
            BROWSER STORAGE
          </p>
          <h2 id="durability-title">
            Storage durability
          </h2>
        </div>
      </div>
      <p class="field-hint">
        A browser may evict or clear local data. Requesting durable storage is best-effort and does
        not replace a separate backup.
      </p>
      <AppButton
        variant="outline"
        type="button"
        @click="requestDurability"
      >
        Request durable storage
      </AppButton>
      <p
        v-if="durabilityMessage"
        class="durability-message"
        role="status"
      >
        {{ durabilityMessage }}
      </p>
    </section>

    <section
      class="panel backup-panel"
      aria-labelledby="recovery-title"
    >
      <div class="panel-heading">
        <div>
          <p class="eyebrow">
            AUTOMATIC RECOVERY
          </p>
          <h2 id="recovery-title">
            Recovery points
          </h2>
        </div>
        <span class="count-badge">{{ recoveryPoints.length }}</span>
      </div>
      <p
        v-if="recoveryPoints.length === 0"
        class="field-hint"
      >
        No schema-migration recovery points are recorded in this workspace.
      </p>
      <ul
        v-else
        class="recovery-list"
      >
        <li
          v-for="point in recoveryPoints"
          :key="point.id"
        >
          <strong>{{ point.createdAt }}</strong>
          <span>Schema version {{ point.fromVersion }} → {{ point.toVersion }}</span>
          <span>{{ point.records.ingredients.length }} ingredients,
            {{ point.records.formulations.length }} formulations,
            {{ point.records.products.length }} products captured</span>
        </li>
      </ul>
    </section>
  </section>
</template>

<style scoped>
.backup-warning,
.backup-panel {
  margin-bottom: 18px;
}
.backup-passphrase {
  max-width: 520px;
}
.backup-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}
.backup-inspection {
  display: grid;
  gap: 8px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #edf0ec;
}
.backup-inspection h3 {
  margin: 0;
  color: #34453b;
  font-size: 15px;
}
.backup-inspection p,
.durability-message {
  margin: 0;
  color: #5d6c62;
  font-size: 12px;
  line-height: 1.55;
  overflow-wrap: anywhere;
}
.recovery-list {
  display: grid;
  gap: 10px;
  padding: 0;
  margin: 0;
  list-style: none;
}
.recovery-list li {
  display: grid;
  gap: 4px;
  padding-top: 12px;
  border-top: 1px solid #edf0ec;
  color: #5d6c62;
  font-size: 12px;
}
.recovery-list strong {
  color: #34453b;
}
@media (max-width: 520px) {
  .backup-actions {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
