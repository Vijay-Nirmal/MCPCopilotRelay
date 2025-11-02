import JSZip from 'jszip';
import { writeFile, mkdir, readFile, readdir, stat } from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { generatePackageJson } from './templates/package-json.js';
import { generateExtensionTs } from './templates/extension-ts.js';
import { generateMcpClientTs } from './templates/mcp-client-ts.js';
import { generateReadme } from './templates/readme.js';
import { generateTsConfig } from './templates/tsconfig.js';

const execAsync = promisify(exec);

export interface ExtensionConfig {
  mcp: {
    type: 'stdio' | 'sse' | 'http';
    config: any;
  };
  capabilities: {
    tools?: Array<{ 
      name: string; 
      description?: string; 
      selected: boolean; 
      mapping?: string;
      inputSchema?: any; // JSON Schema for tool parameters
    }>;
    prompts?: Array<{ name: string; description?: string; selected: boolean; mapping?: string }>;
    resources?: Array<{ uri: string; name: string; selected: boolean }>;
  };
  mappings: {
    tools: Record<string, { type: 'lm-tool' | 'command'; toolId?: string; displayName: string; description: string }>;
    prompts: Record<string, { type: 'chat-participant'; displayName: string; description: string; slashCommand?: string }>;
    toolSetName?: string;
    toolSetDescription?: string;
    enableToolSets?: boolean; // Feature flag for languageModelToolSets (proposed API)
  };
  settings: Record<string, { 
    type: string; 
    description: string; 
    default?: any; 
    mcpMapping?: {
      target: 'header' | 'env' | 'arg' | 'url-param' | 'dynamic-arg';
      key: string;
      required?: boolean;
    };
    secret?: boolean;
  }>;
  extension: {
    name: string;
    displayName: string;
    description: string;
    version: string;
    publisher: string;
    author?: string;
    license?: string;
    repository?: string;
    icon?: string;
    iconFileName?: string;
    iconFileData?: string; // Base64-encoded icon data
    // Marketplace fields
    categories?: string[];
    keywords?: string[];
    homepage?: string;
    bugs?: string;
    qna?: string | false;
    galleryBanner?: {
      color: string;
      theme: 'dark' | 'light';
    };
    private?: boolean;
  };
}

export async function buildFromConfig(config: ExtensionConfig, outputDir: string, editedFiles?: Record<string, string>) {
  const extensionDir = path.join(outputDir, config.extension.name);
  const srcDir = path.join(extensionDir, 'src');
  const imagesDir = path.join(extensionDir, 'images');

  // Clean up any existing build to prevent size growth
  try {
    const fs = await import('fs/promises');
    await fs.rm(extensionDir, { recursive: true, force: true });
    console.log('🧹 Cleaned up existing extension directory');
  } catch (cleanupError) {
    // Directory might not exist, which is fine
  }

  // Create directories
  await mkdir(extensionDir, { recursive: true });
  await mkdir(srcDir, { recursive: true });
  
  // Create images directory if icon is specified
  if (config.extension.icon) {
    await mkdir(imagesDir, { recursive: true });
  }

  // Generate files (use edited versions if available)
  const packageJsonContent = editedFiles?.['package.json'] || JSON.stringify(generatePackageJson(config), null, 2);
  const extensionTsContent = editedFiles?.['extension.ts'] || generateExtensionTs(config);
  const mcpClientTsContent = editedFiles?.['mcp-client.ts'] || generateMcpClientTs(config);
  const readmeContent = editedFiles?.['README.md'] || generateReadme(config);
  const tsconfigContent = editedFiles?.['tsconfig.json'] || JSON.stringify(generateTsConfig(), null, 2);

  console.log('📝 Writing files...');
  if (editedFiles && Object.keys(editedFiles).length > 0) {
    console.log(`📄 Using ${Object.keys(editedFiles).length} edited file(s): ${Object.keys(editedFiles).join(', ')}`);
  }

  // Write files
  await writeFile(path.join(extensionDir, 'package.json'), packageJsonContent);
  await writeFile(path.join(srcDir, 'extension.ts'), extensionTsContent);
  await writeFile(path.join(srcDir, 'mcp-client.ts'), mcpClientTsContent);
  await writeFile(path.join(extensionDir, 'README.md'), readmeContent);
  await writeFile(path.join(extensionDir, 'tsconfig.json'), tsconfigContent);
  
  // Copy icon file if provided
  if (config.extension.iconFileData && config.extension.iconFileName) {
    // Extract base64 data (remove data:image/png;base64, prefix if present)
    const base64Data = config.extension.iconFileData.replace(/^data:image\/\w+;base64,/, '');
    const iconBuffer = Buffer.from(base64Data, 'base64');
    const iconPath = path.join(imagesDir, config.extension.iconFileName);
    await writeFile(iconPath, iconBuffer);
  }

  // Create LICENSE file if license is specified
  if (config.extension.license && config.extension.license !== 'SEE LICENSE IN README.md') {
    const licenseContent = generateLicenseFile(config.extension.license, config.extension.author);
    await writeFile(path.join(extensionDir, 'LICENSE'), licenseContent);
  }

  // Create .vscode-test.mjs for testing
  const vscodeTestMjs = `import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  files: 'out/test/**/*.test.js'
});`;
  await writeFile(path.join(extensionDir, '.vscode-test.mjs'), vscodeTestMjs);

  // Create .vscodeignore
  const vscodeignore = `src/**
tsconfig.json
.vscode-test.mjs
**/*.ts
**/*.map
.gitignore
`;
  await writeFile(path.join(extensionDir, '.vscodeignore'), vscodeignore);

  // Compile TypeScript to JavaScript
  console.log('Compiling TypeScript...');
  await compileTypeScript(extensionDir);

  // Install dependencies
  console.log('Installing dependencies...');
  await installDependencies(extensionDir);

  // Create .vsix package
  console.log('Creating VSIX package...');
  const vsixPath = await packageExtension(extensionDir, config);

  return {
    sourcePath: extensionDir,
    vsixPath,
  };
}

