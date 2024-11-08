# FOLD Preview

Interactive preview and editor support for FOLD (Flexible Origami File Format) files. View, edit, and format your .fold files with ease.

## Features

### 🔍 Interactive Preview
Watch your FOLD files come to life with a real-time, interactive preview:
- Pan and zoom controls
- Color-coded mountain and valley folds
- Live updates as you edit
- Keyboard shortcuts for quick navigation

![Preview Demo](media/image.png)

### ✨ Editor Enhancements
Work efficiently with powerful editor features:
- Syntax highlighting
- Customizable JSON formatting
- Format on save support
- Custom file icons
- Smart bracket matching

## Quick Start

1. Open a .fold file
2. Click the preview icon in the editor title bar (or use `Ctrl+K V` / `Cmd+K V`)
3. Edit your file and watch the preview update in real-time

### Preview Controls
- 🖱️ **Zoom**: Mouse wheel or `+`/`-` keys
- 🖐️ **Pan**: Click and drag
- 🔄 **Reset**: `R` key or "Reset Zoom" button
- 📐 **Fit**: `F` key or "Fit to View" button

### Formatting
Keep your FOLD files clean and consistent:
- Format Document: `Shift+Alt+F`
- Right-click → Format Document
- Automatic formatting on save (optional)

## Configuration

Customize the indentation in your settings:
```json
{
    "fold-preview.tabSize": 2  // Set your preferred indent size (1-8)
}
```

## Color Guide
The preview uses intuitive colors:
- ⚫ **Black**: Boundary edges
- 🔴 **Red**: Mountain folds
- 🔵 **Blue**: Valley folds

## Requirements

Visual Studio Code version 1.80.0 or higher

## Credits

- FOLD file specification: https://github.com/edemaine/fold
- Claude AI by Anthropic

## Support

Found a bug or have a suggestion? Please report it on my [GitHub repository](https://github.com/Googolplexic/vscode-fold-preview/issues).

**Enjoy working with FOLD files!**