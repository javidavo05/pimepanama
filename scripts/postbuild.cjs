const fs = require("fs");
const path = require("path");

function ensureAdminProtectedManifest() {
  const root = process.cwd();
  const serverAppDir = path.join(root, ".next", "server", "app");
  const adminDir = path.join(serverAppDir, "(admin)", "admin");
  const protectedDir = path.join(adminDir, "(protected)");

  const source = path.join(adminDir, "page_client-reference-manifest.js");
  const target = path.join(protectedDir, "page_client-reference-manifest.js");

  if (!fs.existsSync(source)) {
    return;
  }

  if (!fs.existsSync(protectedDir)) {
    return;
  }

  try {
    fs.copyFileSync(source, target);
  } catch (error) {
    console.error("Failed to copy admin client reference manifest:", error);
    process.exitCode = 1;
  }
}

ensureAdminProtectedManifest();

