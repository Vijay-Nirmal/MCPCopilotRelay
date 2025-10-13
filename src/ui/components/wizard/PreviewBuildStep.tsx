import { useState } from 'react';
import { useWizardStore } from '../../store/wizard-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, Download, FileCode, CheckCircle2, AlertCircle, Package } from 'lucide-react';
import Editor, { loader } from '@monaco-editor/react';

// Configure Monaco Editor to use CDN for workers
loader.config({
  paths: {
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs'
  }
});

export function PreviewBuildStep() {
  const {
    mcpConfig,
    capabilities,
    toolMappings,
    promptMappings,
    extensionInfo,
    isBuilding,
    buildError,
    buildSuccess,
    setIsBuilding,
    setBuildError,
    setBuildSuccess,
  } = useWizardStore();

  const [generatedFiles, setGeneratedFiles] = useState<Record<string, string>>({});
  const [editedFiles, setEditedFiles] = useState<Record<string, string>>({});

  // Generate preview files
  const generatePreviews = async () => {
    try {
      // Call the backend API to generate previews using actual templates
      const config = {
        mcpConfig,
        capabilities,
        toolMappings,
        promptMappings,
        extensionInfo,
      };

      const response = await fetch('http://localhost:3000/api/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error('Failed to generate previews');
      }

      const data = await response.json();
      setGeneratedFiles(data.files);
      return data.files;
    } catch (error) {
      console.error('Failed to generate previews:', error);
      // Fallback to empty files if API fails
      return {};
    }
  };

  // Load previews on mount
  useState(() => {
    generatePreviews();
  });

  const handleBuild = async () => {
    setIsBuilding(true);
    setBuildError(null);
    setBuildSuccess(false);

    try {
      console.log('🚀 Starting extension build process...');
      // Prepare the full configuration
      const config = {
        mcpConfig,
        capabilities,
        toolMappings,
        promptMappings,
        extensionInfo,
        editedFiles, // Include any manually edited files
      };

      // Call the build API with increased timeout
      console.log('📦 Sending build request...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('⏰ Build request timed out after 5 minutes');
        controller.abort();
      }, 300000); // 5 minutes timeout
      
      const response = await fetch('http://localhost:3000/api/build', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      console.log('✅ Build request completed');

      if (!response.ok) {
        let errorMessage = 'Build failed';
        try {
          const error = await response.json();
          errorMessage = error.message || errorMessage;
        } catch {
          errorMessage = `Build failed with status ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      // Check content type
      const contentType = response.headers.get('Content-Type');
      if (contentType && contentType.includes('application/json')) {
        // Server returned JSON error instead of file
        const error = await response.json();
        throw new Error(error.message || 'Build failed');
      }

      // Get the VSIX file as a blob with progress indication
      console.log('📥 Converting response to blob...');
      const blob = await response.blob();
      const fileSizeMB = (blob.size / 1024 / 1024).toFixed(2);
      console.log(`✅ Downloaded VSIX file: ${fileSizeMB} MB`);
      
      if (blob.size === 0) {
        throw new Error('Received empty file from server');
      }
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const filename = `${extensionInfo.name}-${extensionInfo.version}.vsix`;
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none'; // Hide the link
      document.body.appendChild(a);
      
      console.log(`💾 Triggering download: ${filename}`);
      
      // Try multiple methods to ensure download works across browsers
      try {
        a.click();
      } catch (clickError) {
        console.warn('Click method failed, trying alternative:', clickError);
        // Fallback: create a MouseEvent
        const event = new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: true,
        });
        a.dispatchEvent(event);
      }
      
      // Clean up
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
        console.log('🧹 Download cleanup completed');
      }, 1000);

      setBuildSuccess(true);
    } catch (error) {
      setBuildError((error as Error).message);
    } finally {
      setIsBuilding(false);
    }
  };

  const handleDownloadConfig = () => {
    const config = {
      mcpConfig,
      capabilities,
      toolMappings,
      promptMappings,
      extensionInfo,
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${extensionInfo.name}-config.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // Validation
  const canBuild = extensionInfo.name && 
    extensionInfo.displayName && 
    extensionInfo.description && 
    extensionInfo.version && 
    extensionInfo.publisher &&
    (Object.keys(toolMappings).length > 0 || Object.keys(promptMappings).length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Preview & Build</h2>
        <p className="text-muted-foreground">
          Review generated files and build your VS Code extension
        </p>
      </div>

      {/* File Previews */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCode className="w-5 h-5" />
            Generated Files
          </CardTitle>
          <CardDescription>
            Preview and edit the generated extension files before building
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="package.json" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="package.json">
                package.json {editedFiles['package.json'] !== undefined && <span className="ml-1 text-xs text-orange-500">●</span>}
              </TabsTrigger>
              <TabsTrigger value="extension.ts">
                extension.ts {editedFiles['extension.ts'] !== undefined && <span className="ml-1 text-xs text-orange-500">●</span>}
              </TabsTrigger>
              <TabsTrigger value="mcp-client.ts">
                mcp-client.ts {editedFiles['mcp-client.ts'] !== undefined && <span className="ml-1 text-xs text-orange-500">●</span>}
              </TabsTrigger>
              <TabsTrigger value="README.md">
                README.md {editedFiles['README.md'] !== undefined && <span className="ml-1 text-xs text-orange-500">●</span>}
              </TabsTrigger>
            </TabsList>
            
            {Object.entries(generatedFiles).map(([filename, content]) => {
              const language = filename.endsWith('.json') ? 'json' : 
                             filename.endsWith('.ts') ? 'typescript' : 
                             filename.endsWith('.md') ? 'markdown' : 'typescript';
              
              return (
                <TabsContent key={filename} value={filename} className="space-y-4">
                  <div className="flex justify-end items-center mb-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const blob = new Blob([editedFiles[filename] !== undefined ? editedFiles[filename] : content], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = filename;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                  <div className="relative border rounded-md overflow-hidden">
                    <Editor
                      height="500px"
                      language={language}
                      value={editedFiles[filename] !== undefined ? editedFiles[filename] : content}
                      onChange={(value) => {
                        if (value !== undefined) {
                          setEditedFiles({ ...editedFiles, [filename]: value });
                        }
                      }}
                      theme="vs-dark"
                      options={{
                        minimap: { enabled: false },
                        fontSize: 13,
                        lineNumbers: 'on',
                        roundedSelection: false,
                        scrollBeyondLastLine: false,
                        readOnly: false,
                        automaticLayout: true,
                        tabSize: 2,
                        wordWrap: 'on',
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    VS Code-like editor with syntax highlighting. Edit freely and changes will be included in the build.
                  </p>
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>

      {/* Build Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Build Extension
          </CardTitle>
          <CardDescription>
            Generate the .vsix package ready for installation in VS Code
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.keys(editedFiles).length > 0 && (
            <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <FileCode className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-600 dark:text-blue-400">
                {Object.keys(editedFiles).length} file(s) have been edited and will be included in the build: {Object.keys(editedFiles).join(', ')}
              </AlertDescription>
            </Alert>
          )}

          {buildSuccess && (
            <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-600 dark:text-green-400">
                <div className="space-y-1">
                  <div>✅ Extension built successfully!</div>
                  <div>📥 The .vsix file should download automatically.</div>
                  <div className="text-sm">
                    <strong>If download doesn't start:</strong> Check your Downloads folder or browser permissions. 
                    You can also find the file manually in the <code className="bg-green-100 dark:bg-green-900 px-1 rounded">.build</code> folder.
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {buildError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{buildError}</AlertDescription>
            </Alert>
          )}

          {!canBuild && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please complete all required fields and select at least one capability to enable building.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-4">
            <Button
              onClick={handleBuild}
              disabled={!canBuild || isBuilding}
              className="flex-1"
            >
              {isBuilding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isBuilding ? 'Building VSIX (up to 5 min)...' : 'Build VSIX'}
            </Button>

            <Button
              onClick={handleDownloadConfig}
              variant="outline"
            >
              <Download className="mr-2 h-4 w-4" />
              Download Config
            </Button>
          </div>

          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>Next steps after building:</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>The .vsix file will be downloaded automatically to your Downloads folder</li>
              <li>If download is blocked, check your browser's download permissions</li>
              <li>Open VS Code and go to Extensions view (Ctrl+Shift+X)</li>
              <li>Click the "..." menu → "Install from VSIX..."</li>
              <li>Select the downloaded .vsix file</li>
              <li>Reload VS Code to activate your extension</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
