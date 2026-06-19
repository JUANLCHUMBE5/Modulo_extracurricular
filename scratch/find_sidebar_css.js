import fs from "fs";
import path from "path";

// Recursively find files matching patterns
function searchFiles(dir, matchFunc, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== "node_modules" && file !== "dist" && !file.startsWith(".")) {
        searchFiles(filePath, matchFunc, fileList);
      }
    } else if (matchFunc(filePath)) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

async function run() {
  const files = searchFiles(".", (p) => p.endsWith(".css") || p.endsWith(".jsx"));
  console.log(`Searching through ${files.length} source files...`);

  const results = [];
  files.forEach((filePath) => {
    const content = fs.readFileSync(filePath, "utf8");
    if (content.toLowerCase().includes("sidebar") || content.toLowerCase().includes("aside") || content.toLowerCase().includes("drawer")) {
      results.push({
        path: filePath,
        matches: []
      });
      // Extract matching lines
      const lines = content.split("\n");
      lines.forEach((line, idx) => {
        if (line.toLowerCase().includes("sidebar") || line.toLowerCase().includes("aside") || line.toLowerCase().includes("drawer")) {
          results[results.length - 1].matches.push({
            lineNum: idx + 1,
            text: line.trim()
          });
        }
      });
    }
  });

  console.log("=== FILES WITH SIDEBAR/ASIDE/DRAWER ===");
  results.forEach(res => {
    if (res.matches.length > 0) {
      console.log(`\nFile: ${res.path} (${res.matches.length} matches)`);
      // Print first 5 matches
      res.matches.slice(0, 5).forEach(m => {
        console.log(`  Line ${m.lineNum}: ${m.text}`);
      });
    }
  });
}

run();
