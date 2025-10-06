import { useWizardStore } from '../../store/wizard-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Plus, Trash2, Info, Settings } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';

export function ExtensionInfoStep() {
  const { extensionInfo, setExtensionInfo } = useWizardStore();

  const handleFieldChange = (field: keyof typeof extensionInfo, value: string) => {
    setExtensionInfo({
      ...extensionInfo,
      [field]: value,
    } as any);
  };

  const handleSettingChange = (index: number, field: string, value: string) => {
    const newSettings = [...extensionInfo.settings];
    newSettings[index] = {
      ...newSettings[index],
      [field]: value,
    } as any;
    setExtensionInfo({
      ...extensionInfo,
      settings: newSettings,
    });
  };

  const addSetting = () => {
    setExtensionInfo({
      ...extensionInfo,
      settings: [
        ...extensionInfo.settings,
        {
          key: '',
          type: 'string',
          description: '',
          default: '',
          mcpMapping: {
            target: 'header',
            key: '',
            required: false,
          },
          secret: false,
        },
      ],
    });
  };

  const removeSetting = (index: number) => {
    const newSettings = extensionInfo.settings.filter((_: any, i: number) => i !== index);
    setExtensionInfo({
      ...extensionInfo,
      settings: newSettings,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Extension Info</h2>
        <p className="text-muted-foreground">
          Configure your VS Code extension metadata and settings
        </p>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Required metadata for your VS Code extension
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={extensionInfo.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="my-mcp-extension"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Lowercase, no spaces. Used as the extension identifier.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">
                Display Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="displayName"
                value={extensionInfo.displayName}
                onChange={(e) => handleFieldChange('displayName', e.target.value)}
                placeholder="My MCP Extension"
              />
              <p className="text-xs text-muted-foreground">
                Human-readable name shown in VS Code.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              value={extensionInfo.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="A brief description of what your extension does"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="version">
                Version <span className="text-destructive">*</span>
              </Label>
              <Input
                id="version"
                value={extensionInfo.version}
                onChange={(e) => handleFieldChange('version', e.target.value)}
                placeholder="0.1.0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="publisher">
                Publisher <span className="text-destructive">*</span>
              </Label>
              <Input
                id="publisher"
                value={extensionInfo.publisher}
                onChange={(e) => handleFieldChange('publisher', e.target.value)}
                placeholder="your-publisher-id"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="license">License</Label>
              <Input
                id="license"
                value={extensionInfo.license}
                onChange={(e) => handleFieldChange('license', e.target.value)}
                placeholder="MIT"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="author">Author</Label>
              <Input
                id="author"
                value={extensionInfo.author}
                onChange={(e) => handleFieldChange('author', e.target.value)}
                placeholder="Your Name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="repository">Repository</Label>
              <Input
                id="repository"
                value={extensionInfo.repository}
                onChange={(e) => handleFieldChange('repository', e.target.value)}
                placeholder="https://github.com/user/repo"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="icon">Extension Icon (optional)</Label>
            <div className="flex gap-2">
              <Input
                id="icon"
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    // Read file as base64
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const base64Data = event.target?.result as string;
                      setExtensionInfo({
                        ...extensionInfo,
                        icon: file.name,
                        iconFileName: file.name,
                        iconFileData: base64Data,
                      });
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="flex-1"
              />
              {extensionInfo.icon && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setExtensionInfo({
                      ...extensionInfo,
                      icon: '',
                      iconFileName: undefined,
                      iconFileData: undefined,
                    });
                    // Reset the file input
                    const input = document.getElementById('icon') as HTMLInputElement;
                    if (input) input.value = '';
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Upload icon file (128x128 PNG recommended). Will be included in the extension package.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configuration Settings
              </CardTitle>
              <CardDescription>
                Define user-configurable settings and map them to MCP connection parameters
              </CardDescription>
            </div>
            <Button onClick={addSetting} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Setting
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>MCP Mapping Examples:</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• <strong>Header:</strong> API key for Context7 (<code>CONTEXT7_API_KEY</code> header)</li>
                <li>• <strong>Env Variable:</strong> Database connection string (<code>DATABASE_URL</code> env)</li>
                <li>• <strong>Command Arg:</strong> Server path (<code>--config</code> argument)</li>
                <li>• <strong>URL Param:</strong> Query parameter for HTTP transport (<code>api_key</code> in URL)</li>
              </ul>
            </AlertDescription>
          </Alert>

          {extensionInfo.settings.length === 0 ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                No settings configured. Add settings to allow users to configure MCP connection parameters like API keys, server paths, or custom options.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {extensionInfo.settings.map((setting: any, index: number) => (
                <Card key={index} className="border-2">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium">Setting {index + 1}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSetting(index)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Basic Setting Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`setting-key-${index}`}>
                          Setting Key <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id={`setting-key-${index}`}
                          value={setting.key}
                          onChange={(e) => handleSettingChange(index, 'key', e.target.value)}
                          placeholder="apiKey"
                          className="font-mono"
                        />
                        <p className="text-xs text-muted-foreground">
                          VS Code setting name (lowercase, camelCase)
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`setting-type-${index}`}>Type</Label>
                        <Select
                          value={setting.type}
                          onValueChange={(value) => handleSettingChange(index, 'type', value)}
                        >
                          <SelectTrigger id={`setting-type-${index}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="string">String</SelectItem>
                            <SelectItem value="boolean">Boolean</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="object">Object</SelectItem>
                            <SelectItem value="array">Array</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`setting-description-${index}`}>
                        Description <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        id={`setting-description-${index}`}
                        value={setting.description}
                        onChange={(e) => handleSettingChange(index, 'description', e.target.value)}
                        placeholder="e.g., API key for authenticating with the MCP server"
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`setting-default-${index}`}>Default Value</Label>
                      <Input
                        id={`setting-default-${index}`}
                        value={setting.default}
                        onChange={(e) => handleSettingChange(index, 'default', e.target.value)}
                        placeholder="(optional)"
                      />
                    </div>

                    {/* MCP Mapping Section */}
                    <div className="border-t pt-4 space-y-4">
                      <h5 className="font-medium text-sm">MCP Connection Mapping</h5>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`setting-target-${index}`}>
                            Inject Into <span className="text-destructive">*</span>
                          </Label>
                          <Select
                            value={setting.mcpMapping?.target || 'header'}
                            onValueChange={(value: string) => {
                              const newSettings = [...extensionInfo.settings];
                              const currentSetting = newSettings[index];
                              if (currentSetting) {
                                newSettings[index] = {
                                  ...currentSetting,
                                  mcpMapping: {
                                    ...(currentSetting.mcpMapping || { target: 'header', key: '', required: false }),
                                    target: value as any,
                                  },
                                } as any;
                                setExtensionInfo({ ...extensionInfo, settings: newSettings });
                              }
                            }}
                          >
                            <SelectTrigger id={`setting-target-${index}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="header">HTTP Header</SelectItem>
                              <SelectItem value="env">Environment Variable</SelectItem>
                              <SelectItem value="arg">Command Argument</SelectItem>
                              <SelectItem value="url-param">URL Parameter</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`setting-mcp-key-${index}`}>
                            Parameter Name <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id={`setting-mcp-key-${index}`}
                            value={setting.mcpMapping?.key || ''}
                            onChange={(e) => {
                              const newSettings = [...extensionInfo.settings];
                              const currentSetting = newSettings[index];
                              if (currentSetting) {
                                newSettings[index] = {
                                  ...currentSetting,
                                  mcpMapping: {
                                    ...(currentSetting.mcpMapping || { target: 'header', key: '', required: false }),
                                    key: e.target.value,
                                  },
                                } as any;
                                setExtensionInfo({ ...extensionInfo, settings: newSettings });
                              }
                            }}
                            placeholder={
                              setting.mcpMapping?.target === 'header' ? 'Authorization' :
                              setting.mcpMapping?.target === 'env' ? 'API_KEY' :
                              setting.mcpMapping?.target === 'arg' ? '--api-key' :
                              'api_key'
                            }
                            className="font-mono"
                          />
                          <p className="text-xs text-muted-foreground">
                            {setting.mcpMapping?.target === 'header' && 'HTTP header name (e.g., CONTEXT7_API_KEY)'}
                            {setting.mcpMapping?.target === 'env' && 'Environment variable name (e.g., DATABASE_URL)'}
                            {setting.mcpMapping?.target === 'arg' && 'Command line flag (e.g., --config)'}
                            {setting.mcpMapping?.target === 'url-param' && 'URL query parameter (e.g., api_key)'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`setting-required-${index}`}
                          checked={setting.mcpMapping?.required || false}
                          onCheckedChange={(checked) => {
                            const newSettings = [...extensionInfo.settings];
                            const currentSetting = newSettings[index];
                            if (currentSetting) {
                              newSettings[index] = {
                                ...currentSetting,
                                mcpMapping: {
                                  ...(currentSetting.mcpMapping || { target: 'header', key: '', required: false }),
                                  required: checked as boolean,
                                },
                              } as any;
                              setExtensionInfo({ ...extensionInfo, settings: newSettings });
                            }
                          }}
                        />
                        <Label htmlFor={`setting-required-${index}`} className="text-sm font-normal">
                          Required for MCP connection
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`setting-secret-${index}`}
                          checked={setting.secret || false}
                          onCheckedChange={(checked) => {
                            const newSettings = [...extensionInfo.settings];
                            newSettings[index] = {
                              ...newSettings[index],
                              secret: checked as boolean,
                            } as any;
                            setExtensionInfo({ ...extensionInfo, settings: newSettings });
                          }}
                        />
                        <Label htmlFor={`setting-secret-${index}`} className="text-sm font-normal">
                          Secret value (API key, token, password)
                        </Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validation Alert */}
      {(!extensionInfo.name || !extensionInfo.displayName || !extensionInfo.description || 
        !extensionInfo.version || !extensionInfo.publisher) && (
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Please fill in all required fields (marked with *) before proceeding.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
