import { ref } from 'vue';

// ADR-006: the illustrative preview is per session, off on every load, and never saved.
// It lives at module level only so it survives switching between workspace sections.
export const illustrativePreviewOn = ref(false);
