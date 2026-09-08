import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { ResearchObject, ResearchSandbox, diffReport } from './sandbox.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// API health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    name: 'LAR-OS | Frontier Scientific Research Portfolio',
    timestamp: new Date().toISOString(),
  });
});

// Load research corpus
app.get('/api/corpus', (req, res) => {
  try {
    const corpusPath = path.join(__dirname, 'example_corpus.json');
    if (fs.existsSync(corpusPath)) {
      const data = JSON.parse(fs.readFileSync(corpusPath, 'utf8'));
      return res.json(data);
    }
    return res.status(404).json({ error: 'Corpus file not found' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Full audit report on corpus
app.get('/api/corpus/report', (req, res) => {
  try {
    const corpusPath = path.join(__dirname, 'example_corpus.json');
    if (fs.existsSync(corpusPath)) {
      const data = JSON.parse(fs.readFileSync(corpusPath, 'utf8'));
      const sandbox = new ResearchSandbox(data.objects || []);
      return res.json(sandbox.fullReport());
    }
    return res.status(404).json({ error: 'Corpus file not found' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Structural audit of an individual object
app.post('/api/audit', (req, res) => {
  try {
    const item = req.body;
    const obj = new ResearchObject(item);
    return res.json({
      id: obj.id,
      order1_pass: obj.order1Pass(),
      order2_pass: obj.order2Pass(),
      third_break_boundary_risk: obj.thirdBreakBoundaryRisk(),
      flags: obj.flags(),
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// Diff two research object codings
app.post('/api/diff', (req, res) => {
  try {
    const { a, b } = req.body;
    if (!a || !b) {
      return res.status(400).json({ error: "Both 'a' and 'b' objects are required" });
    }
    const report = diffReport(a, b);
    return res.json(report);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// Serve static assets from project root
app.use(express.static(__dirname));

// Single-page application fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`LAR-OS server running on http://0.0.0.0:${PORT}`);
});
