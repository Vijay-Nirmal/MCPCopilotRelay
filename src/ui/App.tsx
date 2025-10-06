import { useEffect, useState } from 'react';
import { useWizardStore } from './store/wizard-store';
import { WizardSteps } from './components/wizard/WizardSteps';
import { ConnectionStep } from './components/wizard/ConnectionStep';
import { DiscoveryStep } from './components/wizard/DiscoveryStep';
import { MappingStep } from './components/wizard/MappingStep';
import { ExtensionInfoStep } from './components/wizard/ExtensionInfoStep';
import { PreviewBuildStep } from './components/wizard/PreviewBuildStep';
import { Button } from './components/ui/button';
import { Moon, Sun, Download, Upload } from 'lucide-react';

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const currentStep = useWizardStore((state) => state.currentStep);
  const prevStep = useWizardStore((state) => state.prevStep);
  const nextStep = useWizardStore((state) => state.nextStep);
  const reset = useWizardStore((state) => state.reset);
  const exportConfig = useWizardStore((state) => state.exportConfig);
  const importConfig = useWizardStore((state) => state.importConfig);

  useEffect(() => {
    // Set theme based on system preference
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(isDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const handleExport = () => {
    const config = exportConfig();
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mcp-extension-config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const text = await file.text();
        const config = JSON.parse(text);
        importConfig(config);
      }
    };
    input.click();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <ConnectionStep />;
      case 1:
        return <DiscoveryStep />;
      case 2:
        return <MappingStep />;
      case 3:
        return <ExtensionInfoStep />;
      case 4:
        return <PreviewBuildStep />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">MCP Copilot Relay</h1>
            <p className="text-sm text-muted-foreground">
              Generate VS Code Extensions from MCP Servers
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export Config
            </Button>
            <Button variant="outline" size="sm" onClick={handleImport}>
              <Upload className="w-4 h-4 mr-2" />
              Import Config
            </Button>
            <Button variant="outline" size="sm" onClick={toggleTheme}>
              {theme === 'light' ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" />
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={reset}>
              Reset
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Progress Steps */}
          <WizardSteps currentStep={currentStep} />

          {/* Step Content */}
          <div className="mt-8 min-h-[500px]">{renderStep()}</div>

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-8 border-t">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
            >
              Previous
            </Button>
            <Button
              onClick={nextStep}
              disabled={currentStep === 4}
            >
              Next
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>
            Built with ❤️ for the MCP community |{' '}
            <a
              href="https://github.com/vijay-nirmal/mcp-copilot-relay"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              GitHub
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
