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
  };
  settings: Record<string, { 
    type: string; 
    description: string; 
    default?: any; 
    mcpMapping?: {
      target: 'header' | 'env' | 'arg' | 'url-param';
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
  };
}

export async function buildFromConfig(config: ExtensionConfig, outputDir: string, editedFiles?: Record<string, string>) {
  const extensionDir = path.join(outputDir, config.extension.name);
  const srcDir = path.join(extensionDir, 'src');
  const imagesDir = path.join(extensionDir, 'images');

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
  <Default Extension="png" ContentType="image/png" />
  <Default Extension="jpg" ContentType="image/jpeg" />
  <Default Extension="vsixmanifest" ContentType="text/xml" />
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
  return `<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">
  <Metadata>
    <Identity Language="en-US" Id="${config.extension.name}" Version="${config.extension.version}" Publisher="${config.extension.publisher}" />
    <DisplayName>${config.extension.displayName}</DisplayName>
    <Description xml:space="preserve">${config.extension.description}</Description>
    <Tags>mcp,model-context-protocol</Tags>
    <Categories>Other</Categories>
    <License>extension/README.md</License>
  </Metadata>
  <Installation>
    <InstallationTarget Id="Microsoft.VisualStudio.Code" />
  </Installation>
  <Dependencies />
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true" />
  </Assets>
</PackageManifest>`;
}
