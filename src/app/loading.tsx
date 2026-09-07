import { VaultLoading } from '@/components/vault/VaultLoading';

/** Route-level fallback shares the same preload as client session initialization. */
export default function Loading() { return <VaultLoading />; }
