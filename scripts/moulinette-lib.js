
/**
 * Client functions for communicating with server
 */
class MoulinetteClient {
  
  //static SERVER_URL = "http://127.0.0.1:5000"
  //static SERVER_OUT = "http://127.0.0.1:5000/static/out/"
  static SERVER_URL = "https://boisdechet.org/moulinette"
  static SERVER_OUT = "https://boisdechet.org/moulinette/static/out/"
  
  static GITHUB_SRC = "https://raw.githubusercontent.com/SvenWerlen/moulinette-data"
  static HEADERS = { 'Accept': 'application/json', 'Content-Type': 'application/json' }
  
  token = null
  
  /*
   * Sends a request to server and return the response or null (if server unreachable)
   */
  async send(URI, method, data) {
    let params = {
      method: method,
      headers: MoulinetteClient.HEADERS
    }
    if( data ) { params.body = JSON.stringify(data) }

    const response = await fetch(`${MoulinetteClient.SERVER_URL}${URI}`, params).catch(function(e) {
      console.log(`Moulinette | Cannot establish connection to server ${MoulinetteClient.SERVER_URL}`, e)
    });
    if(!response) {
      return null;
    }
    return { 'status': response.status, 'data': await response.json() }
  }
  
  async get(URI) { return this.send(URI, "GET") }
  async put(URI) { return this.send(URI, "PUT") }
  async post(URI, data) { return this.send(URI, "POST", data) }
  async delete(URI, data) { return this.send(URI, "DELETE") }
}


export class Moulinette {
  
  static lastSelectedInitiative = 0
  static lastAuthor = ""
  
  constructor(hook, type, query) {
    Hooks.on(hook, this.handle.bind(this));
    this.type = type;
  }
  
  static showMoulinette() {
    new MoulinetteHome().render(true)
  }
  
  static shareWithMoulinette(scene) {
    new MoulinetteShare(scene).render(true)
  }
  
  static getSource() {
    var source = "data";
    if (typeof ForgeVTT != "undefined" && ForgeVTT.usingTheForge) {
        source = "forgevtt";
    }
    return source;
  }
  
  /**
   * Generates a new folder
   */
  static async createFolderIfMissing(target, folderPath) {
    let base = await FilePicker.browse(Moulinette.getSource(), folderPath);
    if (base.target == target) {
        await FilePicker.createDirectory(Moulinette.getSource(), folderPath);
    }
  }
  
  /**
   * Download a files into the right folder
   */
  static async uploadIfNotExists(file, name, folderPath) {
    const source = Moulinette.getSource()
    Moulinette.createFolderIfMissing("moulinette", folderPath)
    
    // check if file already exist
    let base = await FilePicker.browse(source, folderPath);
    let exist = base.files.filter(f => f == `${folderPath}/${name}`)
    //if(exist.length > 0) return;
    
    try {
      let response = await FilePicker.upload(source, folderPath, file, {bucket: null});
    } catch (e) {
      console.log(`Moulinette | Not able to upload file ${name}`)
      console.log(e)
    }
  }
};

/*************************
 * Moulinette Home
 *************************/
class MoulinetteHome extends FormApplication {
  
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinette",
      classes: ["mtte", "home"],
      title: game.i18n.localize("mtte.moulinetteHome"),
      template: "modules/fvtt-moulinette/templates/home.html",
      width: "400",
      height: "350",
      closeOnSubmit: false,
      submitOnClose: false,
    });
  }
  
  getData() {
    if (!game.user.isGM) {
      return { error: game.i18n.localize("ERROR.mtteGMOnly") }
    }
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find("img.button").click(this._onSelect.bind(this));
  }
  
  async _onSelect(event) {
    event.preventDefault();
    const source = event.currentTarget;
    if (source.classList.contains("forge")) {
      new MoulinetteForge().render(true)
    } else if (source.classList.contains("config")) {
      ui.notifications.error(game.i18n.format("ERROR.mtteNotYetAvailable"));
    }
  }
}


/*************************
 * Moulinette Forge
 *************************/
