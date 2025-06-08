#!/usr/bin/env node

/**
 * Simple Express server for AQUA Trust Chains Generator
 * Serves static files and provides API endpoint for saving chains to output folder
 */

import express from 'express';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));

// CORS middleware to allow requests from Vite dev server
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

app.use(express.static(__dirname));

// Ensure output directory exists
const outputDir = join(__dirname, 'output');
if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
    console.log('Created output directory:', outputDir);
}

// API endpoint to save chain files
app.post('/api/save-chain', (req, res) => {
    try {
        const { filename, data } = req.body;
        
        if (!filename || !data) {
            return res.status(400).json({ 
                error: 'Missing filename or data',
                received: { filename: !!filename, data: !!data }
            });
        }
        
        // Validate filename
        if (!filename.endsWith('.aqua.json') && !filename.endsWith('.json')) {
            return res.status(400).json({ 
                error: 'Filename must end with .aqua.json or .json' 
            });
        }
        
        // Ensure filename is safe (no path traversal)
        const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filepath = join(outputDir, safeName);
        
        // Write the file
        const jsonContent = JSON.stringify(data, null, 2);
        writeFileSync(filepath, jsonContent, 'utf8');
        
        console.log(`File saved: ${filepath} (${jsonContent.length} bytes)`);
        
        // Only log metadata if it exists (for AQUA files)
        if (data.metadata) {
            console.log(`Chain type: ${data.metadata.type || 'unknown'}`);
            console.log(`Issuer: ${data.metadata.issuer || 'unknown'}`);
        } else if (data.formType) {
            console.log(`Form type: ${data.formType}`);
            console.log(`Wallet: ${data.rootWallet || data.issuerWallet || 'unknown'}`);
        }
        
        res.json({
            success: true,
            filename: safeName,
            filepath: filepath,
            size: jsonContent.length,
            type: data.metadata?.type || data.formType || 'input_data'
        });
        
    } catch (error) {
        console.error('Error saving chain file:', error);
        res.status(500).json({ 
            error: 'Failed to save chain file',
            details: error.message 
        });
    }
});

// API endpoint to list saved chains
app.get('/api/chains', async (req, res) => {
    try {
        const fs = await import('fs');
        const files = fs.readdirSync(outputDir)
            .filter(file => file.endsWith('.aqua.json') || file.endsWith('.json'))
            .map(file => ({
                filename: file,
                path: join(outputDir, file),
                stats: fs.statSync(join(outputDir, file))
            }));
        
        res.json({
            success: true,
            count: files.length,
            files: files.map(f => ({
                filename: f.filename,
                size: f.stats.size,
                created: f.stats.mtime
            }))
        });
        
    } catch (error) {
        console.error('Error listing chains:', error);
        res.status(500).json({ 
            error: 'Failed to list chains',
            details: error.message 
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        server: 'AQUA Trust Chains Generator',
        version: '1.0.0',
        outputDir: outputDir,
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 AQUA Trust Chains Generator Server`);
    console.log(`📡 Server running on http://localhost:${PORT}`);
    console.log(`📁 Output directory: ${outputDir}`);
    console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📋 List chains: http://localhost:${PORT}/api/chains`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    process.exit(0);
});

export default app;