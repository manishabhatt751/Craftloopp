require("dotenv").config();
const http = require("http");
const mongoose = require("mongoose");
const { connectDB } = require("./config/db");
const app = require("./server");

let server;
let baseUrl;

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const parsed = body ? JSON.parse(body) : null;
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, raw: body, headers: res.headers });
        }
      });
    });
    req.on("error", reject);
    if (data) req.write(typeof data === "string" ? data : JSON.stringify(data));
    req.end();
  });
}

function post(endpoint, data, token = null) {
  const url = new URL(endpoint, baseUrl);
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return request({
    hostname: url.hostname,
    port: url.port,
    path: url.pathname,
    method: "POST",
    headers,
  }, data);
}

function get(endpoint, token = null) {
  const url = new URL(endpoint, baseUrl);
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return request({
    hostname: url.hostname,
    port: url.port,
    path: url.pathname,
    method: "GET",
    headers,
  });
}

async function runTests() {
  console.log("\n==================================================");
  console.log("TESTING: CRAFTLOOP PROJECT COPY LINK & COMMUNITY SHARING");
  console.log("==================================================\n");

  await connectDB();
  server = http.createServer(app);
  await new Promise((resolve) => {
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      console.log(`Test server running at ${baseUrl}\n`);
      resolve();
    });
  });

  try {
    const timestamp = Date.now();

    // 1. Register Creator A
    const creatorARes = await post("/api/auth/register", {
      name: "Creator Alpha",
      email: `creator_alpha_${timestamp}@example.com`,
      password: "Password123!",
      role: "creator",
    });
    if (creatorARes.status !== 201) throw new Error("Creator A registration failed");
    const tokenA = creatorARes.data.token;
    console.log("✅ PASS: 1. Creator Alpha registered successfully");

    // 2. Register Creator B (Attacker)
    const creatorBRes = await post("/api/auth/register", {
      name: "Creator Beta",
      email: `creator_beta_${timestamp}@example.com`,
      password: "Password123!",
      role: "creator",
    });
    if (creatorBRes.status !== 201) throw new Error("Creator B registration failed");
    const tokenB = creatorBRes.data.token;
    console.log("✅ PASS: 2. Creator Beta registered successfully");

    // 3. Creator A creates a Project
    const projRes = await post("/api/projects", {
      title: "Brand Identity & Typography Poster",
      description: "A complete promotional poster designed with typography rules.",
      category: "Graphic Design",
      image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
      status: "Published",
      skills: "Typography, Layout, Color Theory",
      tags: ["Typography", "Poster", "Design"],
    }, tokenA);
    if (projRes.status !== 201 || !projRes.data?.data?._id) {
      throw new Error(`Failed to create project: ${JSON.stringify(projRes.data)}`);
    }
    const projectId = projRes.data.data._id;
    console.log(`✅ PASS: 3. Creator Alpha created project (ID: ${projectId})`);

    // 4. Test GET /api/projects/:id
    const getProjRes = await get(`/api/projects/${projectId}`);
    if (getProjRes.status !== 200 || getProjRes.data?.data?.title !== "Brand Identity & Typography Poster") {
      throw new Error("Failed to fetch project details");
    }
    console.log("✅ PASS: 4. GET /api/projects/:id returns correct project details");

    // 5. Creator B tries to share Creator A's project (should be 403 Forbidden)
    const unauthorizedShareRes = await post("/api/community/posts", {
      content: "I am trying to claim and share someone else's project!",
      projectId: projectId,
      projectUrl: `/project/${projectId}`,
      postType: "project",
    }, tokenB);

    if (unauthorizedShareRes.status !== 403) {
      throw new Error(`Expected 403 for unauthorized project share, got ${unauthorizedShareRes.status}`);
    }
    console.log("✅ PASS: 5. Security: Unauthorized user cannot share another creator's project (403 Forbidden)");

    // 6. Creator A shares their own project to Community
    const shareRes = await post("/api/community/posts", {
      content: "I created this poster while practicing graphic design. Would love your feedback!",
      projectId: projectId,
      projectUrl: `/project/${projectId}`,
      postType: "project",
      category: "Graphic Design",
      tags: ["Graphic Design", "Typography"],
      image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
    }, tokenA);

    if (shareRes.status !== 201 || !shareRes.data?.data?._id) {
      throw new Error(`Failed to share project to community: ${JSON.stringify(shareRes.data)}`);
    }
    const communityPostId = shareRes.data.data._id;
    console.log(`✅ PASS: 6. Creator Alpha shared project to Community (Post ID: ${communityPostId})`);

    // 7. Verify Community Post in GET /api/community/posts
    const communityPostsRes = await get("/api/community/posts");
    if (communityPostsRes.status !== 200 || !Array.isArray(communityPostsRes.data?.data)) {
      throw new Error("Failed to retrieve community posts");
    }
    const foundPost = communityPostsRes.data.data.find((p) => p._id === communityPostId);
    if (!foundPost) {
      throw new Error("Newly shared project post not found in community feed");
    }
    if (foundPost.postType !== "project") {
      throw new Error(`Expected postType to be 'project', got '${foundPost.postType}'`);
    }
    if (!foundPost.projectId || foundPost.projectId.title !== "Brand Identity & Typography Poster") {
      throw new Error("Project details not populated in community post");
    }
    console.log("✅ PASS: 7. Community feed contains shared project post with populated project details");

    // 8. Creator B views the shared project details via the project link
    const viewerGetProjRes = await get(`/api/projects/${foundPost.projectId._id}`, tokenB);
    if (viewerGetProjRes.status !== 200) {
      throw new Error("Viewer/Creator B failed to open shared project");
    }
    console.log("✅ PASS: 8. Another user successfully opened project details from shared link");

    // 9. Verify standard text-only community posts still work
    const textPostRes = await post("/api/community/posts", {
      content: "Hello CraftLoop Community! Having a great day learning new skills.",
      category: "Discussion",
      tags: ["General"],
    }, tokenB);

    if (textPostRes.status !== 201 || textPostRes.data?.data?.postType !== "text") {
      throw new Error("Standard text-only community post failed");
    }
    console.log("✅ PASS: 9. Standard text-only community posts continue to work without regression");

    // 10. Non-existent projectId handling
    const nonExistentProjRes = await post("/api/community/posts", {
      content: "Fake project sharing",
      projectId: new mongoose.Types.ObjectId().toString(),
    }, tokenA);

    if (nonExistentProjRes.status !== 404) {
      throw new Error(`Expected 404 for non-existent project share, got ${nonExistentProjRes.status}`);
    }
    console.log("✅ PASS: 10. Non-existent project rejected with 404 Not Found");

    console.log("\n==================================================");
    console.log("ALL PROJECT SHARING & COPY LINK TESTS PASSED! 🎉");
    console.log("==================================================\n");
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