class MoulinetteForge extends FormApplication {
  
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinette",
      classes: ["mtte", "forge"],
      title: game.i18n.localize("mtte.moulinetteForge"),
      template: "modules/fvtt-moulinette/templates/forge.html",
      width: 600,
      height: "auto",
      closeOnSubmit: false,
      submitOnClose: false,
    });
  }
  
  async getData() {
    if (!game.user.isGM) {
      return { error: game.i18n.localize("ERROR.mtteGMOnly") }
    }
    
    let client = new MoulinetteClient()
    let lists = await client.get("/bundler/fvtt/packs")
    if( lists && lists.status == 200 ) {
      this.lists = lists.data
      this.lists.scenes.forEach( sc => sc.source = { name: sc.source.split('|')[0], url: sc.source.split('|')[1] })
      return { lists: this.lists }
    } else {
      console.log(`Moulinette | Error during communication with server ${MoulinetteClient.SERVER_URL}`, lists)
      return { error: game.i18n.localize("ERROR.mtteServerCommunication") }
    }
  }

  activateListeners(html) {
    super.activateListeners(html);
    const window = this;
    
    // filter function
    html.find("#searchScenes").on("keyup", function() {
      let filter = $(this).val().toLowerCase()
      $('#scenePacks *').filter('.pack').each(function() {
        const text = $(this).text().trim().toLowerCase() + $(this).attr("title");
        $(this).css('display', text.length == 0 || text.indexOf(filter) >= 0 ? 'flex' : 'none')
      });
      window._alternateColors();
      window._hideMessagebox();
    });
    
    // click on preview
    html.find(".preview").click(this._onPreview.bind(this));
    
    // keep messagebox reference for _updateObject
    this.msgbox = html.find(".messagebox")
    this.html = html
    
    // hide error/success message on anychange
    html.find(".check").click(this._hideMessagebox.bind(this));
    
    // enable alt _alternateColors
    this._alternateColors()
  }
  
  _alternateColors() {
    $('#scenePacks .pack:even').addClass("alt");
  }
  
  _displayMessage(text, type="success") {
    if(this.msgbox) {
      this.msgbox.addClass(type).css('visibility', 'visible').find('.message').text(text); 
    }
  }
  
  _hideMessagebox(event) {
    if(this.msgbox) {
      this.msgbox.css('visibility', 'hidden'); 
    }
  }
  
  _onPreview(event) {
    event.preventDefault();
    const source = event.currentTarget;
    const sceneId = source.dataset.id;
    const thumbURL = `${MoulinetteClient.SERVER_URL}/static/thumbs/${sceneId}.webp`
    new MoulinettePreviewer({ thumb: thumbURL}).render(true)
    this._hideMessagebox()
  }
  
  async _updateObject(event, inputs) {
    event.preventDefault();
    if(!this.lists || !this.lists.scenes) {
      return;
    }
    
    ui.scenes.activate() // give focus to scenes
    
    const selected = this.lists.scenes.filter( sc => sc.id in inputs && inputs[sc.id] )
    if(selected.length == 0) {
      this._displayMessage(game.i18n.localize("ERROR.mtteSelectAtLeastOne"), 'error')
      
    } else if (selected.length > 3) {
      this._displayMessage(game.i18n.localize("ERROR.mtteTooMany"), 'error')
    } else if (this.inProgress) {
      ui.notifications.error(game.i18n.format("ERROR.mtteInProgress"));
    } else {
      this.inProgress = true
      let client = new MoulinetteClient()
      
      try {
        // iterate on each desired request
        for( const r of selected ) {
          const response = await fetch(`${MoulinetteClient.GITHUB_SRC}/main/${r.url}`).catch(function(e) {
            console.log(`Moulinette | Not able to fetch JSON for pack ${r.name}`, e)
          });
          if(!response) continue;
          const pack = await response.json()
          
          // retrieve all scenes from pack
          for( const sc of pack.list ) {
            
            // retrieve scene JSON
            const response = await fetch(`${MoulinetteClient.GITHUB_SRC}/${sc.data}`).catch(function(e) {
              console.log(`Moulinette | Not able to fetch scene of pack ${pack.name}`, e)
            });
            if(!response) continue;
            const scene = await response.json()
            
            // retrieve and upload scene image
            let proxyImg = null
            let res = null
            
            // change message to show progress (specially for image download/upload)
            if(pack.list.length == 1) {
              this._displayMessage(game.i18n.format("mtte.forgingItem", { pack: pack.name}), 'success')
            } else {
              this._displayMessage(game.i18n.format("mtte.forgingItemMultiple", { pack: pack.name, scene: scene.name}), 'success')
            }
              
            if(!sc.convert) { // no conversion required => try direct download
              try {
                res = await fetch(sc.url, {})
              } catch(e) {}
            }
            
            if(!res) {
              console.log("Moulinette | Direct download not working. Using proxy...")
              const proxy = await client.get(`/bundler/fvtt/image/${pack.id}/${sc.name}`)
              if(!proxy || proxy.status != 200) {
                console.log("Moulinette | Proxy download not working. Skip.")
                continue;
              }
              res = await fetch(proxy.data.url, {})
              proxyImg = proxy.data.guid
              
              // replace filename using new extension
              const oldExt = sc.name.split('.').pop(); 
              const newExt = proxy.data.url.split('.').pop(); 
              sc.name = sc.name.substring(0, sc.name.length - oldExt.length) + newExt
            }
            
            const blob = await res.blob()
            await Moulinette.uploadIfNotExists(new File([blob], sc.name, { type: blob.type, lastModified: new Date() }), sc.name, `moulinette/${pack.id}`)
            if(proxyImg) {
              client.delete(`/bundler/fvtt/image/${proxyImg}`)
            }
            
            // adapt scene and create
            if(pack.list.length == 1) scene.name = pack.name
            scene.img = `moulinette/${pack.id}/${sc.name}`
            scene.tiles = []
            scene.sounds = []
            let newScene = await Scene.create(scene);
            let tData = await newScene.createThumbnail()
            await newScene.update({thumb: tData.thumb});
            client.put(`/bundler/fvtt/pack/${pack.id}`)
          }
        }
        
        this._displayMessage(game.i18n.localize("mtte.forgingSuccess"), 'success')
      } catch(e) {
        console.log(`Moulinette | Unhandled exception`, e)
        this._displayMessage(game.i18n.localize("mtte.forgingFailure"), 'error')
      }
      this.inProgress = false
      this.render();
    }
  }
}


