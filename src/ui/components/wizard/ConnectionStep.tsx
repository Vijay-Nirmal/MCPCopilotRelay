import { useState } from 'react';
import { useWizardStore } from '@/ui/store/wizard-store';
import { Button } from '@/ui/components/ui/button';
import { Input } from '@/ui/components/ui/input';
import { Label } from '@/ui/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/ui/components/ui/radio-group';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Loader2, CheckCircle, XCircle, Upload } from 'lucide-react';
import { Textarea } from '@/ui/components/ui/textarea';

type TransportType = 'stdio' | 'sse' | 'http';

export function ConnectionStep() {
  const [transportType, setTransportType] = useState<TransportType>('stdio');
  const [isConnecting, setIsConnecting] = useState(false);
  
  // stdio config
  const [command, setCommand] = useState('node');
  const [args, setArgs] = useState('');
  const [envVars, setEnvVars] = useState('');
  
  // remote config
  const [url, setUrl] = useState('http://localhost:3001');
  const [headers, setHeaders] = useState('');
  
  const {
    isConnected,
    connectionError,
    setMcpConfig,
    setIsConnected,
    setConnectionError,
    importConfig,
  } = useWizardStore();

  const handleConnect = async () => {
    setIsConnecting(true);
    setConnectionError(null);

    try {
      let config: any;
      
      if (transportType === 'stdio') {
        const parsedArgs = args.trim() ? args.split(',').map(a => a.trim()) : [];
        const parsedEnv = envVars.trim() 
          ? Object.fromEntries(
              envVars.split('\n')
              .filter(line => line.includes('='))
              .map(line => {
                const [key, ...valueParts] = line.split('=');
                if (!key) return ['', ''];
                return [key.trim(), valueParts.join('=').trim()];
              })
            )
          : {};
        
        config = {
          type: 'stdio',
          config: {
            command,
            args: parsedArgs,
            env: parsedEnv,
          },
        };
      } else {
        const parsedHeaders = headers.trim()
          ? Object.fromEntries(
              headers.split('\n')
              .filter(line => line.includes(':'))
              .map(line => {
                const [key, ...valueParts] = line.split(':');
                if (!key) return ['', ''];
                return [key.trim(), valueParts.join(':').trim()];
              })
            )
          : {};
        
        config = {
          type: transportType,
          config: {
            url,
            headers: parsedHeaders,
          },
        };
      }

      // Connect to proxy server
      const response = await fetch('http://localhost:3000/api/mcp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Connection failed');
      }

      setMcpConfig(config);
      setIsConnected(true);
    } catch (error) {
      setConnectionError((error as Error).message);
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleImportConfig = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const text = await file.text();
          const config = JSON.parse(text);
          importConfig(config);
          
          // Set form values from imported config
          if (config.mcp) {
            setTransportType(config.mcp.type);
            if (config.mcp.type === 'stdio') {
              setCommand(config.mcp.config.command || 'node');
              setArgs(config.mcp.config.args?.join(', ') || '');
              setEnvVars(
                Object.entries(config.mcp.config.env || {})
                  .map(([k, v]) => `${k}=${v}`)
                  .join('\n')
              );
            } else {
              setUrl(config.mcp.config.url || '');
              setHeaders(
                Object.entries(config.mcp.config.headers || {})
                  .map(([k, v]) => `${k}: ${v}`)
                  .join('\n')
              );
            }
          }
        } catch (error) {
          setConnectionError('Failed to import config: ' + (error as Error).message);
        }
      }
    };
    input.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">MCP Connection</h2>
          <p className="text-muted-foreground mt-2">
            Connect to an MCP server using stdio, SSE, or HTTP transport.
          </p>
        </div>
        <Button variant="outline" onClick={handleImportConfig}>
          <Upload className="w-4 h-4 mr-2" />
          Import Config
        </Button>
      </div>

      <div className="rounded-lg border p-6 bg-card space-y-6">
        {/* Transport Type Selector */}
        <div className="space-y-3">
          <Label>Transport Type</Label>
          <RadioGroup value={transportType} onValueChange={(v) => setTransportType(v as TransportType)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="stdio" id="stdio" />
              <Label htmlFor="stdio" className="font-normal cursor-pointer">
                <div>
                  <div className="font-medium">stdio</div>
                  <div className="text-sm text-muted-foreground">
                    Local process (command line)
                  </div>
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="http" id="http" />
              <Label htmlFor="http" className="font-normal cursor-pointer">
                <div>
                  <div className="font-medium">HTTP</div>
                  <div className="text-sm text-muted-foreground">
                    Streamable HTTP with SSE fallback
                  </div>
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="sse" id="sse" />
              <Label htmlFor="sse" className="font-normal cursor-pointer">
                <div>
                  <div className="font-medium">SSE</div>
                  <div className="text-sm text-muted-foreground">
                    Server-Sent Events (legacy)
                  </div>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* stdio Configuration */}
        {transportType === 'stdio' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="command">Command</Label>
              <Input
                id="command"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="node"
              />
              <p className="text-sm text-muted-foreground">
                The command to execute (e.g., node, python, npx)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="args">Arguments (comma-separated)</Label>
              <Input
                id="args"
                value={args}
                onChange={(e) => setArgs(e.target.value)}
                placeholder="server.js, --port, 3000"
              />
              <p className="text-sm text-muted-foreground">
                Command line arguments
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="env">Environment Variables (one per line)</Label>
              <Textarea
                id="env"
                value={envVars}
                onChange={(e) => setEnvVars(e.target.value)}
                placeholder="API_KEY=your-key\nDEBUG=true"
                rows={4}
              />
              <p className="text-sm text-muted-foreground">
                Format: KEY=VALUE
              </p>
            </div>
          </div>
        )}

        {/* Remote Configuration (HTTP/SSE) */}
        {(transportType === 'http' || transportType === 'sse') && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">Server URL</Label>
              <Input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="http://localhost:3001/mcp"
              />
              <p className="text-sm text-muted-foreground">
                The MCP server endpoint
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="headers">Custom Headers (one per line)</Label>
              <Textarea
                id="headers"
                value={headers}
                onChange={(e) => setHeaders(e.target.value)}
                placeholder="Authorization: Bearer token\nX-Custom-Header: value"
                rows={4}
              />
              <p className="text-sm text-muted-foreground">
                Format: Header-Name: value
              </p>
            </div>
          </div>
        )}

        {/* Connection Status */}
        {connectionError && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{connectionError}</AlertDescription>
          </Alert>
        )}

        {isConnected && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Successfully connected to MCP server!
            </AlertDescription>
          </Alert>
        )}

        {/* Connect Button */}
        <Button
          onClick={handleConnect}
          disabled={isConnecting || isConnected}
          className="w-full"
        >
          {isConnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isConnected ? 'Connected' : 'Connect'}
        </Button>
      </div>
    </div>
  );
}
