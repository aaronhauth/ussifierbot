import express from 'express';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
router.get('/', (req, res, next) => {
    if (!req.query?.code) {
        next();
        return;
    }

    console.log('you are here');
    
    res.setHeader('Content-Type', 'text/html');
    res.send('WOAH! You made it!');
  });

router.get('/', (req, res) => {
    console.log('you are here');
    res.setHeader('Content-Type', 'text/html');
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });

export default router;