# NotesMD CLI — Reference

> MIT license. Go. 1,349 stars. Formerly "obsidian-cli."
> Repo: `Yakitrak/notesmd-cli`

## What It Does

Headless CLI for markdown vault operations. Works WITHOUT Obsidian installed. Reads vault config from `~/.config/obsidian/obsidian.json` for path discovery, but operates directly on markdown files.

## Commands

```bash
notesmd open <note>              # Open note in editor (--editor flag for terminal)
notesmd search <query>           # Search note titles
notesmd search-content <query>   # Full-text search across content
notesmd list                     # List all notes in vault
notesmd move <note> <folder>     # Move note to folder
notesmd create <note>            # Create new note
notesmd update <note>            # Update note content
notesmd delete <note>            # Delete note
notesmd daily                    # Open/create daily note
notesmd set-default <vault>      # Set default vault
```

## Multi-Vault Support

```bash
notesmd --vault "My Research" list
notesmd --vault "Work Notes" search "meeting"
```

## Vault Discovery Pattern

Reads `~/.config/obsidian/obsidian.json` which maps vault names to filesystem paths. This is the pattern Grimoire could adopt: a config file that maps grimoire names to their directories.

```json
{
  "vaults": {
    "abc123": {
      "path": "/Users/ved/Developer/grimoire-claude-code",
      "ts": 1712345678
    }
  }
}
```

## Relevance to Grimoire CLI

If we build a `grimoire` CLI wrapper, the command structure maps well:

| NotesMD | Grimoire equivalent |
|---------|-------------------|
| `create` | `grimoire init` |
| `search` | `grimoire query` |
| `search-content` | `grimoire search` |
| `list` | `grimoire list-topics` |
| `set-default` | `grimoire use <name>` |

The headless operation pattern (no app dependency, direct file access) is exactly what Grimoire needs.
