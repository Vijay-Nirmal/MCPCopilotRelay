import { useWizardStore } from '../../store/wizard-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Alert, AlertDescription } from '../ui/alert';
import { Wrench, MessageSquare, FileText, Info } from 'lucide-react';

export function MappingStep() {
  const {
    capabilities,
    toolMappings,
    promptMappings,
    setToolMappings,
    setPromptMappings,
  } = useWizardStore();

  // Handle tool mapping toggle
  const handleToolToggle = (toolName: string, checked: boolean) => {
    const newMappings = { ...toolMappings };
    
    if (checked) {
      // Find the tool to get its description
      const tool = capabilities?.tools?.find((t: any) => t.name === toolName);
      newMappings[toolName] = {
        name: toolName,
        toolId: toolName, // Default to original name
        selected: true,
        type: 'lm-tool',
        displayName: toolName,
        description: tool?.description || '',
      };
    } else {
      delete newMappings[toolName];
    }
    
    setToolMappings(newMappings);
  };

  // Handle tool mapping type change
  const handleToolTypeChange = (toolName: string, type: 'lm-tool' | 'command') => {
    const newMappings = { ...toolMappings };
    if (newMappings[toolName]) {
      newMappings[toolName].type = type;
      setToolMappings(newMappings);
    }
  };

  // Handle tool display name change
  const handleToolDisplayNameChange = (toolName: string, displayName: string) => {
    const newMappings = { ...toolMappings };
    if (newMappings[toolName]) {
      newMappings[toolName].displayName = displayName;
      setToolMappings(newMappings);
    }
  };

  // Handle tool description change
  const handleToolDescriptionChange = (toolName: string, description: string) => {
    const newMappings = { ...toolMappings };
    if (newMappings[toolName]) {
      newMappings[toolName].description = description;
      setToolMappings(newMappings);
    }
  };

  // Handle tool ID change
  const handleToolIdChange = (originalToolName: string, newToolId: string) => {
    const newMappings = { ...toolMappings };
    if (newMappings[originalToolName]) {
      // Basic validation: ensure valid identifier format
      const sanitizedToolId = newToolId.replace(/[^a-zA-Z0-9_]/g, '_');
      newMappings[originalToolName].toolId = sanitizedToolId;
      setToolMappings(newMappings);
    }
  };

  // Check for duplicate tool IDs
  const getDuplicateToolIds = () => {
    const toolIds = Object.values(toolMappings).map(m => m.toolId);
    const duplicates = toolIds.filter((id, index) => toolIds.indexOf(id) !== index);
    return [...new Set(duplicates)];
  };

  // Handle prompt mapping toggle
  const handlePromptToggle = (promptName: string, checked: boolean) => {
    const newMappings = { ...promptMappings };
    
    if (checked) {
      // Find the prompt to get its description
      const prompt = capabilities?.prompts?.find((p: any) => p.name === promptName);
      newMappings[promptName] = {
        name: promptName,
        selected: true,
        type: 'chat-participant',
        displayName: promptName,
        description: prompt?.description || '',
      };
    } else {
      delete newMappings[promptName];
    }
    
    setPromptMappings(newMappings);
  };

  // Handle prompt display name change
  const handlePromptDisplayNameChange = (promptName: string, displayName: string) => {
    const newMappings = { ...promptMappings };
    if (newMappings[promptName]) {
      newMappings[promptName].displayName = displayName;
      setPromptMappings(newMappings);
    }
  };

  // Handle prompt description change
  const handlePromptDescriptionChange = (promptName: string, description: string) => {
    const newMappings = { ...promptMappings };
    if (newMappings[promptName]) {
      newMappings[promptName].description = description;
      setPromptMappings(newMappings);
    }
  };

  if (!capabilities) {
    return (
      <div className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            No capabilities discovered. Please go back to the Discovery step.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const hasTools = capabilities?.tools && capabilities.tools.length > 0;
  const hasPrompts = capabilities?.prompts && capabilities.prompts.length > 0;
  const hasResources = capabilities?.resources && capabilities.resources.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Map to VS Code</h2>
        <p className="text-muted-foreground">
          Select capabilities to include and configure how they map to VS Code features
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Tools</strong> can be mapped to Language Model Tools (recommended) or VS Code Commands.{' '}
          <strong>Prompts</strong> are mapped to Chat Participants for conversational interfaces.
        </AlertDescription>
      </Alert>

      {/* Tools Section */}
      {hasTools && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            <h3 className="text-xl font-semibold">Tools ({capabilities.tools?.length || 0})</h3>
          </div>
          
          <div className="grid gap-4">
            {capabilities.tools?.map((tool: any) => {
              const isSelected = !!toolMappings[tool.name];
              const mapping = toolMappings[tool.name];
              
              return (
                <Card key={tool.name}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={`tool-${tool.name}`}
                          checked={isSelected}
                          onCheckedChange={(checked) => handleToolToggle(tool.name, checked as boolean)}
                          className="mt-1"
                        />
                        <div className="space-y-1">
                          <Label htmlFor={`tool-${tool.name}`} className="font-mono text-sm cursor-pointer">
                            {tool.name}
                          </Label>
                          {tool.description && (
                            <CardDescription>{tool.description}</CardDescription>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {isSelected && mapping && (
                    <CardContent className="space-y-4 border-t pt-4">
                      {/* Mapping Type */}
                      <div className="space-y-2">
                        <Label>Map to</Label>
                        <RadioGroup
                          value={mapping.type}
                          onValueChange={(value) => handleToolTypeChange(tool.name, value as 'lm-tool' | 'command')}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="lm-tool" id={`${tool.name}-lm-tool`} />
                            <Label htmlFor={`${tool.name}-lm-tool`} className="font-normal cursor-pointer">
                              Language Model Tool (Recommended)
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="command" id={`${tool.name}-command`} />
                            <Label htmlFor={`${tool.name}-command`} className="font-normal cursor-pointer">
                              VS Code Command
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      {/* Tool ID */}
                      <div className="space-y-2">
                        <Label htmlFor={`${tool.name}-toolid`}>Tool ID</Label>
                        <Input
                          id={`${tool.name}-toolid`}
                          value={mapping.toolId}
                          onChange={(e) => handleToolIdChange(tool.name, e.target.value)}
                          placeholder="e.g., read_file"
                          className={`font-mono ${getDuplicateToolIds().includes(mapping.toolId) ? 'border-red-500' : ''}`}
                        />
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">
                            Identifier used in VS Code. Must be unique and contain only letters, numbers, and underscores.
                          </p>
                          {getDuplicateToolIds().includes(mapping.toolId) && (
                            <p className="text-xs text-red-500">
                              ⚠️ This tool ID is already used by another tool. Please choose a unique identifier.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Display Name */}
                      <div className="space-y-2">
                        <Label htmlFor={`${tool.name}-display`}>Display Name</Label>
                        <Input
                          id={`${tool.name}-display`}
                          value={mapping.displayName}
                          onChange={(e) => handleToolDisplayNameChange(tool.name, e.target.value)}
                          placeholder="e.g., Read File"
                        />
                      </div>

                      {/* Description */}
                      <div className="space-y-2">
                        <Label htmlFor={`${tool.name}-desc`}>Description</Label>
                        <Textarea
                          id={`${tool.name}-desc`}
                          value={mapping.description}
                          onChange={(e) => handleToolDescriptionChange(tool.name, e.target.value)}
                          placeholder="What does this tool do?"
                          rows={2}
                        />
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Prompts Section */}
      {hasPrompts && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            <h3 className="text-xl font-semibold">Prompts ({capabilities.prompts?.length || 0})</h3>
          </div>
          
          <div className="grid gap-4">
            {capabilities.prompts?.map((prompt: any) => {
              const isSelected = !!promptMappings[prompt.name];
              const mapping = promptMappings[prompt.name];
              
              return (
                <Card key={prompt.name}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={`prompt-${prompt.name}`}
                          checked={isSelected}
                          onCheckedChange={(checked) => handlePromptToggle(prompt.name, checked as boolean)}
                          className="mt-1"
                        />
                        <div className="space-y-1">
                          <Label htmlFor={`prompt-${prompt.name}`} className="font-mono text-sm cursor-pointer">
                            {prompt.name}
                          </Label>
                          {prompt.description && (
                            <CardDescription>{prompt.description}</CardDescription>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {isSelected && mapping && (
                    <CardContent className="space-y-4 border-t pt-4">
                      <Alert>
                        <MessageSquare className="h-4 w-4" />
                        <AlertDescription>
                          This prompt will be available as a Chat Participant using @{mapping.displayName.toLowerCase().replace(/\s+/g, '-')}
                        </AlertDescription>
                      </Alert>

                      {/* Display Name */}
                      <div className="space-y-2">
                        <Label htmlFor={`${prompt.name}-display`}>Display Name</Label>
                        <Input
                          id={`${prompt.name}-display`}
                          value={mapping.displayName}
                          onChange={(e) => handlePromptDisplayNameChange(prompt.name, e.target.value)}
                          placeholder="e.g., Code Helper"
                        />
                      </div>

                      {/* Description */}
                      <div className="space-y-2">
                        <Label htmlFor={`${prompt.name}-desc`}>Description</Label>
                        <Textarea
                          id={`${prompt.name}-desc`}
                          value={mapping.description}
                          onChange={(e) => handlePromptDescriptionChange(prompt.name, e.target.value)}
                          placeholder="What does this prompt do?"
                          rows={2}
                        />
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Resources Info */}
      {hasResources && (
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>
            <strong>Resources</strong> ({capabilities.resources?.length || 0}) will be automatically exposed through the MCP client.
            No explicit mapping required.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary */}
      {(hasTools || hasPrompts) && (
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle>Selection Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>Selected Tools:</span>
              <span className="font-semibold">{Object.keys(toolMappings).length}</span>
            </div>
            <div className="flex justify-between">
              <span>Selected Prompts:</span>
              <span className="font-semibold">{Object.keys(promptMappings).length}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Capabilities:</span>
              <span className="font-semibold">
                {Object.keys(toolMappings).length + Object.keys(promptMappings).length}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
