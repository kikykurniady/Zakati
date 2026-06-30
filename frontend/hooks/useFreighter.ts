'use client';

/**
 * Wallet access for components and hooks.
 *
 * The implementation now lives in {@link FreighterProvider} so that every
 * caller shares one connection state. This module re-exports the consumer hook
 * to keep existing `@/hooks/useFreighter` imports working.
 */
export { useFreighter, type UseFreighterReturn } from '@/context/FreighterProvider';
