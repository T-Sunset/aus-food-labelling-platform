<script setup lang="ts">
import { computed } from 'vue';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

defineOptions({ name: 'AppButton', inheritAttrs: false });

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e3a34f] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-[#2e644f] text-white hover:bg-[#234f3d]',
        outline: 'border border-[#e2e8e1] bg-white text-[#2e644f] hover:bg-[#f0f6f1]',
        ghost: 'bg-transparent text-[#68766e] hover:bg-[#f1f5f0]',
        link: 'bg-transparent text-[#2e644f] underline-offset-4 hover:underline',
        destructive: 'bg-transparent text-[#8b3f32] hover:bg-[#fff2ef]',
      },
      size: {
        default: 'min-h-10 px-4 py-2',
        sm: 'min-h-8 px-3 py-1.5 text-xs',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

type ButtonVariants = VariantProps<typeof buttonVariants>;

const props = withDefaults(
  defineProps<{
    variant?: ButtonVariants['variant'];
    size?: ButtonVariants['size'];
    class?: string;
  }>(),
  {
    variant: 'default',
    size: 'default',
    class: '',
  },
);

const classes = computed(() => cn(buttonVariants({ variant: props.variant, size: props.size }), props.class));
</script>

<template>
  <button
    v-bind="$attrs"
    :class="classes"
    data-slot="button"
  >
    <slot />
  </button>
</template>
