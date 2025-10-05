# Contributing to MCP Copilot Relay

Thank you for your interest in contributing to MCP Copilot Relay! This document provides guidelines and instructions for contributing.

## Code of Conduct

Be respectful, inclusive, and considerate in all interactions. We're here to build something great together!

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/yourusername/mcp-copilot-relay/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - VSCode version, OS, and extension version
   - Relevant logs from the Output channel

### Suggesting Features

1. Check existing [Issues](https://github.com/yourusername/mcp-copilot-relay/issues) and [Discussions](https://github.com/yourusername/mcp-copilot-relay/discussions)
2. Create a new issue with:
   - Clear description of the feature
   - Use cases and benefits
   - Possible implementation approach (if you have ideas)

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Test thoroughly
5. Commit with clear messages: `git commit -m 'Add amazing feature'`
6. Push to your fork: `git push origin feature/amazing-feature`
7. Open a Pull Request

## Development Setup

### Prerequisites

- Node.js 18.x or higher
- Visual Studio Code 1.95.0 or higher
- Git

### Getting Started

```bash
# Clone your fork
git clone https://github.com/yourusername/mcp-copilot-relay.git
cd mcp-copilot-relay

# Install dependencies
npm install

# Build the extension
npm run compile

# Run in watch mode
npm run watch
```

### Running the Extension

1. Press F5 in VSCode to open a new Extension Development Host window
2. The extension will be loaded automatically
3. Make changes and reload the window to test (Ctrl+R)

### Project Structure

```
src/
├── extension.ts           # Main entry point
├── types.ts              # TypeScript type definitions
├── mcpClient/            # MCP protocol client
│   ├── MCPClient.ts      # Client implementation
│   └── index.ts
├── config/               # Configuration management
│   ├── ConfigManager.ts  # Settings handling
│   └── index.ts
├── toolRegistry/         # Tool registration
│   ├── ToolRegistry.ts   # VSCode API integration
│   └── index.ts
└── ui/                   # User interface
    ├── WebviewProvider.ts # Webview management
    ├── webview.js        # UI logic
    ├── webview.css       # Styles
    └── webview.html      # HTML template
```

## Development Guidelines

### Code Style

- Use TypeScript for all new code
- Follow the existing code style
- Run ESLint: `npm run lint`
- Use meaningful variable and function names
- Add comments for complex logic

### TypeScript

- Use strict type checking
- Avoid `any` types when possible
- Define interfaces for complex types
- Export types that may be reused

### Commit Messages

Follow conventional commits format:

```
feat: add new feature
fix: fix bug in component
docs: update README
style: format code
refactor: restructure module
test: add tests
chore: update dependencies
```

### Testing

- Test all changes manually in the Extension Development Host
- Test with multiple MCP servers
- Test error cases and edge cases
- Verify UI works with different themes

### Documentation

- Update README.md for new features
- Add JSDoc comments for public APIs
- Create examples for new functionality

## Areas for Contribution

### High Priority

- [ ] Add unit tests
- [ ] Add integration tests
- [ ] Improve error messages
- [ ] Add more configuration validation
- [ ] Performance optimizations

### Medium Priority

- [ ] Tool invocation history view
- [ ] Export/import server configurations
- [ ] Server configuration templates
- [ ] Search and filter tools
- [ ] Batch operations for tools

### Low Priority

- [ ] Tool usage analytics
- [ ] Custom themes for webview
- [ ] Keyboard shortcuts
- [ ] Multi-language support

### Documentation

- [ ] Video tutorials
- [ ] More examples
- [ ] Troubleshooting guide expansion
- [ ] API documentation

## Pull Request Process

1. **Before Starting**: Comment on the issue you want to work on (or create one)
2. **Development**: Follow the guidelines above
3. **Testing**: Thoroughly test your changes
4. **Documentation**: Update relevant documentation
5. **Submit PR**: 
   - Clear title describing the change
   - Reference related issues
   - Describe what you changed and why
   - Include screenshots for UI changes
6. **Review**: Address feedback from maintainers
7. **Merge**: Once approved, a maintainer will merge

## Review Process

- PRs are typically reviewed within 48 hours
- Feedback may be provided for improvements
- Changes may be requested before merging
- Be patient and responsive to feedback

## Release Process

1. Version bump in package.json
2. Update CHANGELOG.md
3. Create git tag
4. Build and package extension
5. Publish to marketplace (maintainers only)

## Questions?

- Open a [Discussion](https://github.com/yourusername/mcp-copilot-relay/discussions)
- Comment on relevant issues
- Reach out to maintainers

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Recognition

All contributors will be recognized in:
- CONTRIBUTORS.md file
- Release notes
- Project README

Thank you for contributing! 🎉
