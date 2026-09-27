const dotenv = require("dotenv");
dotenv.config();

const mongoose = require("mongoose");
const http = require("http");
const app = require("./server");
const { User } = require("./models");

function makeRequest(server, options, data = null) {
  return new Promise((resolve, reject) => {
    const port = server.address().port;
    const reqOptions = {
      hostname: "127.0.0.1",
      port,
      path: options.path,
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const parsed = body ? JSON.parse(body) : null;
          resolve({ status: res.statusCode, body: parsed, raw: body });
        } catch {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on("error", reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

async function runPhase13Tests() {
  console.log("\n==================================================");
  console.log("PHASE 13 PROFILE LIVE INTEGRATION TEST");
  console.log("==================================================\n");

  const { connectDB } = require("./config/db");
  await connectDB();
  console.log(`MongoDB connected: ${mongoose.connection.name} (ReadyState: ${mongoose.connection.readyState})`);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  console.log(`Test server running on port ${port}\n`);

  const ts = Date.now();

  try {
    // 1. Register a test creator
    const creatorEmail = `creator_p13_${ts}@craftloop.test`;
    const regCreator = await makeRequest(
      server,
      { path: "/api/auth/register", method: "POST" },
      { name: "Initial Creator Name", email: creatorEmail, password: "Password123!", role: "creator" }
    );
    assert(regCreator.status === 201, "1. Creator registered successfully (HTTP 201)");
    const creatorToken = regCreator.body.token;
    const creatorId = regCreator.body.user.id || regCreator.body.user._id;

    // TEST A: Load profile via GET /api/users/profile
    console.log("\n--- TEST A: Load profile from backend ---");
    const getProfileRes = await makeRequest(
      server,
      { path: "/api/users/profile", method: "GET", headers: { Authorization: `Bearer ${creatorToken}` } }
    );
    assert(getProfileRes.status === 200, "TEST A: GET /api/users/profile returns 200 OK");
    assert(getProfileRes.body.data.name === "Initial Creator Name", "TEST A: User name matches registered name");
    assert(getProfileRes.body.data.email === creatorEmail, "TEST A: User email matches registered email");
    assert(getProfileRes.body.data.password === undefined, "TEST A: Password is never returned in response");

    // TEST B: Update profile via PUT /api/users/profile
    console.log("\n--- TEST B: Update profile with new data ---");
    const updatePayload = {
      name: "Alex Morgan Updated",
      title: "Senior Product Designer",
      profession: "Senior Product Designer",
      bio: "Crafting modern intuitive web experiences on CraftLoop.",
      location: "Bengaluru, India",
      username: "alexmorgan_dev",
      skills: ["UI/UX Design", "Figma", "React", "Design Systems"],
    };

    const updateProfileRes = await makeRequest(
      server,
      { path: "/api/users/profile", method: "PUT", headers: { Authorization: `Bearer ${creatorToken}` } },
      updatePayload
    );
    assert(updateProfileRes.status === 200, "TEST B: PUT /api/users/profile returns 200 OK");
    assert(updateProfileRes.body.data.name === "Alex Morgan Updated", "TEST B: Name updated successfully");
    assert(updateProfileRes.body.data.title === "Senior Product Designer", "TEST B: Title updated successfully");
    assert(updateProfileRes.body.data.location === "Bengaluru, India", "TEST B: Location updated successfully");
    assert(updateProfileRes.body.data.username === "alexmorgan_dev", "TEST B: Username updated successfully");
    assert(updateProfileRes.body.data.skills.includes("Design Systems"), "TEST B: Skills array updated successfully");
    assert(updateProfileRes.body.data.password === undefined, "TEST B: Password hash is not exposed on update");

    // TEST C: Direct MongoDB Atlas verification
    console.log("\n--- TEST C: Verify changes in MongoDB Atlas collection ---");
    const mongoUser = await User.findById(creatorId).lean();
    assert(mongoUser !== null, "TEST C: User document exists in MongoDB Atlas");
    assert(mongoUser.name === "Alex Morgan Updated", "TEST C: MongoDB document name strictly verified");
    assert(mongoUser.title === "Senior Product Designer", "TEST C: MongoDB document title strictly verified");
    assert(mongoUser.location === "Bengaluru, India", "TEST C: MongoDB document location strictly verified");
    assert(mongoUser.username === "alexmorgan_dev", "TEST C: MongoDB document username strictly verified");
    assert(mongoUser.bio === "Crafting modern intuitive web experiences on CraftLoop.", "TEST C: MongoDB document bio strictly verified");

    // TEST D: Re-login and check persistence
    console.log("\n--- TEST D: Persistence across logout/re-login ---");
    const loginRes = await makeRequest(
      server,
      { path: "/api/auth/login", method: "POST" },
      { email: creatorEmail, password: "Password123!" }
    );
    assert(loginRes.status === 200, "TEST D: Creator logs in again (HTTP 200)");
    const newSessionToken = loginRes.body.token;

    const freshProfileRes = await makeRequest(
      server,
      { path: "/api/users/profile", method: "GET", headers: { Authorization: `Bearer ${newSessionToken}` } }
    );
    assert(freshProfileRes.status === 200, "TEST D: Fresh GET /api/users/profile succeeds");
    assert(freshProfileRes.body.data.name === "Alex Morgan Updated", "TEST D: Updated name persists across sessions");
    assert(freshProfileRes.body.data.title === "Senior Product Designer", "TEST D: Updated title persists across sessions");

    // TEST E: Security & Authorization checks
    console.log("\n--- TEST E: Security & unauthorized update rejection ---");
    // 1. Unauthenticated GET rejected
    const unauthGet = await makeRequest(server, { path: "/api/users/profile", method: "GET" });
    assert(unauthGet.status === 401, "TEST E: Unauthenticated GET rejected with HTTP 401");

    // 2. Unauthenticated PUT rejected
    const unauthPut = await makeRequest(
      server,
      { path: "/api/users/profile", method: "PUT" },
      { name: "Hacker Name" }
    );
    assert(unauthPut.status === 401, "TEST E: Unauthenticated PUT rejected with HTTP 401");

    // 3. User B cannot update User A's profile even if passing User A's ID
    const attackerEmail = `attacker_${ts}@craftloop.test`;
    const regAttacker = await makeRequest(
      server,
      { path: "/api/auth/register", method: "POST" },
      { name: "Attacker User", email: attackerEmail, password: "Password123!", role: "creator" }
    );
    const attackerToken = regAttacker.body.token;
    const attackerId = regAttacker.body.user.id || regAttacker.body.user._id;

    // Attacker tries to modify creator's profile by supplying creator's ID in body
    const spoofPut = await makeRequest(
      server,
      { path: "/api/users/profile", method: "PUT", headers: { Authorization: `Bearer ${attackerToken}` } },
      { _id: creatorId, id: creatorId, name: "Tampered Name" }
    );
    assert(spoofPut.status === 200, "TEST E: Request processed for authenticated user");
    // Confirm creator's document in MongoDB was NOT modified
    const creatorAfterAttack = await User.findById(creatorId).lean();
    assert(creatorAfterAttack.name === "Alex Morgan Updated", "TEST E: Creator's profile remains untouched by attacker");
    // Confirm attacker's document was updated with attacker's data
    const attackerDoc = await User.findById(attackerId).lean();
    assert(attackerDoc.name === "Tampered Name", "TEST E: Only attacker's own profile was modified");

    console.log("\n==================================================");
    console.log("ALL PHASE 13 PROFILE TESTS PASSED SUCCESSFULLY!");
    console.log("==================================================\n");

    // Cleanup created test users
    await User.deleteMany({ _id: { $in: [creatorId, attackerId] } });
  } finally {
    server.close();
  }
}

runPhase13Tests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
