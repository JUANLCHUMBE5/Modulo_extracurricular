const commitMessage = process.env.VERCEL_GIT_COMMIT_MESSAGE || "";
const commitRef = process.env.VERCEL_GIT_COMMIT_REF || "";
const shouldDeploy =
  /\[(deploy|vercel|nube)\]/i.test(commitMessage) ||
  commitRef === "deploy" ||
  commitRef === "piloto";

if (shouldDeploy) {
  console.log("Vercel: build permitido para este cambio.");
  process.exit(1);
}

console.log("Vercel: build omitido. Usa [deploy], [vercel] o [nube] en el commit para desplegar.");
process.exit(0);
