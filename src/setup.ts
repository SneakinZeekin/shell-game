export class ShellGameSetup extends Application {
  static selectedTokenId: string | null = null;

  static openWindow() {
    new ShellGameSetup().render(true);
  }

  getData(): any {
    const tokens = (canvas.tokens?.placeables ?? []).map(t => ({
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

      this.close();
      ShellGameSetup.waitForClickToCreateFake(sourceToken.id!);
    });
  }

  static waitForClickToCreateFake(sourceTokenId: string) {
    const sourceToken = canvas.tokens?.get(sourceTokenId);
    if (!sourceToken) {
      ui.notifications.error("Shell Game: Selected token no longer exists.");
      return;
    }

    ui.notifications.info("Shell Game: Click on the scene to place the fake token.");

    const handler = async (event: any) => {
      try {
        const data = event.data;
        if (!data) return;

        const pos = data.getLocalPosition(canvas.app.stage);
        const snapped = canvas.grid?.getSnappedPosition(pos.x, pos.y, 1) ?? { x: pos.x, y: pos.y };

        const doc = sourceToken.document;
        const cloneData = doc.toObject();
        cloneData.x = snapped.x;
        cloneData.y = snapped.y;

        await canvas.scene?.createEmbeddedDocuments("Token", [cloneData]);
      } finally {
        canvas.stage.off("pointerdown", handler);
      }
    };

    canvas.stage.on("pointerdown", handler);
  }
}
