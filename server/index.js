import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { PDFParse } from 'pdf-parse';
const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
app.post('/api/import-pdf', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Please choose a PDF file.' });
  try {
    const parser = new PDFParse({ data: req.file.buffer });
    const { text } = await parser.getText();
    await parser.destroy();
    res.json({ text });
  } catch { res.status(422).json({ error: 'This PDF could not be read. Try pasting its copied text.' }); }
});
app.use((error, _req, res, _next) => res.status(400).json({ error: error.message || 'The uploaded PDF could not be processed.' }));
app.use(express.static(root));
app.get('/{*splat}', (_, res) => res.sendFile(path.join(root, 'index.html')));
app.listen(process.env.PORT || 3000, () => console.log('Quiz server ready'));
