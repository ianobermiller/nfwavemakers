package main

import (
	"log"
	"path/filepath"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/plugins/jsvm"
)

func main() {
	app := pocketbase.New()

	// Hooks and JS migrations live next to pb_data (WorkingDirectory=/opt/pb-nfw).
	dataDir := app.DataDir()
	jsvm.MustRegister(app, jsvm.Config{
		HooksDir:               filepath.Join(dataDir, "..", "pb_hooks"),
		MigrationsDir:          filepath.Join(dataDir, "..", "pb_migrations"),
		HooksWatch:             false,
		HooksPoolSize:          8,
		// Skip macOS AppleDouble (._*) and other dotfiles that tar can leave behind.
		HooksFilesPattern:      `^[^.].*\.pb\.(js|ts)$`,
		MigrationsFilesPattern: `^[^.].*\.(js|ts)$`,
	})

	registerPasskey(app)

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}
