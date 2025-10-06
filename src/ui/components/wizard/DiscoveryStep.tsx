import { useState, useEffect } from 'react';
import { useWizardStore } from '@/ui/store/wizard-store';
import { Button } from '@/ui/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/components/ui/card';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, PlayCircle, Wrench, MessageSquare, FileText } from 'lucide-react';

export function DiscoveryStep() {
  const [isDiscoveringNow, setIsDiscoveringNow] = useState(false);
  const [testingCapability, setTestingCapability] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any>(null);

  const {
    isConnected,
    capabilities,
    discoveryError,
    setCapabilities,
    setIsDiscovering: setStoreDiscovering,
    setDiscoveryError,
  } = useWizardStore();

  useEffect(() => {
    // Auto-discover on mount if connected
    if (isConnected && !capabilities) {
      handleDiscover();
    }
  }, [isConnected]);

  const handleDiscover = async () => {
    setIsDiscoveringNow(true);
    setStoreDiscovering(true);
    setDiscoveryError(null);

    try {
      const response = await fetch('http://localhost:3000/api/mcp/discover');
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Discovery failed');
      }

      const data = await response.json();
      setCapabilities(data);
    } catch (error) {
      setDiscoveryError((error as Error).message);
    } finally {
      setIsDiscoveringNow(false);
      setStoreDiscovering(false);
    }
  };

  const handleTestCapability = async (type: 'tool' | 'prompt' | 'resource', name: string, uri?: string) => {
    setTestingCapability(`${type}-${name}`);
    setTestResult(null);

    try {
      const response = await fetch('http://localhost:3000/api/mcp/test-capability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          name,
          uri,
          args: {},
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Test failed');
      }

      const result = await response.json();
      setTestResult({ success: true, data: result });
    } catch (error) {
      setTestResult({ success: false, error: (error as Error).message });
    } finally {
      setTestingCapability(null);
    }
  };

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Discover Capabilities</h2>
          <p className="text-muted-foreground mt-2">
            Please connect to an MCP server first.
          </p>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You need to connect to an MCP server in the previous step before discovering capabilities.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Discover Capabilities</h2>
          <p className="text-muted-foreground mt-2">
            Auto-discover tools, prompts, and resources from the connected MCP server.
          </p>
        </div>
        <Button onClick={handleDiscover} disabled={isDiscoveringNow}>
          {isDiscoveringNow && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isDiscoveringNow ? 'Discovering...' : 'Re-discover'}
        </Button>
      </div>

      {discoveryError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{discoveryError}</AlertDescription>
        </Alert>
      )}

      {capabilities && (
        <div className="space-y-6">
          {/* Tools */}
          {capabilities.tools && capabilities.tools.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5" />
                <h3 className="text-lg font-semibold">Tools ({capabilities.tools.length})</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {capabilities.tools.map((tool: any) => (
                  <Card key={tool.name}>
                    <CardHeader>
                      <CardTitle className="text-base">{tool.name}</CardTitle>
                      {tool.description && (
                        <CardDescription>{tool.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {tool.inputSchema && (
                          <div className="text-xs">
                            <span className="font-medium">Schema: </span>
                            <code className="bg-muted px-1 py-0.5 rounded">
                              {JSON.stringify(tool.inputSchema).length > 50
                                ? JSON.stringify(tool.inputSchema).substring(0, 50) + '...'
                                : JSON.stringify(tool.inputSchema)}
                            </code>
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTestCapability('tool', tool.name)}
                          disabled={testingCapability === `tool-${tool.name}`}
                          className="w-full"
                        >
                          {testingCapability === `tool-${tool.name}` ? (
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          ) : (
                            <PlayCircle className="mr-2 h-3 w-3" />
                          )}
                          Test Tool
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Prompts */}
          {capabilities.prompts && capabilities.prompts.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                <h3 className="text-lg font-semibold">Prompts ({capabilities.prompts.length})</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {capabilities.prompts.map((prompt: any) => (
                  <Card key={prompt.name}>
                    <CardHeader>
                      <CardTitle className="text-base">{prompt.name}</CardTitle>
                      {prompt.description && (
                        <CardDescription>{prompt.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {prompt.arguments && prompt.arguments.length > 0 && (
                          <div className="text-xs">
                            <span className="font-medium">Arguments: </span>
                            {prompt.arguments.map((arg: any) => (
                              <span key={arg.name} className="inline-block bg-muted px-1 py-0.5 rounded mr-1">
                                {arg.name}{arg.required && '*'}
                              </span>
                            ))}
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTestCapability('prompt', prompt.name)}
                          disabled={testingCapability === `prompt-${prompt.name}`}
                          className="w-full"
                        >
                          {testingCapability === `prompt-${prompt.name}` ? (
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          ) : (
                            <PlayCircle className="mr-2 h-3 w-3" />
                          )}
                          Test Prompt
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Resources */}
          {capabilities.resources && capabilities.resources.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                <h3 className="text-lg font-semibold">Resources ({capabilities.resources.length})</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {capabilities.resources.map((resource: any) => (
                  <Card key={resource.uri}>
                    <CardHeader>
                      <CardTitle className="text-base">{resource.name}</CardTitle>
                      {resource.description && (
                        <CardDescription>{resource.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="text-xs">
                          <span className="font-medium">URI: </span>
                          <code className="bg-muted px-1 py-0.5 rounded text-xs break-all">
                            {resource.uri}
                          </code>
                        </div>
                        {resource.mimeType && (
                          <div className="text-xs">
                            <span className="font-medium">Type: </span>
                            <span className="text-muted-foreground">{resource.mimeType}</span>
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTestCapability('resource', resource.name, resource.uri)}
                          disabled={testingCapability === `resource-${resource.name}`}
                          className="w-full"
                        >
                          {testingCapability === `resource-${resource.name}` ? (
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          ) : (
                            <PlayCircle className="mr-2 h-3 w-3" />
                          )}
                          Test Resource
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Test Result */}
          {testResult && (
            <Alert variant={testResult.success ? 'default' : 'destructive'}>
              {testResult.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                {testResult.success ? (
                  <div>
                    <div className="font-medium mb-1">Test Successful!</div>
                    <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                      {JSON.stringify(testResult.data, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div>
                    <div className="font-medium mb-1">Test Failed</div>
                    <div className="text-sm">{testResult.error}</div>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Summary */}
          <div className="rounded-lg border p-4 bg-muted/50">
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="font-medium">Total Capabilities:</span>{' '}
                {(capabilities.tools?.length || 0) +
                  (capabilities.prompts?.length || 0) +
                  (capabilities.resources?.length || 0)}
              </div>
              <div>
                <span className="font-medium">Tools:</span> {capabilities.tools?.length || 0}
              </div>
              <div>
                <span className="font-medium">Prompts:</span> {capabilities.prompts?.length || 0}
              </div>
              <div>
                <span className="font-medium">Resources:</span> {capabilities.resources?.length || 0}
              </div>
            </div>
          </div>
        </div>
      )}

      {!capabilities && !isDiscoveringNow && !discoveryError && (
        <div className="text-center py-12 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Discovering capabilities...</p>
        </div>
      )}
    </div>
  );
}
