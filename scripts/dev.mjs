import { createServer } from 'vite';
import { spawn } from 'child_process';
import electron from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startDev() {
  // Start Vite server
  const server = await createServer({
    configFile: path.join(__dirname, '..', 'vite.config.mjs'),
    mode: 'development',
  });
  
  await server.listen();
  server.printUrls();

  // Start Electron
  const electronProcess = spawn(electron, ['.'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      APP_ENV: 'dev' // Sinaliza para o index.js que estamos em dev
    }
  });

  electronProcess.on('close', () => {
    server.close();
    process.exit();
  });
}

startDev();
