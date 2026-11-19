import express from 'express';
import path from 'node:path';

const port = Number(process.env.PORT);
const site = process.env.SITE_BUILD;
if (!Number.isInteger(port) || port < 1 || !['app', 'marketing'].includes(site)) {
  throw new Error('Set PORT and SITE_BUILD (app or marketing).');
}

const directory = path.resolve(site === 'marketing' ? 'dist-marketing' : 'dist');
const app = express();
app.use(express.static(directory, { index: false }));
app.get('/{*path}', (_req, res) => res.sendFile(path.join(directory, 'index.html')));
app.listen(port, '0.0.0.0');
