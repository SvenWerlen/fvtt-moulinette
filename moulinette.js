
import { Moulinette } from "./scripts/moulinette-lib.js"

Hooks.once("init", async function () {
  console.log("Moulinette | Init")
  
  game.settings.register("moulinette", "userId", { scope: "world", config: false, type: String, default: randomID(26) });
  
  game.moulinette = {
    Moulinette
  }
  
});

Hooks.once("ready", async function () {
  if (game.user.isGM) {
    await Moulinette.createFolderIfMissing(".", "moulinette");
    //await createFolderIfMissing("moulinette", "mo/uploaded");
  }   
});
