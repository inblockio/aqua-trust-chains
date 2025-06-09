// AQUA Trust Chain Generator
// Implementation based on AQUA Protocol v3 schema and architecture document

// Use global ethers from CDN instead of import
// import { ethers } from 'https://cdn.skypack.dev/ethers@6.8.0';
import Aquafier, { getGenesisHash } from "aqua-js-sdk";
class TrustChainGenerator {
    constructor() {
        this.generatedChains = [];
        this.dnsRegistry = new DNSRegistry();
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        document.getElementById('rootForm').addEventListener('submit', (e) => {
            e.preventDefault();
            // this.generateRootTrustAnchor();
            this.generateRootTrustAnchorWithSDK();
        });

        document.getElementById('intermediateForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.generateIntermediateDelegate();
        });

        document.getElementById('endEntityForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.generateEndEntity();
        });

        document.getElementById('revocationForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.generateRevocation();
        });

        document.getElementById('validateForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.validateChain();
        });
    }

    generateTimestamp() {
        // Generate UTC timestamp in ISO format as required by AQUA protocol v3
        return new Date().toISOString();
    }

    generateUnixTimestamp() {
        return Math.floor(Date.now() / 1000);
    }

    generateNonce() {
        return ethers.utils.hexlify(ethers.utils.randomBytes(32));
    }

    async generateHash(data) {
        const encoder = new TextEncoder();
        let dataString;
        if (typeof data === 'string') {
            dataString = data;
        } else {
            // For objects, use deterministic JSON without whitespace
            dataString = JSON.stringify(data, Object.keys(data).sort());
        }
        const dataBuffer = encoder.encode(dataString);
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
        return ethers.utils.hexlify(new Uint8Array(hashBuffer));
    }

    async signMessage(message, privateKey) {
        try {
            const wallet = new ethers.Wallet(privateKey);
            const messageBytes = ethers.utils.toUtf8Bytes(message);
            const signature = await wallet.signMessage(messageBytes);
            return {
                signature,
                publicKey: wallet.publicKey,
                address: wallet.address
            };
        } catch (error) {
            throw new Error(`Signing failed: ${error.message}`);
        }
    }

    async generateRootTrustAnchorWithSDK() {
        try {
            const walletAddress = document.getElementById('rootWallet').value;
            const privateKey = "";//document.getElementById('rootPrivateKey').value;
            const domain = document.getElementById('rootDomain').value;
            const validityStart = document.getElementById('rootValidityStart').value;
            const validityEnd = document.getElementById('rootValidityEnd').value;


            const aquafier = new Aquafier();
            const formData = {



                formType: "root_trust_anchor",
                rootWallet: walletAddress,
                // rootPrivateKey: privateKey,
                rootDomain: domain,
                rootValidityStart: validityStart,
                rootValidityEnd: validityEnd,
                rootDelegation: document.getElementById('rootDelegation').checked,
                rootAuthentication: document.getElementById('rootAuthentication').checked,
                rootSigning: document.getElementById('rootSigning').checked

            }

            let name ="root-trust-anchor"
            let fileObject = {
                fileName: `${name}.json`, // Use a meaningful name for the file",
                fileContent: JSON.stringify(formData, null, 4), // Use pretty print for better readability
                path: `./output/root-trust-anchor.json`, // not needed for browser
                fileSize: 0,

            }
            let response = await aquafier.createGenesisRevision(fileObject, true, false, false)
            if (response.isErr()) {
                throw new Error(`Error creating Aqua tree : genesis revision: ${JSON.stringify(response.data, null, 4)}`);

            } else {

                let aquaTreeWrapper = {
                    aquaTree: response.data.aquaTree,
                    fileObject: fileObject,
                    revision: ""
                }
                let creds = {
                    mnemonic: "",
                    nostr_sk: "",
                    did_key: "",
                    alchemy_key: "",
                    witness_eth_network: "sepolia",
                    witness_method: "metamask",
                    p12_password: "",
                    p12_content: "",
                }

                let responseSign = await aquafier.signAquaTree(aquaTreeWrapper, "metamask",creds);
                if (responseSign.isErr()) {
                    throw new Error(`Error Signing Aqua tree : genesis revision: ${JSON.stringify(response.data, null, 4)}`);
                }
                console.log('Signing revision created successfully:', JSON.stringify(responseSign.data, null, 4));

                console.log('3--')

                let aquaTree = responseSign.data.aquaTree

                this.generatedChains.push(aquaTree);
                await this.saveChainToFile(aquaTree, name, formData);
                this.displayOutput('Root Trust Anchor generated successfully!', 'success');
                this.displayChain(aquaTree);

                let genHash = getGenesisHash(aquaTree);

                let formRevision = aquaTree.revisions[genHash];
                // Automatically validate against DNS registry
                await this.validateRootWithDNS(formRevision);
            }




        } catch (error) {
            this.displayOutput(`-Error: ${error.message}`, 'error');
        }
    }
    // async generateRootTrustAnchor() {
    //     try {
    //         console.log('Generating Root Trust Anchor...');
    //         const walletAddress = document.getElementById('rootWallet').value;
    //         const privateKey = ""; //document.getElementById('rootPrivateKey').value;
    //         const domain = document.getElementById('rootDomain').value;
    //         const validityStart = document.getElementById('rootValidityStart').value;
    //         const validityEnd = document.getElementById('rootValidityEnd').value;

    //         const timestamp = this.generateTimestamp();
    //         const nonce = this.generateNonce();

    //         // Create the canonical file content that will be hashed and saved as plain JSON
    //         const fileContent = {
    //             formType: "root_trust_anchor",
    //             rootWallet: walletAddress,
    //             rootPrivateKey: privateKey,
    //             rootDomain: domain,
    //             rootValidityStart: validityStart,
    //             rootValidityEnd: validityEnd,
    //             rootDelegation: document.getElementById('rootDelegation').checked,
    //             rootAuthentication: document.getElementById('rootAuthentication').checked,
    //             rootSigning: document.getElementById('rootSigning').checked
    //         };

    //         // Calculate file hash: SHA256(file_content + nonce) as per AQUA protocol
    //         const fileContentString = JSON.stringify(fileContent, Object.keys(fileContent).sort());
    //         const fileWithNonce = fileContentString + nonce;
    //         const file_hash = await this.generateHash(fileWithNonce);

    //         // Create form revision with all required fields per AQUA v3 specification
    //         const formRevision = {
    //             previous_verification_hash: "", // Required field - empty for genesis
    //             local_timestamp: timestamp, // Required field - UTC ISO format
    //             revision_type: "form", // Required field
    //             version: "https://aqua-protocol.org/docs/v3/schema_2 | SHA256 | Method: tree", // Required field
    //             file_hash: file_hash.slice(2), // Remove 0x prefix
    //             file_nonce: nonce.slice(2), // Remove 0x prefix
    //             // Form-specific fields with forms_ prefix
    //             forms_formType: "root_trust_anchor",
    //             forms_rootAuthentication: document.getElementById('rootAuthentication').checked,
    //             forms_rootDelegation: document.getElementById('rootDelegation').checked,
    //             forms_rootDomain: domain,
    //             forms_rootPrivateKey: privateKey,
    //             forms_rootSigning: document.getElementById('rootSigning').checked,
    //             forms_rootValidityEnd: validityEnd,
    //             forms_rootValidityStart: validityStart,
    //             forms_rootWallet: walletAddress
    //         };

    //         // Generate leaves array - hash each form field
    //         const leaves = [];
    //         const formFields = {
    //             forms_formType: formRevision.forms_formType,
    //             forms_rootAuthentication: formRevision.forms_rootAuthentication,
    //             forms_rootDelegation: formRevision.forms_rootDelegation,
    //             forms_rootDomain: formRevision.forms_rootDomain,
    //             forms_rootSigning: formRevision.forms_rootSigning,
    //             forms_rootValidityEnd: formRevision.forms_rootValidityEnd,
    //             forms_rootValidityStart: formRevision.forms_rootValidityStart,
    //             forms_rootWallet: formRevision.forms_rootWallet
    //         };

    //         for (const [key, value] of Object.entries(formFields)) {
    //             const leafHash = await this.generateHash(`${key}=${value}`);
    //             leaves.push(leafHash.slice(2)); // Remove 0x prefix
    //         }
    //         formRevision.leaves = leaves;

    //         // Calculate form revision hash (excluding leaves initially, then add it)
    //         const formRevisionForHash = { ...formRevision };
    //         delete formRevisionForHash.leaves; // Remove leaves for hash calculation
    //         const formRevisionHash = await this.generateHash(formRevisionForHash);
    //         formRevision.leaves = leaves; // Add leaves back

    //         // Generate signature revision with all required fields
    //         const signatureData = await this.signMessage(formRevisionHash, privateKey);

    //         const signatureRevision = {
    //             previous_verification_hash: formRevisionHash, // Required field
    //             local_timestamp: timestamp, // Required field
    //             revision_type: "signature", // Required field
    //             version: "https://aqua-protocol.org/docs/v3/schema_2 | SHA256 | Method: scalar", // Required field
    //             signature: signatureData.signature,
    //             signature_public_key: signatureData.publicKey,
    //             signature_type: "ethereum:eip-191", // Supported signature type
    //             signature_wallet_address: signatureData.address
    //         };

    //         const signatureRevisionHash = await this.generateHash(signatureRevision);

    //         // Build AQUA tree structure following SDK format
    //         const aquaTree = {
    //             revisions: {
    //                 [formRevisionHash]: formRevision,
    //                 [signatureRevisionHash]: signatureRevision
    //             },
    //             file_index: {
    //                 [formRevisionHash]: "root-trust-anchor.json"
    //             },
    //             tree: {
    //                 children: [
    //                     {
    //                         hash: signatureRevisionHash,
    //                         children: []
    //                     }
    //                 ],
    //                 hash: formRevisionHash
    //             },
    //             treeMapping: {
    //                 paths: {
    //                     [signatureRevisionHash]: [formRevisionHash, signatureRevisionHash]
    //                 },
    //                 latestHash: signatureRevisionHash
    //             }
    //         };

    //         console.log('Done : Generating Root Trust Anchor...');
    //         this.generatedChains.push(aquaTree);
    //         await this.saveChainToFile(aquaTree, `root-${walletAddress.slice(2, 8)}`, fileContent);
    //         this.displayOutput('Root Trust Anchor generated successfully!', 'success');
    //         this.displayChain(aquaTree);

    //         // Automatically validate against DNS registry
    //         await this.validateRootWithDNS(formRevision);

    //     } catch (error) {
    //         console.log('Generating Root Trust Anchor Error :', error);
    //         this.displayOutput(`--Error: ${error.message}`, 'error');
    //     }
    // }

    async generateIntermediateDelegate() {
        try {
            const issuerWallet = document.getElementById('issuerWallet').value;
            const issuerPrivateKey = document.getElementById('issuerPrivateKey').value;
            const subjectWallet = document.getElementById('subjectWallet').value;
            const issuerAttestationHash = document.getElementById('issuerAttestationHash').value;
            const validityStart = new Date(document.getElementById('intermediateValidityStart').value);
            const validityEnd = new Date(document.getElementById('intermediateValidityEnd').value);

            // Get capabilities from checkboxes
            const keyUsage = [];
            if (document.getElementById('intermediateDelegation').checked) keyUsage.push('delegation');
            if (document.getElementById('intermediateAuthentication').checked) keyUsage.push('authentication');
            if (document.getElementById('intermediateSigning').checked) keyUsage.push('transactionSigning');

            const canDelegate = document.getElementById('intermediateDelegation').checked;

            const timestamp = this.generateTimestamp();
            const nonce = this.generateNonce();

            const formRevision = {
                revision_hash: "",
                previous_verification_hash: "",
                local_timestamp: timestamp,
                revision_type: "form",
                version: "https://aqua-protocol.org/docs/v3/schema_2 | SHA256 | Method: tree",
                file_hash: "",
                file_nonce: nonce,
                forms_type: "trust_attestation",
                forms_version: "1.0",
                forms_issuer: issuerWallet,
                forms_subject: subjectWallet,
                forms_validity: {
                    notBefore: Math.floor(validityStart.getTime() / 1000),
                    notAfter: Math.floor(validityEnd.getTime() / 1000)
                },
                forms_extensions: {
                    keyUsage: keyUsage,
                    delegate: canDelegate,
                    policy: null,
                    alternateNames: [],
                    issuerAttestationHash: issuerAttestationHash
                },
                leaves: []
            };

            formRevision.file_hash = await this.generateHash({
                forms_type: formRevision.forms_type,
                forms_version: formRevision.forms_version,
                forms_issuer: formRevision.forms_issuer,
                forms_subject: formRevision.forms_subject,
                forms_validity: formRevision.forms_validity,
                forms_extensions: formRevision.forms_extensions
            });

            formRevision.revision_hash = await this.generateHash(formRevision);
            formRevision.leaves = [formRevision.revision_hash];

            const signatureData = await this.signMessage(formRevision.revision_hash, issuerPrivateKey);

            const signatureRevision = {
                revision_hash: "",
                previous_verification_hash: formRevision.revision_hash,
                local_timestamp: timestamp,
                revision_type: "signature",
                version: "https://aqua-protocol.org/docs/v3/schema_2 | SHA256 | Method: scalar",
                signature: signatureData.signature,
                signature_public_key: signatureData.publicKey,
                signature_wallet_address: signatureData.address,
                signature_type: "ethereum:eip-191"
            };

            signatureRevision.revision_hash = await this.generateHash(signatureRevision);

            const aquaTree = {
                revisions: [formRevision, signatureRevision],
                metadata: {
                    type: "intermediate_delegate",
                    issuer: issuerWallet,
                    subject: subjectWallet,
                    generated: new Date().toISOString()
                }
            };

            this.generatedChains.push(aquaTree);
            await this.saveChainToFile(aquaTree, `intermediate-${subjectWallet.slice(2, 8)}`);
            this.displayOutput('Intermediate Delegate generated successfully!', 'success');
            this.displayChain(aquaTree);

        } catch (error) {
            this.displayOutput(`Error: ${error.message}`, 'error');
        }
    }

    async generateEndEntity() {
        try {
            const issuerWallet = document.getElementById('endIssuerWallet').value;
            const issuerPrivateKey = document.getElementById('endIssuerPrivateKey').value;
            const subjectWallet = document.getElementById('endSubjectWallet').value;
            const issuerAttestationHash = document.getElementById('endIssuerAttestationHash').value;
            const validityStart = new Date(document.getElementById('endValidityStart').value);
            const validityEnd = new Date(document.getElementById('endValidityEnd').value);

            // Get capabilities from checkboxes
            const keyUsage = [];
            if (document.getElementById('endDelegation').checked) keyUsage.push('delegation');
            if (document.getElementById('endAuthentication').checked) keyUsage.push('authentication');
            if (document.getElementById('endSigning').checked) keyUsage.push('transactionSigning');

            const timestamp = this.generateTimestamp();
            const nonce = this.generateNonce();

            const formRevision = {
                revision_hash: "",
                previous_verification_hash: "",
                local_timestamp: timestamp,
                revision_type: "form",
                version: "https://aqua-protocol.org/docs/v3/schema_2 | SHA256 | Method: tree",
                file_hash: "",
                file_nonce: nonce,
                forms_type: "trust_attestation",
                forms_version: "1.0",
                forms_issuer: issuerWallet,
                forms_subject: subjectWallet,
                forms_validity: {
                    notBefore: Math.floor(validityStart.getTime() / 1000),
                    notAfter: Math.floor(validityEnd.getTime() / 1000)
                },
                forms_extensions: {
                    keyUsage: keyUsage,
                    delegate: document.getElementById('endDelegation').checked,
                    policy: null,
                    alternateNames: [],
                    issuerAttestationHash: issuerAttestationHash
                },
                leaves: []
            };

            formRevision.file_hash = await this.generateHash({
                forms_type: formRevision.forms_type,
                forms_version: formRevision.forms_version,
                forms_issuer: formRevision.forms_issuer,
                forms_subject: formRevision.forms_subject,
                forms_validity: formRevision.forms_validity,
                forms_extensions: formRevision.forms_extensions
            });

            formRevision.revision_hash = await this.generateHash(formRevision);
            formRevision.leaves = [formRevision.revision_hash];

            const signatureData = await this.signMessage(formRevision.revision_hash, issuerPrivateKey);

            const signatureRevision = {
                revision_hash: "",
                previous_verification_hash: formRevision.revision_hash,
                local_timestamp: timestamp,
                revision_type: "signature",
                version: "https://aqua-protocol.org/docs/v3/schema_2 | SHA256 | Method: scalar",
                signature: signatureData.signature,
                signature_public_key: signatureData.publicKey,
                signature_wallet_address: signatureData.address,
                signature_type: "ethereum:eip-191"
            };

            signatureRevision.revision_hash = await this.generateHash(signatureRevision);

            const aquaTree = {
                revisions: [formRevision, signatureRevision],
                metadata: {
                    type: "end_entity",
                    issuer: issuerWallet,
                    subject: subjectWallet,
                    generated: new Date().toISOString()
                }
            };

            this.generatedChains.push(aquaTree);
            await this.saveChainToFile(aquaTree, `end-entity-${subjectWallet.slice(2, 8)}`);
            this.displayOutput('End Entity generated successfully!', 'success');
            this.displayChain(aquaTree);

        } catch (error) {
            this.displayOutput(`Error: ${error.message}`, 'error');
        }
    }

    async generateRevocation() {
        try {
            const revokerWallet = document.getElementById('revokerWallet').value;
            const revokerPrivateKey = document.getElementById('revokerPrivateKey').value;
            const revokedHash = document.getElementById('revokedHash').value;
            const revocationReason = document.getElementById('revocationReason').value;

            const timestamp = this.generateTimestamp();
            const nonce = this.generateNonce();

            const formRevision = {
                revision_hash: "",
                previous_verification_hash: "",
                local_timestamp: timestamp,
                revision_type: "form",
                version: "https://aqua-protocol.org/docs/v3/schema_2 | SHA256 | Method: scalar",
                file_hash: "",
                file_nonce: nonce,
                forms_type: "revocation",
                forms_version: "1.0",
                forms_issuer: revokerWallet,
                forms_subject: revokedHash,
                forms_validity: {
                    notBefore: this.generateUnixTimestamp(),
                    notAfter: this.generateUnixTimestamp() + (365 * 24 * 60 * 60) // 1 year
                },
                forms_extensions: {
                    revocationReason: revocationReason
                }
            };

            formRevision.file_hash = await this.generateHash({
                forms_type: formRevision.forms_type,
                forms_version: formRevision.forms_version,
                forms_issuer: formRevision.forms_issuer,
                forms_subject: formRevision.forms_subject,
                forms_validity: formRevision.forms_validity,
                forms_extensions: formRevision.forms_extensions
            });

            formRevision.revision_hash = await this.generateHash(formRevision);

            const signatureData = await this.signMessage(formRevision.revision_hash, revokerPrivateKey);

            const signatureRevision = {
                revision_hash: "",
                previous_verification_hash: formRevision.revision_hash,
                local_timestamp: timestamp,
                revision_type: "signature",
                version: "https://aqua-protocol.org/docs/v3/schema_2 | SHA256 | Method: scalar",
                signature: signatureData.signature,
                signature_public_key: signatureData.publicKey,
                signature_wallet_address: signatureData.address,
                signature_type: "ethereum:eip-191"
            };

            signatureRevision.revision_hash = await this.generateHash(signatureRevision);

            const aquaTree = {
                revisions: [formRevision, signatureRevision],
                metadata: {
                    type: "revocation",
                    issuer: revokerWallet,
                    revokedHash: revokedHash,
                    reason: revocationReason,
                    generated: new Date().toISOString()
                }
            };

            this.generatedChains.push(aquaTree);
            await this.saveChainToFile(aquaTree, `revocation-${revokedHash.slice(2, 8)}`);
            this.displayOutput('Revocation generated successfully!', 'success');
            this.displayChain(aquaTree);

        } catch (error) {
            this.displayOutput(`Error: ${error.message}`, 'error');
        }
    }

    async saveChainToFile(aquaTree, filename, plainFormData = null) {
        try {
            console.log('Attempting to save chain to server...', filename);

            // Save AQUA chain file
            const chainResponse = await fetch('http://localhost:3000/api/save-chain', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    filename: `${filename}.aqua.json`,
                    data: aquaTree
                })
            });

            console.log('Chain response status:', chainResponse.status);

            if (!chainResponse.ok) {
                const errorText = await chainResponse.text();
                console.error('Server error response:', errorText);
                throw new Error(`Server error: ${chainResponse.statusText} - ${errorText}`);
            }

            const chainResult = await chainResponse.json();
            console.log('Chain save successful:', chainResult);

            // Also save the plain JSON input file if provided
            let inputResult = null;
            if (plainFormData) {
                try {
                    const inputResponse = await fetch('http://localhost:3000/api/save-chain', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            filename: `${filename}.json`,
                            data: plainFormData
                        })
                    });

                    if (inputResponse.ok) {
                        inputResult = await inputResponse.json();
                        console.log('Input file save successful:', inputResult);
                    } else {
                        const errorText = await inputResponse.text();
                        console.error('Input file save failed:', inputResponse.status, errorText);
                    }
                } catch (inputError) {
                    console.warn('Failed to save input file:', inputError.message);
                }
            }

            const message = inputResult
                ? `✅ Files saved to server:\n- AQUA chain: ${chainResult.filepath}\n- Input data: ${inputResult.filepath}`
                : `✅ Chain saved to server: ${chainResult.filepath}`;

            this.displayOutput(message, 'success');

        } catch (error) {
            // Fallback to browser download
            console.warn('Server save failed, falling back to browser download:', error.message);
            this.displayOutput(`⚠️ Server save failed: ${error.message}. Downloading to browser instead.`, 'error');

            // Download AQUA chain
            const chainJson = JSON.stringify(aquaTree, null, 2);
            this.downloadFile(chainJson, `${filename}.aqua.json`);

            // Download plain form data if provided
            if (plainFormData) {
                const inputJson = JSON.stringify(plainFormData, null, 2);
                this.downloadFile(inputJson, `${filename}.json`);
                this.displayOutput(`📥 Files downloaded: ${filename}.aqua.json and ${filename}.json`, 'success');
            } else {
                this.displayOutput(`📥 Chain downloaded to browser: ${filename}.aqua.json`, 'success');
            }
        }
    }

    downloadFile(content, filename) {
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async validateChain() {
        const chainFile = document.getElementById('chainFile').value;
        this.displayOutput(`Validation would use: node \\wsl.localhost\\Ubuntu\\home\\system-001\\aqua-js-cli\\dist\\aqua.js verify ${chainFile}`, 'success');
    }

    async validateRootWithDNS(formRevision) {
        try {
            // Create a temporary attestation object for DNS validation
            const attestation = {
                forms_type: 'root_trust_attestation',
                forms_issuer: formRevision.forms_rootWallet,
                forms_extensions: {
                    rootRegistryType: 'dns',
                    rootRegistryDetails: `aqua._wallet.${formRevision.forms_rootDomain}`
                }
            };

            const result = await this.dnsRegistry.validateRootTrustAnchor(attestation);
            if (result.valid) {
                this.displayOutput(
                    `✅ Root trust anchor validated against DNS registry!\n` +
                    `Domain: ${result.domain}\n` +
                    `Wallet: ${result.wallet}\n` +
                    `DNS Timestamp: ${new Date(result.dnsTimestamp * 1000).toISOString()}\n` +
                    `Command used: ${result.dnsCommand}`,
                    'success'
                );
            } else {
                this.displayOutput(`❌ DNS validation failed: ${result.error}`, 'error');
            }
            return result;
        } catch (error) {
            this.displayOutput(`❌ DNS validation error: ${error.message}`, 'error');
            return { valid: false, error: error.message };
        }
    }

    displayOutput(message, type = 'success') {
        const output = document.getElementById('output');
        const content = document.getElementById('outputContent');
        output.className = `output ${type}`;
        content.innerHTML = `<p>${message}</p>`;
        output.style.display = 'block';
    }

    displayChain(aquaTree) {
        const chainDisplay = document.getElementById('chainDisplay');
        const chainContent = document.getElementById('chainContent');

        // Extract info from the new AQUA structure
        const revisionHashes = Object.keys(aquaTree.revisions);
        const formRevisionHash = revisionHashes[0];
        const signatureRevisionHash = revisionHashes[1];
        const formRevision = aquaTree.revisions[formRevisionHash];

        // Determine chain type and details from form revision
        const chainType = formRevision.forms_formType || 'unknown';
        const issuer = formRevision.forms_rootWallet || formRevision.forms_issuer || 'unknown';
        const subject = formRevision.forms_rootWallet || formRevision.forms_subject || issuer;
        const domain = formRevision.forms_rootDomain || 'N/A';

        let html = '<div class="attestation-item">';
        html += `<h4>${chainType.replace(/_/g, ' ').toUpperCase()}</h4>`;
        html += `<p><strong>Issuer:</strong> ${issuer}</p>`;
        if (subject !== issuer) {
            html += `<p><strong>Subject:</strong> ${subject}</p>`;
        }
        if (domain !== 'N/A') {
            html += `<p><strong>Domain:</strong> ${domain}</p>`;
        }
        html += `<p><strong>Form Hash:</strong> ${formRevisionHash}</p>`;
        html += `<p><strong>Signature Hash:</strong> ${signatureRevisionHash}</p>`;
        html += `<p><strong>Latest Hash:</strong> ${aquaTree.treeMapping.latestHash}</p>`;
        html += '</div>';

        html += '<pre>' + JSON.stringify(aquaTree, null, 2) + '</pre>';

        chainContent.innerHTML = html;
        chainDisplay.style.display = 'block';
    }
}