async function compileTypeScript(extensionDir: string): Promise<void> {
  try {
    // First, install TypeScript locally in the extension directory
    console.log('Installing TypeScript compiler...');
    await execAsync('npm install --save-dev typescript@latest', { cwd: extensionDir });
    
    // Run TypeScript compiler using npx (which will use local installation)
    console.log('Running TypeScript compiler...');
    const { stdout, stderr } = await execAsync('npx tsc -p ./', { cwd: extensionDir });
    if (stderr) {
      console.warn('TypeScript compiler warnings:', stderr);
    }
    if (stdout) {
      console.log('TypeScript compiler output:', stdout);
    }
    console.log('TypeScript compilation completed successfully');
  } catch (error: any) {
    console.error('TypeScript compilation error details:', {
      message: error.message,
      stdout: error.stdout,
      stderr: error.stderr,
      code: error.code
    });
    
    // If TypeScript compilation fails, provide helpful error message
    const errorMessage = error.stderr || error.stdout || error.message;
    throw new Error(`Failed to compile TypeScript:\n${errorMessage}`);
  }
}

async function installDependencies(extensionDir: string): Promise<void> {
  try {
    // Create a minimal package.json with only required dependencies
    const packageJsonPath = path.join(extensionDir, 'package.json');
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
    
    // Add required dependencies
    packageJson.dependencies = packageJson.dependencies || {};
    packageJson.dependencies['@modelcontextprotocol/sdk'] = '^1.0.4';
    
    // Write updated package.json
    await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
    
    // Install dependencies
    await execAsync('npm install --production', { cwd: extensionDir });
  } catch (error: any) {
    console.error('Dependency installation failed:', error.message);
    throw new Error(`Failed to install dependencies: ${error.message}`);
  }
}

async function addDirectoryToZip(zip: JSZip, dirPath: string, basePath: string, zipBasePath: string = 'extension', skipNodeModules: boolean = false): Promise<void> {
  const entries = await readdir(dirPath);
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);
    const relativePath = path.relative(basePath, fullPath);
    const zipPath = path.join(zipBasePath, relativePath).replace(/\\/g, '/');
    
    const stats = await stat(fullPath);
    
    if (stats.isDirectory()) {
      // Skip certain directories
      if (entry === 'node_modules' || entry === 'src' || entry === '.git' || entry === '.vscode') {
        if (entry === 'node_modules' && !skipNodeModules) {
          // Add node_modules but with filtering
          await addNodeModulesToZip(zip, fullPath, zipBasePath);
        }
        continue;
      }
      await addDirectoryToZip(zip, fullPath, basePath, zipBasePath, skipNodeModules);
    } else {
      // Skip certain files
      if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
        continue; // Skip TypeScript source files (except declaration files)
      }
      if (entry === 'tsconfig.json' || entry === '.vscode-test.mjs' || entry === '.gitignore') {
        continue;
      }
      
      const content = await readFile(fullPath);
      zip.file(zipPath, content);
    }
  }
}

