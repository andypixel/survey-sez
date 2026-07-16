#!/usr/bin/env node
const { execSync } = require('child_process');

const PORTS = [3000, 3001];

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function killPort(port) {
  try {
    if (process.platform === 'win32') {
      const output = execSync(`netstat -ano -p tcp | findstr :${port}`, { encoding: 'utf8' });
      const pids = new Set(
        output
          .trim()
          .split('\n')
          .map((line) => line.trim().split(/\s+/).pop())
          .filter((pid) => pid && pid !== '0')
      );
      for (const pid of pids) {
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
        } catch {
          // Process already gone
        }
      }
    } else {
      execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: 'ignore' });
    }
  } catch {
    // Nothing listening on this port
  }
}

console.log('Killing existing server processes...');
for (const port of PORTS) killPort(port);
sleepSync(1000);
console.log('Server processes killed.');
