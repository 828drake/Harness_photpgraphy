# Run Harness Photography in Microsoft Visual Studio (not Visual Studio Code)

This repository includes `HarnessPhotography.sln`, `HarnessPhotography.esproj`, and `.vscode/launch.json` so you can use **the green Start button** in Microsoft Visual Studio 2022/2026. The `.vscode` folder name is the launch configuration convention used by Visual Studio's JavaScript project system; you do **not** need to use Visual Studio Code.

## One-time setup

1. Ensure Node.js 20 or newer is installed. Check `node --version` in a terminal if unsure.
2. In **Visual Studio Installer** (or **Tools > Get Tools and Features**), select the **Node.js development** workload and apply the changes. Restart Visual Studio afterward.
3. In Visual Studio, open your existing clone of this GitHub repository and select **Git > Pull**.
4. Choose **File > Open > Project/Solution** and select `HarnessPhotography.sln` in your local repository. If Visual Studio requests an SDK restore, let it restore the JavaScript project system SDK (internet required the first time).
5. Right-click **Harness Photography** in Solution Explorer and choose **Set as Startup Project** if it's not already selected.
6. Create a local private `.env` file by copying `.env.example`. At minimum, set a strong `ADMIN_PASSWORD` and random `SESSION_SECRET`. Keep `.env` out of Git.
7. In the debug dropdown, select **Harness Photography — Start website and browser**, then click the green **Start (F5)** button. This starts `node server.mjs` and opens Edge at `http://localhost:3000`.

For a server-only launch, select **Harness Photography — Node server** and open `http://localhost:3000` manually. For a simpler run without debugging, use **Ctrl+F5**. The command defined in the project is **`node server.mjs`**, which avoids PowerShell's `npm.ps1` execution policy issue.

## Troubleshooting

- If Visual Studio says the JavaScript project type isn't supported, use Visual Studio Installer to install **Node.js development**.
- If `localhost:3000` is already in use, stop other Node processes started in previous terminal windows, or change `PORT` in your local `.env` and the browser URL in `.vscode/launch.json` to match.
- If the browser starts before the server is ready, refresh the page.
- If a green Start button or JavaScript debug profiles aren't available, reopen `HarnessPhotography.sln` (not only the folder), set the startup project, and confirm the Node.js workload is installed.
- Booking notifications need valid SMTP settings in local `.env`. The frontend and Node.js server both run locally, but external visitors cannot access your localhost.
- The site's upload and booking data are saved locally under `public/uploads` and `data/site.json` and won't automatically sync to Git.

## Files

- `HarnessPhotography.sln`: Visual Studio solution.
- `HarnessPhotography.esproj`: Node.js JavaScript project; starts existing `server.mjs`.
- `.vscode/launch.json`: Visual Studio JavaScript debugging profiles.
- `server.mjs`: existing live website / booking / gallery / admin backend.

This is not an ASP.NET application and does not require IIS Express. Visual Studio will run the existing Node.js server directly.
