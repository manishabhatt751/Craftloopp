const dotenv = require("dotenv");
dotenv.config();

const mongoose = require("mongoose");
const http = require("http");
const app = require("./server");
const { User, CommunityPost } = require("./models");

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

async function runPhase12Tests() {
  console.log("\n==================================================");
  console.log("PHASE 12 COMMUNITY LIVE INTEGRATION TEST");
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
    // 1. Register Creator
    const creatorEmail = `creator_p12_${ts}@craftloop.test`;
    const regCreator = await makeRequest(
      server,
      { path: "/api/auth/register", method: "POST" },
      { name: "Creator Community Test", email: creatorEmail, password: "Password123!", role: "creator" }
    );
    assert(regCreator.status === 201, "1. Creator registered successfully (HTTP 201)");
    const creatorToken = regCreator.body.token;
    const creatorId = regCreator.body.user.id || regCreator.body.user._id;

    // 2. Register Viewer
    const viewerEmail = `viewer_p12_${ts}@craftloop.test`;
    const regViewer = await makeRequest(
      server,
      { path: "/api/auth/register", method: "POST" },
      { name: "Viewer Community Test", email: viewerEmail, password: "Password123!", role: "viewer" }
    );
    assert(regViewer.status === 201, "2. Viewer registered successfully (HTTP 201)");
    const viewerToken = regViewer.body.token;
    const viewerId = regViewer.body.user.id || regViewer.body.user._id;

    // TEST A: Creator creates post: "CraftLoop community test post"
    console.log("\n--- TEST A: Creator creates community post ---");
    const createPostRes = await makeRequest(
      server,
      { path: "/api/community/posts", method: "POST", headers: { Authorization: `Bearer ${creatorToken}` } },
      {
        content: "CraftLoop community test post",
        category: "Design",
        tags: ["Design", "Test"],
        image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      }
    );
    assert(createPostRes.status === 201, "TEST A: POST /api/community/posts creates post (HTTP 201)");
    assert(createPostRes.body.data.content === "CraftLoop community test post", "TEST A: Content matches 'CraftLoop community test post'");
    assert(Boolean(createPostRes.body.data.image), "TEST A: Image attachment persisted in MongoDB");
    const postId = createPostRes.body.data._id;

    // Verify directly in MongoDB Atlas collection
    const mongoDoc = await CommunityPost.findById(postId);
    assert(mongoDoc !== null, "STEP 15: Post verified directly in MongoDB Atlas communityposts collection");
    assert(mongoDoc.content === "CraftLoop community test post", "STEP 15: MongoDB content strictly verified");

    // Refresh simulation (GET /api/community/posts)
    const listPostsCreator = await makeRequest(server, { path: "/api/community/posts", method: "GET" });
    assert(listPostsCreator.status === 200, "TEST A: GET /api/community/posts returns HTTP 200");
    const foundInCreatorList = listPostsCreator.body.data.some((p) => p._id === postId);
    assert(foundInCreatorList, "TEST A: Post still appears when refreshed in Creator Community");

    // TEST B: Viewer opens Community and sees the same post
    console.log("\n--- TEST B: Viewer sees Creator post ---");
    const listPostsViewer = await makeRequest(
      server,
      { path: "/api/community/posts", method: "GET", headers: { Authorization: `Bearer ${viewerToken}` } }
    );
    assert(listPostsViewer.status === 200, "TEST B: Viewer GET /api/community/posts returns 200");
    const foundInViewerList = listPostsViewer.body.data.find((p) => p._id === postId);
    assert(Boolean(foundInViewerList), "TEST B: Creator's post is visible in Viewer Community");
    assert(foundInViewerList.content === "CraftLoop community test post", "TEST B: Viewer sees exact matching content");

    // TEST C: Viewer comments on the post
    console.log("\n--- TEST C: Viewer comments on the post ---");
    const commentRes = await makeRequest(
      server,
      { path: `/api/community/posts/${postId}/comments`, method: "POST", headers: { Authorization: `Bearer ${viewerToken}` } },
      { text: "Great test post from the viewer!" }
    );
    assert(commentRes.status === 201, "TEST C: Viewer adds comment (HTTP 201)");
    assert(commentRes.body.data.comments.length === 1, "TEST C: Post has 1 comment in response");

    // Creator refreshes Community and sees the comment
    const creatorRefreshComment = await makeRequest(server, { path: "/api/community/posts", method: "GET" });
    const postWithComment = creatorRefreshComment.body.data.find((p) => p._id === postId);
    assert(postWithComment.comments.length === 1, "TEST C: Creator refreshes and sees 1 comment");
    assert(postWithComment.comments[0].text === "Great test post from the viewer!", "TEST C: Comment text verified");

    // TEST D: Viewer likes the post
    console.log("\n--- TEST D: Viewer likes the post ---");
    const likeRes = await makeRequest(
      server,
      { path: `/api/community/posts/${postId}/like`, method: "POST", headers: { Authorization: `Bearer ${viewerToken}` } }
    );
    assert(likeRes.status === 200, "TEST D: Viewer likes post (HTTP 200)");
    assert(likeRes.body.liked === true, "TEST D: Response shows liked: true");
    assert(likeRes.body.likesCount === 1, "TEST D: Response shows likesCount: 1");

    // Creator refreshes and checks like count
    const creatorRefreshLike = await makeRequest(server, { path: "/api/community/posts", method: "GET" });
    const postWithLike = creatorRefreshLike.body.data.find((p) => p._id === postId);
    assert(postWithLike.likes.length === 1, "TEST D: Creator refreshes and verifies like count is 1");

    // TEST F: Viewer tries to delete Creator's post (must be rejected)
    console.log("\n--- TEST F: Viewer unauthorized delete rejected ---");
    const unauthDeleteRes = await makeRequest(
      server,
      { path: `/api/community/posts/${postId}`, method: "DELETE", headers: { Authorization: `Bearer ${viewerToken}` } }
    );
    assert(unauthDeleteRes.status === 403, "TEST F: Backend rejects unauthorized delete with HTTP 403 Forbidden");

    // TEST E: Creator deletes own post
    console.log("\n--- TEST E: Creator deletes own post ---");
    const authDeleteRes = await makeRequest(
      server,
      { path: `/api/community/posts/${postId}`, method: "DELETE", headers: { Authorization: `Bearer ${creatorToken}` } }
    );
    assert(authDeleteRes.status === 200, "TEST E: Creator deletes own post (HTTP 200 OK)");

    // Refresh Creator community -> post is gone
    const checkCreatorAfterDelete = await makeRequest(server, { path: "/api/community/posts", method: "GET" });
    const existsCreator = checkCreatorAfterDelete.body.data.some((p) => p._id === postId);
    assert(!existsCreator, "TEST E: Post is gone from Creator Community");

    // Refresh Viewer community -> post is also gone
    const checkViewerAfterDelete = await makeRequest(server, { path: "/api/community/posts", method: "GET" });
    const existsViewer = checkViewerAfterDelete.body.data.some((p) => p._id === postId);
    assert(!existsViewer, "TEST E: Post is gone from Viewer Community");

    // Verify deleted in MongoDB Atlas
    const mongoDocAfterDelete = await CommunityPost.findById(postId);
    assert(mongoDocAfterDelete === null, "STEP 15: Post deletion verified in MongoDB Atlas database");

    console.log("\n==================================================");
    console.log("ALL PHASE 12 COMMUNITY TESTS PASSED SUCCESSFULLY!");
    console.log("==================================================\n");

    // Cleanup created users
    await User.deleteMany({ _id: { $in: [creatorId, viewerId] } });
  } finally {
    server.close();
  }
}

runPhase12Tests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
