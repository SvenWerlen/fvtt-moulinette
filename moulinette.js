
import { Moulinette } from "./scripts/moulinette-lib.js"
//import * as zip from "@zip.js/zip.js";
//import * as zip from "./scripts/zip.min.js";
//console.log(zip)
//console.log(zip.ZipReader)

Hooks.once("init", async function () {
  console.log("Moulinette | Init")
  
  game.settings.register("moulinette", "userId", { scope: "world", config: false, type: String, default: randomID(26) });
  game.settings.register("moulinette", "shareImgAuthor", { scope: "world", config: false, type: String });
  game.settings.register("moulinette", "shareDiscordId", { scope: "world", config: false, type: String });
  game.settings.register("moulinette", "packInstalled", { scope: "world", config: false, type: String, default: "[]" })
  game.settings.register("moulinette", "coreLanguages", { scope: "world", config: false, type: String, default: "[]" })
  game.settings.register("moulinette", "gIconFgColor", { scope: "world", config: false, type: String, default: "#ffffff" })
  game.settings.register("moulinette", "gIconBgColor", { scope: "world", config: false, type: String, default: "#000000" })
  game.settings.register("moulinette", "currentTab", { scope: "world", config: false, type: String, default: "scenes" })
  
  //const reader = new zip.HttpReader
  //const reader = new zip.ZipReader(new zip.HttpReader("https://www.patreon.com/file?h=27576090&i=3959878"))
  //console.log(reader)
  //const reader = new zip.TextReader("test")
  //const blob = null;
  //const reader = new zip.ZipReader(new zip.BlobReader(blob));

  Handlebars.registerHelper('pretty', function(text) {
    return game.moulinette.Moulinette.prettyText(text)
  });
  
  game.moulinette = {
    Moulinette
  }
  
  // Define template paths to load
  const templatePaths = [
    // Forge Partials
    "modules/fvtt-moulinette/templates/forge-scenes.hbs",
    "modules/fvtt-moulinette/templates/forge-gameicons.hbs",
    "modules/fvtt-moulinette/templates/forge-imagesearch.hbs",
    "modules/fvtt-moulinette/templates/forge-tilesearch.hbs",
    "modules/fvtt-moulinette/templates/forge-customsearch.hbs",
    "modules/fvtt-moulinette/templates/forge-customaudio.hbs",
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
    await Moulinette.createFolderIfMissing("moulinette", "moulinette/tiles");
    await Moulinette.createFolderIfMissing("moulinette", "moulinette/sounds");
    await Moulinette.createFolderIfMissing("moulinette/transl", "moulinette/transl/babele");
    await Moulinette.createFolderIfMissing("moulinette/transl", "moulinette/transl/core");
    await Moulinette.createFolderIfMissing("moulinette/images", "moulinette/images/custom");
    await Moulinette.createFolderIfMissing("moulinette/sounds", "moulinette/sounds/custom");
    
    // open moulinette on CTRL+M
    document.addEventListener("keydown", evt => {
      if(evt.key == "m" && evt.ctrlKey && !evt.altKey && !evt.metaKey) {
        game.moulinette.Moulinette.showMoulinette()
      }
    });
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