// Tab functionality
function showTab(tabName) {
    const tabs = document.querySelectorAll('.tab-content');
    const buttons = document.querySelectorAll('.tab-button');

    tabs.forEach(tab => tab.classList.remove('active'));
    buttons.forEach(button => button.classList.remove('active'));

    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
}

function validateAllChains() {
    const generator = window.trustChainGenerator;
    if (generator.generatedChains.length === 0) {
        generator.displayOutput('No chains generated yet!', 'error');
        return;
    }

    let validationCommands = [];
    generator.generatedChains.forEach((chain, index) => {
        const filename = `${chain.metadata.type}-${index}.aqua.json`;
        validationCommands.push(`node \\wsl.localhost\\Ubuntu\\home\\system-001\\aqua-js-cli\\dist\\aqua.js verify ./output/${filename}`);
    });

    generator.displayOutput(
        `Validation commands for all ${generator.generatedChains.length} generated chains:\n\n` +
        validationCommands.join('\n'),
        'success'
    );
}

async function testDNSRegistry() {
    const generator = window.trustChainGenerator;
    const domain = document.getElementById('testDomain').value || 'inblock.io';

    try {
        generator.displayOutput('Testing DNS registry...', 'success');
        const result = await generator.dnsRegistry.testDNSBridge(domain);

        if (result.available) {
            generator.displayOutput(
                `✅ DNS Bridge Test Successful!\n\n` +
                `Test Domain: ${result.testDomain}\n` +
                `Verification Result: ${JSON.stringify(result.result, null, 2)}\n\n` +
                `Available Commands:\n` +
                `Verify: ${result.commands.verify}\n` +
                `Browser: ${result.commands.browser}\n` +
                `Generate: ${result.commands.generate}`,
                'success'
            );
        } else {
            generator.displayOutput(
                `❌ DNS Bridge Test Failed!\n\n` +
                `Error: ${result.error}\n\n` +
                `Commands to try:\n` +
                `Verify: ${result.commands.verify}\n` +
                `Browser: ${result.commands.browser}\n` +
                `Generate: ${result.commands.generate}`,
                'error'
            );
        }
    } catch (error) {
        generator.displayOutput(`DNS Registry test error: ${error.message}`, 'error');
    }
}

