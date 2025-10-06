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
      // Prepare the full configuration
      const config = {
        mcpConfig,
        capabilities,
        toolMappings,
        promptMappings,
        extensionInfo,
        editedFiles, // Include any manually edited files
      };

      // Call the build API
      const response = await fetch('http://localhost:3000/api/build', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Build failed');
      }

      // Get the VSIX file as a blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${extensionInfo.name}-${extensionInfo.version}.vsix`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

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
              <TabsTrigger value="package.json">package.json</TabsTrigger>
              <TabsTrigger value="extension.ts">extension.ts</TabsTrigger>
              <TabsTrigger value="mcp-client.ts">mcp-client.ts</TabsTrigger>
              <TabsTrigger value="README.md">README.md</TabsTrigger>
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
          {buildSuccess && (
            <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-600 dark:text-green-400">
                Extension built successfully! The .vsix file has been downloaded.
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
              {isBuilding ? 'Building...' : 'Build VSIX'}
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
              <li>The .vsix file will be downloaded to your Downloads folder</li>
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
