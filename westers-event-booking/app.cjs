// cPanel/Passenger-compatible startup entry; use Node 24+.
process.chdir(__dirname);
import('./src/server.js').catch(error => { console.error(error); process.exitCode = 1; });