async function addNodeModulesToZip(zip: JSZip, nodeModulesPath: string, zipBasePath: string): Promise<void> {
  const packagesToInclude = new Set<string>();
  const visited = new Set<string>();
  
  // Recursive function to collect dependencies
  async function collectDependencies(pkgName: string, pkgPath: string) {
    if (visited.has(pkgName)) {
      return;
    }
    visited.add(pkgName);
    packagesToInclude.add(pkgName);
    
    try {
      const packageJsonPath = path.join(pkgPath, 'package.json');
      const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
      
      if (packageJson.dependencies) {
        for (const dep of Object.keys(packageJson.dependencies)) {
          const depPath = path.join(nodeModulesPath, dep);
          try {
            const depStat = await stat(depPath);
            if (depStat.isDirectory()) {
              await collectDependencies(dep, depPath);
            }
          } catch {
            // Dependency not found at top level, might be nested
          }
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not read package.json for ${pkgName}`);
    }
  }
  
  try {
    // Start with the SDK
    const sdkPath = path.join(nodeModulesPath, '@modelcontextprotocol', 'sdk');
    await collectDependencies('@modelcontextprotocol/sdk', sdkPath);
    
    console.log(`Including ${packagesToInclude.size} packages (SDK + all dependencies) in VSIX...`);
    
    // Add @modelcontextprotocol scope folder
    const scopePath = path.join(nodeModulesPath, '@modelcontextprotocol');
    await addDirectoryToZip(zip, scopePath, path.dirname(scopePath), path.join(zipBasePath, 'node_modules'), true);
    
    // Add each collected package
    for (const pkg of packagesToInclude) {
      if (pkg.startsWith('@modelcontextprotocol/')) {
        continue; // Already added above
      }
      
      const pkgPath = path.join(nodeModulesPath, pkg);
      try {
        const pkgStat = await stat(pkgPath);
        if (pkgStat.isDirectory()) {
          await addDirectoryToZip(zip, pkgPath, path.dirname(pkgPath), path.join(zipBasePath, 'node_modules'), true);
        }
      } catch {
        console.warn(`Warning: Package '${pkg}' not found in node_modules`);
      }
    }
  } catch (error) {
    console.error('Error collecting SDK dependencies:', error);
    throw new Error('Failed to package SDK dependencies');
  }
}

async function packageExtension(extensionDir: string, config: ExtensionConfig): Promise<string> {
  const zip = new JSZip();
  
  // Add all files from extension directory
  await addDirectoryToZip(zip, extensionDir, extensionDir);
  
  // Create [Content_Types].xml for VSIX
  const contentTypes = `<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="json" ContentType="application/json" />
  <Default Extension="js" ContentType="application/javascript" />
  <Default Extension="md" ContentType="text/markdown" />
  <Default Extension="txt" ContentType="text/plain" />
  <Default Extension="png" ContentType="image/png" />
  <Default Extension="jpg" ContentType="image/jpeg" />
  <Default Extension="jpeg" ContentType="image/jpeg" />
  <Default Extension="gif" ContentType="image/gif" />
  <Default Extension="svg" ContentType="image/svg+xml" />
  <Default Extension="vsixmanifest" ContentType="text/xml" />
  <Default Extension="xml" ContentType="text/xml" />
</Types>`;
  zip.file('[Content_Types].xml', contentTypes);

  // Create extension.vsixmanifest
  const manifest = generateVsixManifest(config);
  zip.file('extension.vsixmanifest', manifest);

  // Generate VSIX
  const vsixBuffer = await zip.generateAsync({ 
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });
  const vsixPath = path.join(extensionDir, `${config.extension.name}-${config.extension.version}.vsix`);
  await writeFile(vsixPath, vsixBuffer);

  return vsixPath;
}

function generateVsixManifest(config: ExtensionConfig): string {
  // Generate tags from keywords
  const tags = config.extension.keywords?.join(',') || 'mcp,model-context-protocol';
  
  // Generate categories
  const categories = config.extension.categories?.join(',') || 'Other';
  
  let properties = "";

  // Add repository links as properties
  if (config.extension.repository) {
    const repoUrl = escapeXml(config.extension.repository);
    properties += `
                <Property Id="Microsoft.VisualStudio.Services.Links.Source" Value="${repoUrl}" />
                <Property Id="Microsoft.VisualStudio.Services.Links.Getstarted" Value="${repoUrl}" />
                <Property Id="Microsoft.VisualStudio.Services.Links.GitHub" Value="${repoUrl}" />`;
    
    // Add bugs/issues URL
    if (config.extension.bugs) {
      properties += `
                <Property Id="Microsoft.VisualStudio.Services.Links.Support" Value="${escapeXml(config.extension.bugs)}" />`;
    } else if (repoUrl.includes('github.com')) {
      const issuesUrl = repoUrl.replace(/\.git$/, '') + '/issues';
      properties += `
                <Property Id="Microsoft.VisualStudio.Services.Links.Support" Value="${issuesUrl}" />`;
    }
    
    // Add README/Learn link
    const readmeUrl = repoUrl.replace(/\.git$/, '') + '#readme';
    properties += `
                <Property Id="Microsoft.VisualStudio.Services.Links.Learn" Value="${readmeUrl}" />`;
  } else if (config.extension.homepage) {
    properties += `
                <Property Id="Microsoft.VisualStudio.Services.Links.Source" Value="${escapeXml(config.extension.homepage)}" />`;
  }

  // Add GitHub Flavored Markdown and Pricing properties
  properties += `
                
                <Property Id="Microsoft.VisualStudio.Services.GitHubFlavoredMarkdown" Value="true" />
                <Property Id="Microsoft.VisualStudio.Services.Content.Pricing" Value="Free"/>`;

  // Build metadata section
  let metadata = `        <Identity Language="en-US" Id="${escapeXml(config.extension.name)}" Version="${config.extension.version}" Publisher="${escapeXml(config.extension.publisher)}" />
        <DisplayName>${escapeXml(config.extension.displayName)}</DisplayName>
        <Description xml:space="preserve">${escapeXml(config.extension.description)}</Description>
        <Tags>${escapeXml(tags)}</Tags>
        <Categories>${escapeXml(categories)}</Categories>`;

  // Add GalleryFlags for public/private
  if (!config.extension.private) {
    metadata += `\n        <GalleryFlags>Public</GalleryFlags>`;
  }

  // Add Properties section
  metadata += `
        
        <Properties>
${properties}
                
                
            </Properties>`;

  // Build assets section
  let assets = `        <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true" />
        <Asset Type="Microsoft.VisualStudio.Services.Content.Details" Path="extension/README.md" Addressable="true" />`;

  // Add Icon asset
  if (config.extension.iconFileName) {
    assets += `\n        <Asset Type="Microsoft.VisualStudio.Services.Icons.Default" Path="extension/images/${config.extension.iconFileName}" Addressable="true" />`;
  }

  return `<?xml version="1.0" encoding="utf-8"?>
    <PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">
        <Metadata>
${metadata}
        </Metadata>
        <Installation>
            <InstallationTarget Id="Microsoft.VisualStudio.Code"/>
        </Installation>
        <Dependencies/>
        <Assets>
${assets}
        </Assets>
    </PackageManifest>`;
}

// Helper function to escape XML special characters
function escapeXml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Helper function to generate LICENSE file content
function generateLicenseFile(licenseType: string, author?: string): string {
  const year = new Date().getFullYear();
  const copyrightHolder = author || 'The Extension Author';

  switch (licenseType.toUpperCase()) {
    case 'MIT':
      return `MIT License

Copyright (c) ${year} ${copyrightHolder}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

    case 'APACHE-2.0':
    case 'APACHE':
      return `Apache License
Version 2.0, January 2004
http://www.apache.org/licenses/

Copyright ${year} ${copyrightHolder}

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.`;

    case 'GPL-3.0':
    case 'GPL':
      return `GNU GENERAL PUBLIC LICENSE
Version 3, 29 June 2007

Copyright (C) ${year} ${copyrightHolder}

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.`;

    default:
      // Generic license template
      return `${licenseType} License

Copyright (c) ${year} ${copyrightHolder}

All rights reserved.`;
  }
}
