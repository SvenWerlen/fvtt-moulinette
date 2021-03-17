
import { Moulinette } from "./scripts/moulinette-lib.js"

Hooks.once("init", async function () {
  console.log("Moulinette | Init")
  
  game.settings.register("moulinette", "userId", { scope: "world", config: false, type: String, default: randomID(26) });
  game.settings.register("moulinette", "shareImgAuthor", { scope: "world", config: false, type: String });
  game.settings.register("moulinette", "shareDiscordId", { scope: "world", config: false, type: String });
  game.settings.register("moulinette", "packInstalled", { scope: "world", config: false, type: String, default: "[]" })
  game.settings.register("moulinette", "coreLanguages", { scope: "world", config: false, type: String, default: "[]" })
  game.settings.register("moulinette", "gIconFgColor", { scope: "world", config: false, type: String, default: "#ffffff" })
  game.settings.register("moulinette", "gIconBgColor", { scope: "world", config: false, type: String, default: "#000000" })
  
  game.moulinette = {
    Moulinette
  }
  
  // Define template paths to load
  const templatePaths = [
    // Forge Partials
    "modules/fvtt-moulinette/templates/forge-scenes.hbs",
    "modules/fvtt-moulinette/templates/forge-gameicons.hbs",
  ];

  // Load the template parts
  loadTemplates(templatePaths);

  
  // dynamically add languages
  const coreLang = game.settings.get("moulinette", "coreLanguages")
  if(coreLang) {
    const langList = JSON.parse(coreLang)
    langList.forEach( l => {
      console.log(`Moulinette | Dynamic translation ${l.path}`)
      game.modules.get("fvtt-moulinette").languages.push(l)
    })
  }
  
});

Hooks.once("ready", async function () {
  if (game.user.isGM) {
    await Moulinette.createFolderIfMissing(".", "moulinette");
    await Moulinette.createFolderIfMissing("moulinette", "moulinette/scenes");
    await Moulinette.createFolderIfMissing("moulinette", "moulinette/transl");
    await Moulinette.createFolderIfMissing("moulinette", "moulinette/images");
    await Moulinette.createFolderIfMissing("moulinette/transl", "moulinette/transl/babele");
    await Moulinette.createFolderIfMissing("moulinette/transl", "moulinette/transl/core");
    
    // open moulinette on CTRL+M
    document.onkeydown = function (evt) {
        if(evt.key == "m" && evt.ctrlKey && !evt.altKey && !evt.metaKey) {
          game.moulinette.Moulinette.showMoulinette()
        }
    };
  }
});


// Render Sidebar
Hooks.on("renderSidebarTab", (app, html) => {
  if (app instanceof Settings) {
    // Add changelog button
    let button = $(`<button><i class="fas fa-hammer"></i> ${game.i18n.localize("mtte.moulinette")}</button>`);
    html.find("#game-details").append(button);
    button.click(() => { game.moulinette.Moulinette.showMoulinette() });
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
