Hooks.once("init", () => {

  console.log("Moulinette | Init")
  
  game.settings.register("moulinette", "userId", { scope: "world", config: false, type: String, default: randomID(26) });
//   game.settings.register("data-toolbox", "template", { scope: "world", config: false, type: String, default: "modules/data-toolbox/samples/creature-template.json" });
//   game.settings.register("data-toolbox", "entity", { scope: "world", config: false, type: String, default: "Actor" });
//   game.settings.register("data-toolbox", "compendium", { scope: "world", config: false, type: String, default: "" });
//   
//   game.settings.register("data-toolbox", "lcLogin", {
//     name: game.i18n.localize("SETTINGS.tblcLogin"), 
//     hint: game.i18n.localize("SETTINGS.tblcLoginHint"), 
//     scope: "world",
//     config: true,
//     default: "",
//     type: String});
//   
//   game.settings.register("data-toolbox", "lcAccessKey", {
//     name: game.i18n.localize("SETTINGS.tblcAccessKey"), 
//     hint: game.i18n.localize("SETTINGS.tblcAccessKeyHint"), 
//     scope: "world",
//     config: true,
//     default: "",
//     type: String});

});
