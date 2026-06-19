import fs from "fs";

const content = fs.readFileSync("./server/excelApi.js", "utf8");
const lines = content.split("\n");

lines.forEach((line, idx) => {
  if (line.includes("saveDb")) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
