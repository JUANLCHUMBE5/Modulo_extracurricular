import fs from "fs";
import path from "path";

// Recursively find all CSS files in a directory
function findCssFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== "node_modules" && file !== "dist" && !file.startsWith(".")) {
        findCssFiles(filePath, fileList);
      }
    } else if (filePath.endsWith(".css")) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

// Check if a color is a shade of green
function isGreenColor(colorStr) {
  const clean = colorStr.toLowerCase().trim();
  
  // Literal names
  if (clean.includes("green") || clean.includes("emerald") || clean.includes("teal") || clean.includes("lime") || clean.includes("olive") || clean.includes("forest")) {
    return true;
  }
  
  // Hex codes: #RRGGBB or #RGB or #RRGGBBAA
  const hexMatch = clean.match(/#([0-9a-f]{3,8})/);
  if (hexMatch) {
    const hex = hexMatch[1];
    let r, g, b;
    if (hex.length === 3 || hex.length === 4) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6 || hex.length === 8) {
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    } else {
      return false;
    }
    // Simple heuristic: Green component is significantly higher than red and blue,
    // or it falls in a green hue range.
    // Green range in RGB: Green is usually the dominant component, or it's a mix like teal (G & B high) or lime (R & G high).
    // Let's do a loose check: Green is at least 30-40% higher than red, or it's a prominent green.
    if (g > r && g > b) return true;
    // Also include some specific greens like success greens or teal/lime:
    if (g > 100 && r < 120 && b < 150 && (g - r > 20)) return true;
  }
  
  // RGB / RGBA: rgb(r, g, b)
  const rgbMatch = clean.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]);
    const g = parseInt(rgbMatch[2]);
    const b = parseInt(rgbMatch[3]);
    if (g > r && g > b) return true;
    if (g > 100 && r < 120 && b < 150 && (g - r > 20)) return true;
  }
  
  // HSL: hsl(h, s, l)
  // Green hue is typically between 80 and 160 degrees (lime to cyan/teal).
  const hslMatch = clean.match(/hsla?\((\d+)/);
  if (hslMatch) {
    const h = parseInt(hslMatch[1]);
    if (h >= 75 && h <= 170) return true;
  }

  return false;
}

async function run() {
  const cssFiles = findCssFiles(".");
  console.log(`Found ${cssFiles.length} CSS files.`);
  
  const greenColors = {};
  
  cssFiles.forEach(filePath => {
    const content = fs.readFileSync(filePath, "utf8");
    // Find color declarations in CSS (e.g. background-color: ..., color: ..., border: ..., etc.)
    // Matches expressions after a colon and before a semicolon/closing brace
    const matches = content.match(/:\s*([^;}\n]+)/g);
    if (matches) {
      matches.forEach(match => {
        const value = match.substring(1).trim();
        // Look for colors like #fff, rgb(...), hsl(...), variable calls, or names
        // Let's extract any potential color tokens
        const tokens = value.split(/\s+/);
        tokens.forEach(token => {
          if (token.startsWith("#") || token.startsWith("rgb") || token.startsWith("hsl") || token.includes("green") || token.includes("teal") || token.includes("emerald") || token.includes("lime")) {
            const cleanToken = token.replace(/[,;()]/g, "").trim();
            if (isGreenColor(token)) {
              if (!greenColors[cleanToken]) {
                greenColors[cleanToken] = [];
              }
              const relativePath = path.relative(".", filePath);
              if (!greenColors[cleanToken].includes(relativePath)) {
                greenColors[cleanToken].push(relativePath);
              }
            }
          }
        });
      });
    }
  });

  console.log("=== GREEN COLORS DETECTED ===");
  console.log(JSON.stringify(greenColors, null, 2));
}

run();
