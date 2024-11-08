# FOLD Preview - VS Code Extension

A VS Code extension for previewing and editing FOLD (Flexible Origami File Format) files. This extension provides syntax highlighting, formatting, and an interactive preview for .fold files.

[![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/ColemanLai.fold-preview)](https://marketplace.visualstudio.com/items?itemName=ColemanLai.fold-preview)
[![Visual Studio Marketplace Downloads](https://img.shields.io/visual-studio-marketplace/d/ColemanLai.fold-preview)](https://marketplace.visualstudio.com/items?itemName=ColemanLai.fold-preview)
[![GitHub](https://img.shields.io/github/license/Googolplexic/vscode-fold-preview)](https://github.com/Googolplexic/vscode-fold-preview/blob/main/LICENSE)

## Features

### Interactive Preview
- Live preview of FOLD files with pan and zoom capabilities
- Color-coded visualization of mountain and valley folds
- Auto-updates as you edit the file
- Keyboard shortcuts for common actions

### Editor Features
- Syntax highlighting for .fold files
- JSON formatting with customizable indentation
- Format on save support
- Custom file icon with folded corner design
- Bracket matching and auto-closing pairs

## Installation

Install from the [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=ColemanLai.fold-preview) or:

1. Open VS Code
2. Press `Ctrl+P` (`Cmd+P` on macOS)
3. Type `ext install ColemanLai.fold-preview`
4. Press Enter

## Usage

### Opening the Preview
- Click the "Open Preview to the Side" button in the editor title area
- Use the keyboard shortcut `Ctrl+K V` (`Cmd+K V` on macOS)
- Right-click on a .fold file and select "Open With... > FOLD Preview"

### Preview Controls
- Zoom: Mouse wheel or `+`/`-` keys
- Pan: Click and drag
- Reset View: `R` key or "Reset Zoom" button
- Fit to View: `F` key or "Fit to View" button

### Formatting
- Use `Shift+Alt+F` to format the document
- Right-click and select "Format Document"
- Enable format on save in VS Code settings

## Configuration

### Indentation
Customize the number of spaces used for indentation in your VS Code settings:

```json
{
    "fold-preview.tabSize": 2  // Default is 2, range: 1-8
}
```

## Line Types
The preview uses different colors to represent fold types:
- Black: Boundary edges
- Red: Mountain folds
- Blue: Valley folds

## Requirements

- Visual Studio Code version 1.80.0 or higher

## Known Issues and Feature Requests

Please report any issues or feature requests on the [GitHub repository](https://github.com/Googolplexic/vscode-fold-preview/issues).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgements

- FOLD file specification: https://github.com/edemaine/fold
- Claude AI by Anthropic

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Release Notes

See [CHANGELOG.md](https://github.com/Googolplexic/vscode-fold-preview/CHANGELOG.md)
---

**Enjoy!**