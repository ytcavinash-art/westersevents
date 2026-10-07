// CommonJS entry for cPanel / Passenger. The backend modules use ESM.
process.chdir(__dirname);
process.env.BACKEND_ONLY = 'true';
import('./src/server.js').catch(error => { console.error(error); process.exitCode = 1; });
