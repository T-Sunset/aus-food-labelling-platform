<script setup lang="ts">
export interface BuilderStep {
  id: string;
  title: string;
  status?: string;
  done?: boolean;
}

const props = defineProps<{ steps: readonly BuilderStep[]; modelValue: number }>();
const emit = defineEmits<{ 'update:modelValue': [index: number] }>();

function go(index: number): void {
  emit('update:modelValue', Math.min(Math.max(index, 0), props.steps.length - 1));
}
</script>

<template>
  <div class="builder-shell">
    <nav
      class="builder-steps"
      aria-label="Steps"
    >
      <ol>
        <li
          v-for="(step, index) in steps"
          :key="step.id"
        >
          <button
            type="button"
            class="builder-step"
            :class="{ active: index === modelValue }"
            :aria-current="index === modelValue ? 'step' : undefined"
            @click="go(index)"
          >
            <span class="step-number">{{ index + 1 }}</span>
            <span class="step-text">
              <strong>{{ step.title }}</strong>
              <small v-if="step.status">{{ step.done ? '✓ ' : '' }}{{ step.status }}</small>
            </span>
          </button>
        </li>
      </ol>
    </nav>
    <div class="builder-body">
      <slot :step="steps[modelValue]" />
      <div class="builder-nav">
        <button
          type="button"
          class="builder-back"
          :disabled="modelValue === 0"
          @click="go(modelValue - 1)"
        >
          Back
        </button>
        <slot name="actions" />
        <button
          v-if="modelValue < steps.length - 1"
          type="button"
          class="builder-next"
          @click="go(modelValue + 1)"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.builder-shell {
  display: grid;
  grid-template-columns: minmax(180px, 240px) 1fr;
  gap: 1.25rem;
  align-items: start;
}
.builder-steps ol {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.35rem;
}
.builder-step {
  display: flex;
  gap: 0.6rem;
  align-items: flex-start;
  width: 100%;
  text-align: left;
  padding: 0.55rem 0.65rem;
  border: 1px solid #d4d4d8;
  border-radius: 0.5rem;
  background: #fff;
  cursor: pointer;
  font: inherit;
}
.builder-step.active {
  border-color: #1d4ed8;
  box-shadow: inset 3px 0 0 #1d4ed8;
  background: #eff6ff;
}
.step-number {
  min-width: 1.6rem;
  height: 1.6rem;
  border-radius: 50%;
  background: #e4e4e7;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
}
.step-text {
  display: grid;
}
.step-text small {
  color: #52525b;
}
.builder-body {
  display: grid;
  gap: 1rem;
}
.builder-nav {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  flex-wrap: wrap;
}
.builder-back,
.builder-next {
  padding: 0.45rem 0.9rem;
  border: 1px solid #a1a1aa;
  border-radius: 0.4rem;
  background: #fff;
  cursor: pointer;
  font: inherit;
}
.builder-back:disabled {
  opacity: 0.5;
  cursor: default;
}
@media (max-width: 760px) {
  .builder-shell {
    grid-template-columns: 1fr;
  }
}
</style>
