// Test script for getSafeRedirectPath edge cases
// Run with: node scripts/test-redirect.js

function getSafeRedirectPath(path, role) {
  const defaultHome = role === 'superuser' ? '/platform' : '/dashboard';
  if (!path || typeof path !== 'string') return defaultHome;
  const trimmed = path.trim();
  // Must start with exactly one "/" and reject protocol-relative "//"
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return defaultHome;
  // Reject backslashes which can be used for open redirects (e.g. /\evil.com)
  if (trimmed.includes('\\')) return defaultHome;
  // Reject ASCII control characters
  if (/[\x00-\x1F\x7F]/.test(trimmed)) return defaultHome;
  // Reject protocol indicators (e.g. javascript:, http:, https:)
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return defaultHome;
  // Reject any path starting with /login to avoid loops
  if (trimmed === '/login' || trimmed.startsWith('/login?') || trimmed.startsWith('/login/')) {
    return defaultHome;
  }
  // Role checks:
  // /platform... is allowed only for superuser
  if (trimmed === '/platform' || trimmed.startsWith('/platform/')) {
    return role === 'superuser' ? trimmed : defaultHome;
  }
  // /dashboard... is allowed only for non-superusers
  if (trimmed === '/dashboard' || trimmed.startsWith('/dashboard/')) {
    return role !== 'superuser' ? trimmed : defaultHome;
  }
  return defaultHome;
}

const testCases = [
  // 1. Tenant user + next=/platform/spas -> /dashboard
  {
    name: 'tenant user attempting /platform/spas',
    path: '/platform/spas',
    role: 'staff',
    expected: '/dashboard',
  },
  {
    name: 'owner attempting /platform/spas',
    path: '/platform/spas',
    role: 'owner',
    expected: '/dashboard',
  },
  // 2. Superuser + next=/dashboard/clients -> /platform
  {
    name: 'superuser attempting /dashboard/clients',
    path: '/dashboard/clients',
    role: 'superuser',
    expected: '/platform',
  },
  // 3. Open redirect: //evil.com -> role default
  {
    name: 'protocol-relative //evil.com with tenant',
    path: '//evil.com',
    role: 'owner',
    expected: '/dashboard',
  },
  {
    name: 'protocol-relative //evil.com with superuser',
    path: '//evil.com',
    role: 'superuser',
    expected: '/platform',
  },
  // 4. Open redirect: https://evil.com -> role default
  {
    name: 'absolute https://evil.com with tenant',
    path: 'https://evil.com',
    role: 'admin',
    expected: '/dashboard',
  },
  {
    name: 'absolute https://evil.com with superuser',
    path: 'https://evil.com',
    role: 'superuser',
    expected: '/platform',
  },
  // 5. Open redirect with backslash: /\evil.com -> role default
  {
    name: 'backslash /\\evil.com with tenant',
    path: '/\\evil.com',
    role: 'staff',
    expected: '/dashboard',
  },
  {
    name: 'backslash /\\evil.com with superuser',
    path: '/\\evil.com',
    role: 'superuser',
    expected: '/platform',
  },
  // 6. Valid superuser route
  {
    name: 'superuser accessing /platform/spas',
    path: '/platform/spas',
    role: 'superuser',
    expected: '/platform/spas',
  },
  // 7. Valid tenant route
  {
    name: 'tenant accessing /dashboard/clients',
    path: '/dashboard/clients',
    role: 'owner',
    expected: '/dashboard/clients',
  },
  // 8. Empty / null path
  {
    name: 'null path with superuser',
    path: null,
    role: 'superuser',
    expected: '/platform',
  },
  {
    name: 'empty string path with tenant',
    path: '',
    role: 'admin',
    expected: '/dashboard',
  },
  // 9. Login loop prevention
  {
    name: '/login?next=/dashboard loop prevention',
    path: '/login?next=/dashboard',
    role: 'owner',
    expected: '/dashboard',
  },
];

let failed = 0;
for (const tc of testCases) {
  const actual = getSafeRedirectPath(tc.path, tc.role);
  if (actual !== tc.expected) {
    console.error(`FAIL: ${tc.name} -> expected '${tc.expected}', got '${actual}'`);
    failed++;
  } else {
    console.log(`PASS: ${tc.name} -> '${actual}'`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} test(s) failed.`);
  process.exit(1);
} else {
  console.log(`\nAll ${testCases.length} tests passed successfully!`);
}
