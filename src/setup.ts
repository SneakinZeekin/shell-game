export class ShellGameSetup extends Application {
    static selectedTokenId: string | null = null;

    static openWindow() {
        new ShellGameSetup().render(true);
    }

    static get defaultOptions(): ApplicationOptions {
        return {
            ...super.defaultOptions,
            id: "shell-game-setup",
            title: "Shell Game Setup",
            template: "modules/shell-game/templates/shell-setup.html",
            width: 420,
            height: "auto",
            popOut: true
        };
    }

    getData(): any {
        const allTokens = canvas.tokens?.placeables ?? [];

        const tokens = allTokens
            .filter(t => {
                const name = t.name ?? t.document.name ?? "";

                const isFake = name.endsWith(" (Fake)");

                const isPlayerOwned = t.actor?.hasPlayerOwner;

                return !isFake && !isPlayerOwned;
            })
            .map(t => {
                const anyToken = t as any;
                const img =
                    anyToken.data?.texture?.src ??
                    anyToken.document?.texture?.src ??
                    "icons/svg/mystery-man.svg";

                return {
                    id: t.id ?? "",
                    name: t.name ?? t.document.name ?? "Unnamed",
                    img
                };
            });

        return { tokens };
    }


    activateListeners(html: JQuery) {
        super.activateListeners(html);

        html.find("input[name='shell-source-token']").on("change", ev => {
            ShellGameSetup.selectedTokenId = (ev.currentTarget as HTMLInputElement).value;
        });

        html.find("button[name='shell-create-fake']").on("click", ev => {
            ev.preventDefault();

            const id =
                ShellGameSetup.selectedTokenId ??
                (html.find("input[name='shell-source-token']:checked").val() as string);

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

    static createFake(sourceTokenId: string) {
        const sourceToken = canvas.tokens?.get(sourceTokenId);
        if (!sourceToken) {
            ui.notifications.error("Shell Game: Selected token no longer exists.");
            return;
        }

        ui.notifications.info("Shell Game: Click on the scene to place the fake token.");

        const handler = async (event: any) => {
            try {
                const pos = event.data.getLocalPosition(canvas.app.stage);
                const snapped = canvas.grid?.getSnappedPosition(pos.x, pos.y, 1) ?? pos;

                const doc = sourceToken.document;
                const clone = doc.toObject();

                clone.x = snapped.x;
                clone.y = snapped.y;
                clone.name = `${clone.name} (Fake)`;
                delete clone._id;

                await canvas.scene?.createEmbeddedDocuments("Token", [clone]);
            } finally {
                canvas.stage.off("pointerdown", handler);
            }
        };

        canvas.stage.on("pointerdown", handler);
    }
}