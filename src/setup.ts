export class ShellGameSetup extends Application {
  static selectedTokenId: string | null = null;

  static openWindow() {
    new ShellGameSetup().render(true);
  }

  static get defaultOptions(): ApplicationOptions {
    const options = super.defaultOptions;
    options.id = "shell-game-setup";
    options.title = "Shell Game Setup";
    options.template = "modules/shell-game/templates/shell-setup.html";
        options.width = 350;
        options.height = "auto";
        options.popOut = true;
        return options;
    }

    getData(): any {
        const allTokens = canvas.tokens?.placeables ?? [];

        const unownedTokens = allTokens.filter(t => {
            const actor = t.actor;
            if (!actor) return true;

            return !actor.hasPlayerOwner;
        });

        const tokens = unownedTokens.map(t => ({
            id: t.id ?? "",
            name: t.name ?? t.document.name ?? "Unnamed"
        }));

        return { tokens };
    }

  activateListeners(html: JQuery) {
    super.activateListeners(html);

    html.find("input[name='shell-source-token']").on("change", ev => {
      const target = ev.currentTarget as HTMLInputElement;
      ShellGameSetup.selectedTokenId = target.value || null;
    });

    html.find("button[name='shell-create-fake']").on("click", ev => {
      ev.preventDefault();
      const id =
        ShellGameSetup.selectedTokenId ??
        (html.find("input[name='shell-source-token']:checked").val() as string | undefined);

      if (!id) {
        ui.notifications.warn("Shell Game: Please select a token first.");
        return;
      }

      const sourceToken = canvas.tokens?.get(id);
      if (!sourceToken) {
            ui.notifications.error("Shell Game: Selected token no longer exists.");
            return;
        }

        ShellGameSetup.createFake(sourceToken.id!);
    });
    }

    static async createFake(sourceTokenId: string): Promise<void> {
        if (!canvas || !canvas.scene || !canvas.tokens) {
            ui.notifications?.error("Shell Game: No active scene to place a fake token.");
            return;
        }

        const source = canvas.tokens.get(sourceTokenId);
        if (!source) {
            ui.notifications?.error("Shell Game: Could not find the source token to clone.");
            return;
        }

        ui.notifications?.info("Shell Game: Click on the scene to start placing the fake token.");

        const handler = async (event: any) => {
            try {
                if (event.button !== 0) return;

                canvas.stage.off("pointerdown", handler);

                if (!canvas.scene || !canvas.tokens) return;

                const pos = event.data.getLocalPosition(canvas.tokens);
                const snapped = canvas.grid?.getSnappedPosition(pos.x, pos.y, 1) ?? { x: pos.x, y: pos.y };

                const data = source.document.toObject();

                delete (data as any)._id;
                (data as any).x = snapped.x;
                (data as any).y = snapped.y;

                const createdDocs = await canvas.scene.createEmbeddedDocuments("Token", [data]);
                const createdDoc = createdDocs[0] as TokenDocument | undefined;
                if (!createdDoc) return;

                const newToken = canvas.tokens.get(createdDoc.id!);
                if (!newToken) return;

                newToken.control({ releaseOthers: true });

                (newToken as any)._onDragLeftStart(event);
            } catch (err) {
                console.error("Shell Game | Error placing fake token:", err);
                ui.notifications?.error("Shell Game: Something went wrong placing the fake token.");
            } finally {
                canvas.stage.off("pointerdown", handler);
            }
        };

        canvas.stage.on("pointerdown", handler);
    }
}