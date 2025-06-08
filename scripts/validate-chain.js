#!/usr/bin/env node

/**
 * Validation script for AQUA trust chains
 * Uses the aqua-js CLI for validation
 */

import { execSync } from 'child_process';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const AQUA_CLI_PATH = '\\wsl.localhost\\Ubuntu\\home\\system-001\\aqua-js-cli\\dist\\aqua.js';

class ChainValidator {
    constructor() {
        this.validationResults = [];
    }

    async validateChainFile(filePath) {
        try {
            console.log(`\n=== Validating: ${filePath} ===`);
            
            // Read and parse the chain file
            const chainContent = readFileSync(filePath, 'utf8');
            const chain = JSON.parse(chainContent);
            
            // Display chain info (handle new AQUA format)
            if (chain.revisions && typeof chain.revisions === 'object') {
                const revisionCount = Object.keys(chain.revisions).length;
                const firstRevision = Object.values(chain.revisions)[0];
                const chainType = firstRevision?.forms_formType || 'unknown';
                const issuer = firstRevision?.forms_rootWallet || firstRevision?.forms_issuer || 'unknown';
                
                console.log(`Chain Type: ${chainType}`);
                console.log(`Issuer: ${issuer}`);
                console.log(`Revisions: ${revisionCount}`);
                console.log(`Latest Hash: ${chain.treeMapping?.latestHash || 'unknown'}`);
            } else {
                // Fallback for old format
                console.log(`Chain Type: ${chain.metadata?.type || 'unknown'}`);
                console.log(`Issuer: ${chain.metadata?.issuer || 'unknown'}`);
                console.log(`Subject: ${chain.metadata?.subject || 'unknown'}`);
                console.log(`Revisions: ${chain.revisions?.length || 0}`);
            }
            
            // Run aqua.js validation
            const command = `node "${AQUA_CLI_PATH}" verify "${filePath}"`;
            console.log(`\nRunning: ${command}`);
            
            try {
                const output = execSync(command, { 
                    encoding: 'utf8',
                    stdio: 'pipe'
                });
                
                console.log('✅ VALIDATION PASSED');
                console.log('Output:', output);
                
                this.validationResults.push({
                    file: filePath,
                    status: 'PASSED',
                    output: output.trim()
                });
                
            } catch (error) {
                console.log('❌ VALIDATION FAILED');
                console.log('Error:', error.message);
                console.log('Stderr:', error.stderr?.toString() || 'No stderr');
                console.log('Stdout:', error.stdout?.toString() || 'No stdout');
                
                this.validationResults.push({
                    file: filePath,
                    status: 'FAILED',
                    error: error.message,
                    stderr: error.stderr?.toString(),
                    stdout: error.stdout?.toString()
                });
            }
            
        } catch (error) {
            console.error(`Error validating ${filePath}:`, error.message);
            this.validationResults.push({
                file: filePath,
                status: 'ERROR',
                error: error.message
            });
        }
    }

    async validateAllChains() {
        const outputDir = './output';
        
        try {
            const files = readdirSync(outputDir)
                .filter(file => file.endsWith('.aqua.json'))
                .map(file => join(outputDir, file));
            
            if (files.length === 0) {
                console.log('No .aqua.json files found in ./output directory');
                return;
            }
            
            console.log(`Found ${files.length} chain files to validate:`);
            files.forEach(file => console.log(`  - ${file}`));
            
            for (const file of files) {
                await this.validateChainFile(file);
            }
            
            this.printSummary();
            
        } catch (error) {
            console.error('Error reading output directory:', error.message);
        }
    }

    printSummary() {
        console.log('\n' + '='.repeat(50));
        console.log('VALIDATION SUMMARY');
        console.log('='.repeat(50));
        
        const passed = this.validationResults.filter(r => r.status === 'PASSED').length;
        const failed = this.validationResults.filter(r => r.status === 'FAILED').length;
        const errors = this.validationResults.filter(r => r.status === 'ERROR').length;
        
        console.log(`Total files: ${this.validationResults.length}`);
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`⚠️  Errors: ${errors}`);
        
        if (failed > 0 || errors > 0) {
            console.log('\nFailed/Error Details:');
            this.validationResults
                .filter(r => r.status !== 'PASSED')
                .forEach(result => {
                    console.log(`\n${result.file}: ${result.status}`);
                    if (result.error) console.log(`  Error: ${result.error}`);
                    if (result.stderr) console.log(`  Stderr: ${result.stderr}`);
                });
        }
    }

    async validateSpecificChain(chainPath) {
        await this.validateChainFile(chainPath);
        this.printSummary();
    }
}

// Main execution
async function main() {
    const validator = new ChainValidator();
    
    const args = process.argv.slice(2);
    
    if (args.length > 0) {
        // Validate specific file
        const chainPath = args[0];
        console.log(`Validating specific chain: ${chainPath}`);
        await validator.validateSpecificChain(chainPath);
    } else {
        // Validate all chains in output directory
        console.log('Validating all chains in ./output directory...');
        await validator.validateAllChains();
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export default ChainValidator;