function showDNSCommands() {
    const generator = window.trustChainGenerator;
    const domain = document.getElementById('testDomain').value || 'inblock.io';
    const format = generator.dnsRegistry.getDNSRecordFormat();

    const verifyCommand = generator.dnsRegistry.generateDNSCommand(domain, 'verify');
    const browserCommand = generator.dnsRegistry.generateDNSCommand(domain, 'browser');
    const generateCommand = generator.dnsRegistry.generateDNSCommand(domain, 'generate');

    generator.displayOutput(
        `DNS Registry Commands for ${domain}:\n\n` +
        `1. Verify existing DNS record:\n${verifyCommand}\n\n` +
        `2. Generate new proof (browser/MetaMask):\n${browserCommand}\n\n` +
        `3. Generate new proof (private key):\n${generateCommand}\n\n` +
        `DNS Record Format:\n` +
        `Name: ${format.recordName}\n` +
        `Type: ${format.recordType}\n` +
        `Value: ${format.recordFormat}\n\n` +
        `Example for inblock.io:\n` +
        `Name: ${format.example}\n` +
        `Value: ${format.exampleValue}`,
        'success'
    );
}

// Initialize the application
window.trustChainGenerator = new TrustChainGenerator();

// Set default datetime values
function setDefaultDates() {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nextYear = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    const formatDateTime = (date) => {
        return date.toISOString().slice(0, 16);
    };

    // Set default dates for all forms
    const startFields = ['rootValidityStart', 'intermediateValidityStart', 'endValidityStart'];
    const endFields = ['rootValidityEnd', 'intermediateValidityEnd', 'endValidityEnd'];

    startFields.forEach(field => {
        const element = document.getElementById(field);
        if (element) element.value = formatDateTime(tomorrow);
    });

    endFields.forEach(field => {
        const element = document.getElementById(field);
        if (element) element.value = formatDateTime(nextYear);
    });
}

// Set defaults when page loads
document.addEventListener('DOMContentLoaded', setDefaultDates);