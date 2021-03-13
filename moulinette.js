
import { Moulinette } from "./scripts/moulinette-lib.js"

Hooks.once("init", async function () {
  console.log("Moulinette | Init")
  
  game.settings.register("moulinette", "userId", { scope: "world", config: false, type: String, default: randomID(26) });
  
  game.settings.register("moulinette", "shareImgAuthor", { scope: "world", config: false, type: String });
  game.settings.register("moulinette", "shareDiscordId", { scope: "world", config: false, type: String });
  
  game.moulinette = {
    Moulinette
  }
  
});

Hooks.once("ready", async function () {
  if (game.user.isGM) {
    await Moulinette.createFolderIfMissing(".", "moulinette");
    await Moulinette.createFolderIfMissing("moulinette", "moulinette/scenes");
    console.log("here")
  }   
});


Hooks.on("getSceneDirectoryEntryContext", (html, options) => {
  options.push({
    name: game.i18n.localize("mtte.share"),
    icon: '<i class="fas fa-cloud-upload-alt"></i>',
    callback: async function(li) {
      const scene = game.scenes.get(li.data("entityId"))
      game.moulinette.Moulinette.shareWithMoulinette(scene)
    },
    condition: li => {
      return true;
    },
  });
});
