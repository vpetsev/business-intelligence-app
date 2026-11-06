import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { createElement } from 'react';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear(); });
vi.mock('next/link', () => ({ default: ({ children, href, ...props }) => createElement('a', { ...props, href }, children) }));
vi.mock('next/router', () => ({ useRouter: vi.fn() }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
