const http = require('http');

function postJson(path, body) {
  return new Promise((resolve, reject) => {
    const dataString = JSON.stringify(body);
    const req = http.request(
      `http://localhost:5000${path}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(dataString),
        },
      },
      (res) => {
        let resData = '';
        res.on('data', (chunk) => (resData += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(resData) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: resData });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(dataString);
    req.end();
  });
}

function getAuth(path, token) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      `http://localhost:5000${path}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      (res) => {
        let resData = '';
        res.on('data', (chunk) => (resData += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(resData) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: resData });
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function runAuthTests() {
  console.log('==================================================');
  console.log('CRAFTLOOP REGISTRATION → LOGIN VERIFICATION');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  const uniqueId = Date.now();
  const testEmail = `newuser_${uniqueId}@example.com`;
  const testPassword = 'Password123!';
  const testName = 'CraftLoop Test User';

  // 1. REGISTER NEW ACCOUNT
  console.log(`[STEP 1] Registering new user: ${testEmail}...`);
  const regRes = await postJson('/api/auth/register', {
    name: testName,
    email: testEmail,
    password: testPassword,
    role: 'creator',
  });

  assert(regRes.status === 201, `Registration HTTP status is 201 (got ${regRes.status})`);
  assert(regRes.body?.success === true, 'Registration body success is true');
  assert(Boolean(regRes.body?.token), 'Registration returns valid JWT token');
  assert(regRes.body?.user?.email === testEmail.toLowerCase(), 'Registration user email is correct & normalized');
  assert(regRes.body?.user?.password === undefined, 'Registration response NEVER exposes password');

  // 2. LOGIN WITH EXACT SAME CREDENTIALS
  console.log(`\n[STEP 2] Logging in with EXACT credentials...`);
  const loginRes = await postJson('/api/auth/login', {
    email: testEmail,
    password: testPassword,
  });

  assert(loginRes.status === 200, `Login HTTP status is 200 (got ${loginRes.status})`);
  assert(loginRes.body?.success === true, 'Login body success is true');
  assert(Boolean(loginRes.body?.token), 'Login returns valid JWT token');
  assert(loginRes.body?.user?.name === testName, 'Login returns correct user name');
  assert(loginRes.body?.user?.role === 'creator', 'Login returns correct creator role');
  assert(loginRes.body?.user?.password === undefined, 'Login response NEVER exposes password');

  // 3. VERIFY JWT PROTECTED ROUTE
  console.log(`\n[STEP 3] Verifying protected /api/auth/me with returned JWT...`);
  const meRes = await getAuth('/api/auth/me', loginRes.body.token);
  assert(meRes.status === 200, `GET /api/auth/me returns 200 OK`);
  assert(meRes.body?.user?.email === testEmail.toLowerCase(), 'GET /api/auth/me identifies correct authenticated user');

  // 4. TEST WRONG PASSWORD
  console.log(`\n[STEP 4] Testing wrong password...`);
  const wrongPassRes = await postJson('/api/auth/login', {
    email: testEmail,
    password: 'WrongPassword123',
  });
  assert(wrongPassRes.status === 401, `Wrong password returns 401 Unauthorized`);
  assert(wrongPassRes.body?.message === 'Invalid email or password', `Wrong password message is "Invalid email or password" (got "${wrongPassRes.body?.message}")`);

  // 5. TEST NONEXISTENT EMAIL
  console.log(`\n[STEP 5] Testing nonexistent email...`);
  const noAccountRes = await postJson('/api/auth/login', {
    email: `nonexistent_${Date.now()}@craftloop.com`,
    password: 'Password123!',
  });
  assert(noAccountRes.status === 401, `Nonexistent email returns 401 Unauthorized`);
  assert(
    noAccountRes.body?.message === 'No account found' || noAccountRes.body?.message === 'Invalid email or password',
    `Nonexistent email message is secure 401 (got "${noAccountRes.body?.message}")`
  );

  // 6. TEST EMAIL CASE NORMALIZATION
  console.log(`\n[STEP 6] Testing email case normalization (Register with CamelCase, Login with lowercase)...`);
  const caseEmail = `CaseUser_${uniqueId}@Example.COM`;
  const caseReg = await postJson('/api/auth/register', {
    name: 'Case Test User',
    email: caseEmail,
    password: 'Password123!',
    role: 'viewer',
  });
  assert(caseReg.status === 201, 'Case normalization: Registration succeeds');

  const caseLogin = await postJson('/api/auth/login', {
    email: caseEmail.toLowerCase(),
    password: 'Password123!',
  });
  assert(caseLogin.status === 200, 'Case normalization: Login with lowercase succeeds');
  assert(caseLogin.body?.user?.role === 'viewer', 'Case normalization: Returns viewer role');

  // Also test Login with uppercase
  const caseLoginUpper = await postJson('/api/auth/login', {
    email: caseEmail.toUpperCase(),
    password: 'Password123!',
  });
  assert(caseLoginUpper.status === 200, 'Case normalization: Login with UPPERCASE succeeds');

  // 7. TEST WHITESPACE HANDLING
  console.log(`\n[STEP 7] Testing whitespace handling (surrounding spaces)...`);
  const spaceLogin = await postJson('/api/auth/login', {
    email: `   ${testEmail}   `,
    password: testPassword,
  });
  assert(spaceLogin.status === 200, 'Whitespace handling: Login with trimmed spaces succeeds');

  // 8. TEST CREATOR & VIEWER ROLE LOGINS
  console.log(`\n[STEP 8] Testing Creator & Viewer role authentication flow...`);
  const testCreatorEmail = `auth_creator_${Date.now()}@example.com`;
  await postJson('/api/auth/register', {
    name: 'Auth Test Creator',
    email: testCreatorEmail,
    password: 'password123',
    role: 'creator',
  });
  const creatorLogin = await postJson('/api/auth/login', {
    email: testCreatorEmail,
    password: 'password123',
  });
  assert(creatorLogin.status === 200 && creatorLogin.body?.user?.role === 'creator', 'Creator role registration & login works');

  const testViewerEmail = `auth_viewer_${Date.now() + 1}@example.com`;
  await postJson('/api/auth/register', {
    name: 'Auth Test Viewer',
    email: testViewerEmail,
    password: 'password123',
    role: 'viewer',
  });
  const viewerLogin = await postJson('/api/auth/login', {
    email: testViewerEmail,
    password: 'password123',
  });
  assert(viewerLogin.status === 200 && viewerLogin.body?.user?.role === 'viewer', 'Viewer role registration & login works');

  console.log(`\n==================================================`);
  console.log(`AUTH TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`==================================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runAuthTests().catch((err) => {
  console.error('Fatal error in auth tests:', err);
  process.exit(1);
});