/*************************
 * Preview
 *************************/
class MoulinettePreviewer extends FormApplication {
  
  constructor(data) {
    super()
    this.data = data;    
  }
  
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinette-preview",
      classes: ["mtte", "preview"],
      title: game.i18n.localize("mtte.preview"),
      template: "modules/fvtt-moulinette/templates/preview.html",
      width: 420,
      height: 470,
      closeOnSubmit: false,
      submitOnClose: false,
    });
  }
  
  async getData() {    
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".thumb").css('background', `url(${this.data.thumb}) 50% 50% no-repeat`)
    const window = this;
    html.click(function() { window.close() });
  }
  
}

/*************************
 * Share
 *************************/
class MoulinetteShare extends FormApplication {
  
  constructor(scene) {
    super()
    this.scene = scene;
  }
  
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinette-share",
      classes: ["mtte", "share"],
      title: game.i18n.localize("mtte.share"),
      template: "modules/fvtt-moulinette/templates/share.html",
      width: 500,
      height: 470,
      closeOnSubmit: false,
      submitOnClose: false,
    });
  }
  
  async getData() {
    const authorImg = game.settings.get("moulinette", "shareImgAuthor")
    const discordId = game.settings.get("moulinette", "shareDiscordId") 
    console.log(authorImg, discordId)
    return { sceneName: this.scene.name, authorImg: authorImg != "undefined" ? authorImg : "", discordId: discordId != "undefined" ? discordId : "" };
  }

  activateListeners(html) {
    super.activateListeners(html);
  }
  
  async _updateObject(event, inputs) {
    event.preventDefault();
    if(!inputs.sceneName || inputs.sceneName.length == 0) {
      return ui.notifications.error(game.i18n.format("ERROR.mtteMandatorySceneName"));
    }
    else if(!inputs.sceneDesc || inputs.sceneDesc.length == 0) {
      return ui.notifications.error(game.i18n.format("ERROR.mtteMandatorySceneDesc"));
    }
    else if(!inputs.authorImg || inputs.authorImg.length == 0) {
      return ui.notifications.error(game.i18n.format("ERROR.mtteAuthorImg"));
    }
    else if(!inputs.imageURL || inputs.imageURL.length == 0) {
      return ui.notifications.error(game.i18n.format("ERROR.mtteImageURL"));
    }
    else if(!inputs.agree1 || !inputs.agree2) {
      return ui.notifications.error(game.i18n.format("ERROR.mtteMustAgree"));
    }
    else if(!inputs.discordId || inputs.discordId.length == 0) {
      return ui.notifications.error(game.i18n.format("ERROR.mtteDiscordId"));
    }
    
    // store settings
    game.settings.set("moulinette", "shareImgAuthor", inputs.authorImg)
    game.settings.set("moulinette", "shareDiscordId", inputs.discordId)  
    
    // cleanup data before sending
    let data = this.scene.data
    delete data.thumb
    delete data._priorThumbPath
    
    // submit contribution
    let client = new MoulinetteClient()
    const result = await client.post(`/bundler/fvtt/scene`, {
      guid: game.settings.get("moulinette", "userId"),
      scene: this.scene,
      sceneName: inputs.sceneName,
      sceneDesc: inputs.sceneDesc,
      authorImg: inputs.authorImg,
      imageURL: inputs.imageURL,
      discordId: inputs.discordId
    })
    console.log(result)
    if(result.status != 200) {
      console.log("Moulinette | Sharing failed with error: " + result.data.error)
      return ui.notifications.error(game.i18n.format("ERROR.mtteUnexpected"));
    } else {
      return ui.notifications.info(game.i18n.format("mtte.shareSuccess"));
      this.close()
    }
  }
  
}
