
/**
 * Client functions for communicating with server
 */
class MoulinetteClient {
  
  //static SERVER_URL = "http://127.0.0.1:5000"
  //static SERVER_OUT = "http://127.0.0.1:5000/static/out/"
  //static GITHUB_SRC = "http://127.0.0.1:5000/static"
  static SERVER_URL = "https://boisdechet.org/moulinette"
  static SERVER_OUT = "https://boisdechet.org/moulinette/static/out/"
  static GITHUB_SRC = "https://raw.githubusercontent.com/SvenWerlen/moulinette-data"
  
  static HEADERS = { 'Accept': 'application/json', 'Content-Type': 'application/json' }
  
  token = null
  
  /*
   * Sends a etch to server and return the response
   */
  async fetch(URI, method, data) {
    let params = {
      method: method,
      headers: MoulinetteClient.HEADERS
    }
    if( data ) { params.body = JSON.stringify(data) }

    const response = await fetch(`${MoulinetteClient.SERVER_URL}${URI}`, params).catch(function(e) {
      console.log(`Moulinette | Cannot establish connection to server ${MoulinetteClient.SERVER_URL}`, e)
    });
    return response
  }
  
  /*
   * Sends a request to server and return the response or null (if server unreachable)
   */
  async send(URI, method, data) {
    const response = await this.fetch(URI, method, data)
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
  static async upload(file, name, folderSrc, folderPath, overwrite = false) {
    const source = Moulinette.getSource()
    Moulinette.createFolderIfMissing(folderSrc, folderPath)
    
    // check if file already exist
    let base = await FilePicker.browse(source, folderPath);
    let exist = base.files.filter(f => f == `${folderPath}/${name}`)
    if(exist.length > 0 && !overwrite) return;
    
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
      id: "moulinetteHome",
      classes: ["mtte", "home"],
      title: game.i18n.localize("mtte.moulinetteHome"),
      template: "modules/fvtt-moulinette/templates/home.hbs",
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
    this.bringToTop()
    html.find("img.button").click(this._onSelect.bind(this));
  }
  
  async _onSelect(event) {
    event.preventDefault();
    const source = event.currentTarget;
    if (source.classList.contains("forge")) {
      new MoulinetteForge().render(true)
    } else if (source.classList.contains("config")) {
      new MoulinetteScribe().render(true)
    }
  }
}


/*************************
 * Moulinette Forge
 *************************/
class MoulinetteForge extends FormApplication {
  
  static get TABS() { return ["scenes", "gameicons", "imagesearch", "tilesearch"] }
  
  constructor(tab = "scenes") {
    super()
    const curTab = game.settings.get("moulinette", "currentTab")
    this.tab = MoulinetteForge.TABS.includes(curTab) ? curTab : "scenes"
    this.tiles = []
    this.tilesPacks = []
  }
  
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinette",
      classes: ["mtte", "forge"],
      title: game.i18n.localize("mtte.moulinetteForge"),
      template: "modules/fvtt-moulinette/templates/forge.hbs",
      width: 600,
      height: "auto",
      resizable: true,
      dragDrop: [{dragSelector: ".draggable"}],
      closeOnSubmit: false,
      submitOnClose: false,
    });
  }
  
  async getData() {
    const desc = game.i18n.localize("mtte.forgeWelcome." + this.tab)
    if (!game.user.isGM) {
      return { desc: desc, error: game.i18n.localize("ERROR.mtteGMOnly") }
    }
    
    let client = new MoulinetteClient()
    let lists = await client.get("/bundler/fvtt/packs")
    if( lists && lists.status == 200 ) {
      this.lists = lists.data
      let scCount = 0;
      this.lists.scenes.forEach( sc => { 
        sc.source = { name: sc.source.split('|')[0], url: sc.source.split('|')[1] } 
        scCount += sc.scenesCount
      })
      return { 
        desc: desc, 
        lists: this.lists, scCount: scCount, scenesActive: this.tab == "scenes", gameIconsActive: this.tab == "gameicons" , imageSearchActive: this.tab == "imagesearch", tileSearchActive: this.tab == "tilesearch",
        fgColor: game.settings.get("moulinette", "gIconFgColor"), bgColor: game.settings.get("moulinette", "gIconBgColor")
      }
    } else {
      console.log(`Moulinette | Error during communication with server ${MoulinetteClient.SERVER_URL}`, lists)
      return { desc: desc, error: game.i18n.localize("ERROR.mtteServerCommunication") }
    }
  }

  activateListeners(html) {
    super.activateListeners(html);
    this.bringToTop()
    
    const window = this;
    
    // filter function
    html.find("#searchScenes").on("keyup", function() {
      let filter = $(this).val().toLowerCase()
      $('#scenePacks *').filter('.pack').each(function() {
        const text = $(this).text().trim().toLowerCase() + $(this).attr("title");
        $(this).css('display', text.length == 0 || text.indexOf(filter) >= 0 ? 'flex' : 'none')
      })
      window._alternateColors();
      window._hideMessagebox();
    }).focus();
    
    // search on ENTER
    html.find(".searchinput").on("keyup", this._onSearch.bind(this)).focus();
    
    // click on tabs
    html.find(".tabs a").click(this._onNavigate.bind(this));
    
    // click on preview
    html.find(".preview").click(this._onPreview.bind(this));
    
    // keep messagebox reference for _updateObject
    this.msgbox = html.find(".messagebox")
    this.html = html
    
    // buttons
    html.find("button").click(this._onClickButton.bind(this))
    
    // hide error/success message on anychange
    html.find(".check").click(this._hideMessagebox.bind(this));
    
    // enable alt _alternateColors
    this._alternateColors()
  }
  
  _onSearch(event) {
    event.preventDefault();
    const source = event.currentTarget;
    var charCode = (typeof event.which === "number") ? event.which : event.keyCode;
    if(charCode != 13) return; // only react to ENTER
    
    const newSearch = $(source).val()
    if(newSearch == this.filter) return;
    this.filter = newSearch
    
    if(this.tab == "gameicons") {
      //this.timeout = setTimeout(this._searchGameIcons.bind(this), 500)
      this._searchGameIcons()
    } else if(this.tab == "imagesearch") {
      this._searchImages()
    } else if(this.tab == "tilesearch") {
      this._searchTiles()
    }
  }
  
  async _searchGameIcons() {
    console.log("Moulinette | Searching ... " + this.filter)
    if(this.filter.length < 2) return this.html.find("#gameIcons").html("")
    const query = encodeURI(this.filter)
    const request = { requests: [{
      indexName: "icons",
      hitsPerPage: 50,
      params: `query=${query}&page=0`
    }]}
    
    // execute search
    const headers = { 'Accept': 'application/json', 'Content-Type': 'application/json' }
    const params = "x-algolia-application-id=9HQ1YXUKVC&x-algolia-api-key=fa437c6f1fcba0f93608721397cd515d"
    const response = await fetch("https://9hq1yxukvc-3.algolianet.com/1/indexes/*/queries?" + params, { method: "POST", headers: headers, body: JSON.stringify(request)}).catch(function(e) {
      console.log(`Moulinette | Cannot establish connection to server algolianet`, e)
    });
    
    const res = await response.json()
    let html = ""
    res.results[0].hits.forEach( r => {
      const author = r.id.split('/')[1]
      html += `<div class="pack" title="${r._highlightResult.content.value}">
        <input type="checkbox" class="check" name="${r.id}" value="${r.id}">
        <img src="https://game-icons.net/icons/ffffff/000000/${r.id}.svg"/>
        <span class="gameicon">${r.name}</span>
        <a href="https://game-icons.net/about.html#authors" target="_blank">${author}@game-icons.net</a>
      </div>` })
    
    this.html.find("#gameIcons").html(html)
    this._alternateColors()
  }
  
  async _searchImages() {
    console.log("Moulinette | Searching images... " + this.filter)
    if(this.filter.length < 2) return this.html.find("#images").html("")
    
    // execute search
    let client = new MoulinetteClient()
    let result = await client.post("/search", { query: this.filter })
    if( result && result.status == 200 ) {
      let html = ""
      this.searchResults = result.data.results;
      let idx = 0;
      result.data.results.forEach( r => {
        idx++
        html += `<div class="thumbres" title="${r.name}" data-idx="${idx}"><img width="100" height="100" src="${r.thumb}"/></div>` })
      this.html.find("#images").html(html)
      this.html.find(".thumbres").click(this._onClickAction.bind(this))
      this._alternateColors()
    }
  }
  
  async _searchTiles() {
    console.log("Moulinette | Searching tiles ... " + this.filter)
    if(this.filter.length < 2) return this.html.find("#images").html("")
    
    // execute search
    let client = new MoulinetteClient()
    let result = await client.post("/search", { query: this.filter })
    
    // build tiles' index
    if(this.tiles.length == 0) {
      const response = await fetch(MoulinetteClient.SERVER_URL + "/assets/data.json").catch(function(e) {
        console.log(`Moulinette | Cannot download tiles/asset list`, e)
        return;
      });
      const data = await response.json();
      let idx = 0;
      for(const pub of data) {
        for(const pack of pub.packs) {
          this.tilesPacks.push({ publisher: pub.publisher, pubWebsite: pub.website, name: pack.name, url: pack.url, license: pack.license, licenseUrl: pack.licenseUrl, path: pack.path })
          for(const asset of pack.assets) {
            this.tiles.push({ pack: idx, filename: asset})
          }
          idx++;
        }
      }
    }
    
    const filters = this.filter.toLowerCase().split(" ")
    const filtered = this.tiles.filter( t => {
      for( const f of filters ) {
        if( t.filename.toLowerCase().indexOf(f) < 0 ) return false
      }
      return true;
    })
    
    let html = ""
    this.searchResults = filtered;
    let idx = 0;
    filtered.forEach( r => {
      idx++
      r.thumb = `${MoulinetteClient.SERVER_URL}/assets/${this.tilesPacks[r.pack].path}/${r.filename}`
      html += `<div class="thumbres draggable" title="${r.filename}" data-idx="${idx}"><img width="100" height="100" src="${r.thumb}"/></div>` 
    })
    
    this.html.find("#tiles").html(html)
    this.html.find(".thumbres").click(this._onClickAction.bind(this))
    // re-apply drag-drop
    const el = this.html[0]
    this._dragDrop.forEach(d => d.bind(el));
  }
  
  _onClickAction(event) {
    event.preventDefault();
    const source = event.currentTarget;
    const idx = source.dataset.idx;
    if(this.searchResults && idx > 0 && idx <= this.searchResults.length) {
      if(this.tab == "imagesearch") {
        new MoulinetteSearchResult(this.searchResults[idx-1]).render(true)
      } else if(this.tab == "tilesearch") {
        const result = this.searchResults[idx-1]
        new MoulinetteTileResult(duplicate(result), duplicate(this.tilesPacks[result.pack])).render(true)
      }
    }
  }
  
  _onDragStart(event) {
    super._onDragStart(event)
    const div = event.currentTarget;
    const idx = div.dataset.idx;
    if(this.searchResults && idx > 0 && idx <= this.searchResults.length) { 
      const tile = this.searchResults[idx-1]
      const pack = this.tilesPacks[tile.pack]
      const folderName = `${pack.publisher} ${pack.name}`.replace(/[\W_]+/g,"-").toLowerCase()
      const imageName = tile.filename
      const filePath = `moulinette/tiles/${folderName}/${imageName}`
 
      // Set drag data
      const dragData = {
        type: "Tile",
        img: filePath,
        tileSize: 100
      };
      event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
 
      // download & upload image
      fetch(tile.thumb).catch(function(e) {
        ui.notifications.error(game.i18n.format("ERROR.mtteDownload"));
        console.log(`Moulinette | Cannot download image ${imageName}`, e)
        return;
      }).then( res => {
        res.blob().then( blob => Moulinette.upload(new File([blob], imageName, { type: blob.type, lastModified: new Date() }), imageName, "moulinette/tiles", `moulinette/tiles/${folderName}`, false) )
      });
      
      // Create the drag preview for the image
      /*
      let img = div.querySelector("img")
      const w = img.naturalWidth * canvas.stage.scale.x;
      const h = img.naturalHeight * canvas.stage.scale.y;
      const preview = DragDrop.createDragImage({src: filePath}, w, h);
      
      event.dataTransfer.setDragImage(preview, w/2, h/2);
      */
    }
  }
  
  _alternateColors() {
    $('#scenePacks .pack').removeClass("alt");
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
  
  _onNavigate(event) {
    event.preventDefault();
    const source = event.currentTarget;
    const tab = source.dataset.tab;
    if(MoulinetteForge.TABS.includes(tab)) {
      this.tab = tab;
      game.settings.set("moulinette", "currentTab", tab)
      this.render();
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
  
  async _onClickButton(event) {
    event.preventDefault();
    const source = event.currentTarget;
    const window = this

    if (source.classList.contains("search")) {
      const newSearch = this.html.find(".searchinput").val()
      if(newSearch == this.filter) return;
      this.filter = newSearch
      if(this.tab == "gameicons") {
        this._searchGameIcons()
      } else if(this.tab == "imagesearch") {
        this._searchImages()
      } else if(this.tab == "tilesearch") { 
        this._searchTiles()
      }
    }
    else if (source.classList.contains("clear") || source.classList.contains("selectAll")) {
      this.html.find(".list .check:checkbox").prop('checked', source.classList.contains("selectAll"));
    }
    else if (this.tab == "scenes" && source.classList.contains("install")) {
      const names = []
      this.html.find("#scenePacks .check:checkbox:checked").each(function () {
        names.push($(this).attr("name"))
      });
      
      const selected = this.lists.scenes.filter( ts => names.includes(ts.id) )
      if(selected.length == 0) {
        return this._displayMessage(game.i18n.localize("ERROR.mtteSelectAtLeastOne"), 'error')
      }
      this._installScenes(selected)
    }
    else if(this.tab == "gameicons" && source.classList.contains("install")) {
      const selected = []
      this.html.find("#gameIcons .check:checkbox:checked").each(function () {
        selected.push($(this).attr("name"))
      });
      if(selected.length == 0) {
        return this._displayMessage(game.i18n.localize("ERROR.mtteSelectAtLeastOne"), 'error')
      }
      
      // retrieve color
      const fgColor = this.html.find("input[name='fgColor']").val()
      const bgColor = this.html.find("input[name='bgColor']").val()
      let re = /#[\da-f]{6}/;
      if(!re.test(fgColor) || !re.test(bgColor)) {
        return this._displayMessage(game.i18n.localize("ERROR.mtteInvalidColor"), 'error')
      }
      
      // store colors as preferences
      game.settings.set("moulinette", "gIconFgColor", fgColor)
      game.settings.set("moulinette", "gIconBgColor", bgColor)
      
      SceneNavigation._onLoadProgress(game.i18n.localize("mtte.installingPacks"),0);  
      let idx = 0;
      for(const svg of selected) {
        idx++;
        const headers = { method: "POST", headers: { 'Accept': 'application/json', 'Content-Type': 'application/json'}, body: JSON.stringify({ url: svg }) }
        const response = await fetch(MoulinetteClient.SERVER_URL + "/bundler/fvtt/gameicon", headers).catch(function(e) {
          console.log(`Moulinette | Cannot download image ${svg}`, e)
        });

        let text = await response.text()
        let imageName = svg.split('/').pop() + ".svg"
        
        if(fgColor != "#ffffff" || bgColor != "#000000") {
          console.log(fgColor, bgColor)
          text = text.replace(`fill="#fff"`, `fill="${bgColor}"`).replace(`<path d=`, `<path fill="${fgColor}" d=`)
          imageName = svg.split('/').pop() + `-${fgColor}-${bgColor}.svg`
        }
        
        //const blob = await response.blob()
        await Moulinette.upload(new File([text], imageName, { type: "image/svg+xml", lastModified: new Date() }), imageName, "moulinette/images", `moulinette/images/gameicons`, true)
        SceneNavigation._onLoadProgress(game.i18n.localize("mtte.installingPacks"), Math.round((idx / selected.length)*100));
      }
      SceneNavigation._onLoadProgress(game.i18n.localize("mtte.installingPacks"),100);  
      this._displayMessage(game.i18n.localize("mtte.forgingGameIconsSuccess"), 'success')
      
      // copy path into clipboard
      navigator.clipboard.writeText("moulinette/images/gameicons")
      .catch(err => {
        console.warn("Moulinette | Not able to copy path into clipboard")
      });
    }
  }
  
  async _installScenes(selected) {
    event.preventDefault();
    if(!this.lists || !this.lists.scenes) {
      return;
    }
    
    ui.scenes.activate() // give focus to scenes
    
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
            await Moulinette.upload(new File([blob], sc.name, { type: blob.type, lastModified: new Date() }), sc.name, "moulinette/scenes", `moulinette/scenes/${pack.id}`, false)
            if(proxyImg) {
              client.delete(`/bundler/fvtt/image/${proxyImg}`)
            }
            
            // adapt scene and create
            if(pack.list.length == 1) scene.name = pack.name
            scene.img = `moulinette/scenes/${pack.id}/${sc.name}`
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
      //this.render();
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
      template: "modules/fvtt-moulinette/templates/preview.hbs",
      width: 420,
      height: 470,
      closeOnSubmit: false,
      submitOnClose: false,
    });
  }
  
  async getData() { 
    return this.data
  }

  activateListeners(html) {
    super.activateListeners(html);
    this.bringToTop()
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
      template: "modules/fvtt-moulinette/templates/share.hbs",
      width: 500,
      height: 500,
      closeOnSubmit: false,
      submitOnClose: false,
    });
  }
  
  async getData() {
    const authorImg = game.settings.get("moulinette", "shareImgAuthor")
    const discordId = game.settings.get("moulinette", "shareDiscordId") 
    return { sceneName: this.scene.name, authorImg: authorImg != "undefined" ? authorImg : "", discordId: discordId != "undefined" ? discordId : "" };
  }

  activateListeners(html) {
    super.activateListeners(html);
    this.bringToTop()
    
    html.find("input.sceneName").on("keyup", function() { html.find("#scenePacks .sceneName").text($(this).val()) })
    html.find("input.sceneDesc").on("keyup", function() { html.find("#scenePacks .pack").attr('title',$(this).val()) })
    html.find("input.authorImg").on("keyup", function() { html.find("#scenePacks .authorImg").text($(this).val()) })
    html.find("input.authorURL").on("keyup", function() { html.find("#scenePacks .authorImg").attr('href',$(this).val()) })
    html.find("input.imageURL").on("keyup", function() { html.find("#scenePacks .preview").attr('data-id', $(this).val()) })
    html.find(".preview").click(this._onPreview.bind(this));
  }
  
  _onPreview(event) {
    event.preventDefault();
    const source = event.currentTarget;
    const sceneURL = source.dataset.id;
    const thumbURL = sceneURL
    new MoulinettePreviewer({ thumb: thumbURL, resize: true}).render(true)
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
    else if(!inputs.authorURL || inputs.authorURL.length == 0) {
      return ui.notifications.error(game.i18n.format("ERROR.mtteAuthorURL"));
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
      authorImg: `${inputs.authorImg}|${inputs.authorURL}`,
      imageURL: inputs.imageURL,
      discordId: inputs.discordId
    })
    if(result.status != 200) {
      console.log("Moulinette | Sharing failed with error: " + result.data.error)
      return ui.notifications.error(game.i18n.format("ERROR.mtteUnexpected"));
    } else {
      ui.notifications.info(game.i18n.format("mtte.shareSuccess"));
      this.close()
      return;
    }
  }
  
}


/*************************
 * Translations
 *************************/
class MoulinetteScribe extends FormApplication {
  
  constructor(scene) {
    super()
    this.onlyMyNeed = false;
    this.onlyMyLang = false;
    this.includeCore = true;
    this.includeBabele = true;
  }
  
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinette",
      classes: ["mtte", "scribe"],
      title: game.i18n.localize("mtte.moulinetteScribe"),
      template: "modules/fvtt-moulinette/templates/scribe.hbs",
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
    const lang = game.settings.get("core", "language")
    const filterLang = game.i18n.format("mtte.filterLang", { lang: game.i18n.localize("mtte.lang." + lang) })
    
    // filter list
    if(this.onlyMyNeed) {
      const modules = game.modules.keys()
      lists.data.transl = lists.data.transl.filter(t => (!t.system || t.system == game.system.id) && (!t.module || t.module in modules))
    }
    if(this.onlyMyLang) {
      lists.data.transl = lists.data.transl.filter(t => t.lang == lang)
    }
    if(!this.includeCore) {
      lists.data.transl = lists.data.transl.filter(t => t.type != "core-translation")
    }
    if(!this.includeBabele) {
      lists.data.transl = lists.data.transl.filter(t => t.type != "babele-translation")
    }
    // prepare
    if( lists && lists.status == 200 ) {
      this.lists = lists.data
      let scCount = 0;
      this.lists.transl.forEach( tr => {
        tr.source = { name: tr.source.split('|')[0], url: tr.source.split('|')[1] }
        tr.name = `(${game.i18n.localize("mtte.lang." + tr.lang)}) ${tr.name}`
      })
      return { 
        filterModSysEnabled: this.onlyMyNeed, 
        filterLangEnabled: this.onlyMyLang, 
        filterCore: this.includeCore, 
        filterBabele: this.includeBabele, 
        filterLang: filterLang,
        lists: this.lists 
      }
    } else {
      console.log(`Moulinette | Error during communication with server ${MoulinetteClient.SERVER_URL}`, lists)
      return { error: game.i18n.localize("ERROR.mtteServerCommunication") }
    }
  }

  activateListeners(html) {
    super.activateListeners(html);
    this.bringToTop()
    const window = this;
  
    // filter function
    html.find("#searchTransl").on("keyup", function() {
      let filter = $(this).val().toLowerCase()
      $('#translPacks *').filter('.pack').each(function() {
        const text = $(this).text().trim().toLowerCase() + $(this).attr("title");
        $(this).css('display', text.length == 0 || text.indexOf(filter) >= 0 ? 'flex' : 'none')
      });
      window._alternateColors();
      window._hideMessagebox();
    });
    
    // keep messagebox reference for _updateObject
    this.msgbox = html.find(".messagebox")
    this.html = html
    
    // hide error/success message on anychange
    html.find(".check").click(this._hideMessagebox.bind(this));
    
    // toggle filters
    html.find("#filterModSys").click(this._toggleFilter.bind(this))
    html.find("#filterLang").click(this._toggleFilterLang.bind(this))
    html.find("#filterCore").click(this._toggleCore.bind(this))
    html.find("#filterBabele").click(this._toggleBabele.bind(this))
    
    // buttons
    html.find("button").click(this._onClickButton.bind(this))
    
    // enable alt _alternateColors
    this._alternateColors()
  }
  
  _toggleFilter(event) {
    this.onlyMyNeed = !this.onlyMyNeed;
    this.render()
  }
  
  _toggleFilterLang(event) {
    this.onlyMyLang = !this.onlyMyLang;
    this.render()
  }
  
  _toggleCore(event) {
    this.includeCore = !this.includeCore;
    this.render()
  }
  
  _toggleBabele(event) {
    this.includeBabele = !this.includeBabele;
    this.render()
  }
  
  _alternateColors() {
    $('#translPacks .pack').removeClass("alt");
    $('#translPacks .pack:even').addClass("alt");
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
  
  async _onClickButton(event) {
    event.preventDefault();
    const source = event.currentTarget;
    const window = this
    if (source.classList.contains("install")) {
      const names = []
      this.html.find("#translPacks .check:checkbox:checked").each(function () {
        names.push($(this).attr("name"))
      });
      const selected = this.lists.transl.filter( ts => names.includes(ts.id) )
      if(selected.length == 0) {
        return this._displayMessage(game.i18n.localize("ERROR.mtteSelectAtLeastOne"), 'error')
      }
      this._installPacks(selected)
    }
    else if (source.classList.contains("clear")) {
      this.html.find("#translPacks .check:checkbox:checked").prop('checked', false);
    }
    else if (source.classList.contains("update")) {
      let packInstalled = JSON.parse(game.settings.get("moulinette", "packInstalled"))
      const selected = this.lists.transl.filter( ts => packInstalled.includes(ts.filename) )
      let namesList = ""
      selected.forEach(s => namesList += `<li>${s.name}</li>`)
      Dialog.confirm({
        title: game.i18n.localize("mtte.updateAction"),
        content: game.i18n.format("mtte.updateContent", { count: selected.length }) + `<ul>${namesList}</ul>`,
        yes: async function() {
          window._installPacks(selected)
        },
        no: () => {}
      });
    }
  }
  
  /**
   * Downloads and installs all selected translations
   */
  async _installPacks(selected) {
    this.inProgress = true
    let client = new MoulinetteClient()
    
    let babeleInstalled = false
    let coreInstalled = false
    
    try {
      // installed packs
      let packInstalled = JSON.parse(game.settings.get("moulinette", "packInstalled"))
      
      // iterate on each desired request
      for( const r of selected ) {
        const response = await fetch(`${MoulinetteClient.GITHUB_SRC}/main${r.url}`).catch(function(e) {
          console.log(`Moulinette | Not able to fetch JSON for pack ${r.name}`, e)
        });
        if(!response) continue;
        const pack = await response.json()
        
        if(r.type == "babele-translation" && (!"babele" in game.modules.keys() || !game.modules.get("babele").active)) {
          ui.notifications.error(game.i18n.format("ERROR.mtteNoBabele"));
          continue;
        }
        
        // initialize progressbar
        SceneNavigation._onLoadProgress(r.name,0);  
        
        // retrieve all translations from pack
        let idx = 0
        for( const ts of pack.list ) {
          idx++;
          
          // retrieve transl JSON
          const filename = ts.url.split('/').pop()
          let response = await fetch(`${ts.url}`).catch(function(e) {
            console.log(`Moulinette | Not able to fetch translation of pack ${pack.name}`, e)
          });
          if(!response) {
            console.log("Moulinette | Direct download not working. Using proxy...")
            response = await client.fetch(`/bundler/fvtt/transl/${pack.id}/${idx-1}`)
            if(!response) {
              console.log("Moulinette | Proxy download not working. Skip.")
              continue;
            }
          }
          const blob = await response.blob()
          
          // Babele translations
          if(r.type == "babele-translation") {
            const folder = `moulinette/transl/babele/${r["lang"]}`
            await Moulinette.upload(new File([blob], filename, { type: blob.type, lastModified: new Date() }), filename, "moulinette/transl/babele", folder, true)
            babeleInstalled = true
            if(!packInstalled.includes(r.filename)) packInstalled.push(r.filename)
          } 
          // Core/system translation
          else if(r.type == "core-translation") {
            const folder = `moulinette/transl/core/${r["lang"]}`
            const transFilename = `${r["filename"]}-${filename}`
            await Moulinette.upload(new File([blob], transFilename, { type: blob.type, lastModified: new Date() }), transFilename, "moulinette/transl/core", folder, true)
            coreInstalled = true
            if(!packInstalled.includes(r.filename)) packInstalled.push(r.filename)
          }
          
          // update progressbar
          SceneNavigation._onLoadProgress(r.name, Math.round((idx / pack.list.length)*100));
        }
      }
      
      // cleanup installed packages (avoid two conflicting translations)
      let core = []
      let modules = []
      let systems = []
      let packInstalledClean = []
      packInstalled.slice().reverse().forEach( installed => {
        const pack = this.lists.transl.find( tr => tr.filename == installed )
        if(!pack) return
        if(pack.system && !systems.includes(`${pack.type}-${pack.lang}-${pack.system}`)) {
          systems.push(`${pack.type}-${pack.lang}-${pack.system}`)
          packInstalledClean.push(installed)
        }
        else if(pack.module && !modules.includes(`${pack.type}-${pack.lang}-${pack.module}`)) {
          modules.push(`${pack.lang}-${pack.module}`)
          packInstalledClean.push(installed)
        } else if(!pack.module && !pack.system && !core.includes(pack.lang)) {
          core.push(pack.lang)
          packInstalledClean.push(installed)
        } else {
          console.log(`Moulinette | Translation ${installed} removed from list because in conflict with another`)
        }
      });
      
      
      // store settings (installed packs)
      game.settings.set("moulinette", "packInstalled", JSON.stringify(packInstalledClean))
      
      if(babeleInstalled) {
        game.settings.set('babele', 'directory', "moulinette/transl/babele")
        this._displayMessage(game.i18n.localize("mtte.downloadSuccess"), 'success')
      } 
      if(coreInstalled) {
        let languages = []
        let browse = await FilePicker.browse(Moulinette.getSource(), "moulinette/transl/core");
        for( const d of browse.dirs ) {
          const lang = d.split('/').pop()
          const data = await FilePicker.browse(Moulinette.getSource(), d, {'extensions': ['.json']});
          data.files.forEach( f => {
            languages.push( {
              "lang": lang,
              "name": game.i18n.localize("mtte.lang." + lang),
              "path": f
            })
          });
        }
        game.settings.set("moulinette", "coreLanguages", JSON.stringify(languages))
        this._displayMessage(game.i18n.localize("mtte.downloadCoreSuccess"), 'success')
      }
      
    } catch(e) {
      console.log(`Moulinette | Unhandled exception`, e)
      this._displayMessage(game.i18n.localize("mtte.downloadFailure"), 'error')
    }
    
    // hide progressbar
    SceneNavigation._onLoadProgress(game.i18n.localize("mtte.installingPacks"), 100);
  }
    
}


/*************************
 * Search result
 *************************/
class MoulinetteSearchResult extends FormApplication {
  
  constructor(data) {
    super()
    this.data = data;    
  }
  
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinette-searchresult",
      classes: ["mtte", "searchresult"],
      title: game.i18n.localize("mtte.searchresult"),
      template: "modules/fvtt-moulinette/templates/searchresult.hbs",
      width: 420,
      height: "auto",
      closeOnSubmit: true,
      submitOnClose: false,
    });
  }
  
  getData() {
    let domain = (new URL(this.data.page));
    this.data["domain"] = domain.hostname
    return this.data
  }
  
  async _updateObject(event) {
    event.preventDefault();

    // download & upload image
    const headers = { method: "POST", headers: { 'Content-Type': 'application/json'}, body: JSON.stringify({ url: this.data.url }) }
    const res = await fetch(MoulinetteClient.SERVER_URL + "/search/download", headers).catch(function(e) {
      ui.notifications.error(game.i18n.format("ERROR.mtteDownloadTimeout"));
      console.log(`Moulinette | Cannot download image ${svg}`, e)
      return;
    });

    let imageName = this.data.url.split('/').pop()
    if(imageName.includes(".")) {
      imageName = imageName.substr(0, imageName.lastIndexOf('.'));
    }
    imageName = imageName.replace(/[\W_]+/g,"-") + "." + this.data.format
    
    const blob = await res.blob()
    await Moulinette.upload(new File([blob], imageName, { type: blob.type, lastModified: new Date() }), imageName, "moulinette/images", `moulinette/images/search`, false)
    const filepath = "moulinette/images/search/" + imageName

    // create article if requested
    if(event.submitter.className == "createArticle") {
      ui.journal.activate() // give focus to journal
      await JournalEntry.create( {name: this.data.name, img: filepath} )
    }
  }

  activateListeners(html) {
    super.activateListeners(html);
    this.bringToTop()
    html.find(".thumb").css('background', `url(${this.data.thumb}) 50% 50% no-repeat`)
  }
  
}


/*************************
 * Tile result
 *************************/
class MoulinetteTileResult extends FormApplication {
  
  constructor(tile, pack) {
    super()
    this.data = tile;
    this.data.pack = pack;
    this.imageName = this.data.filename
    this.folderName = `${pack.publisher} ${pack.name}`.replace(/[\W_]+/g,"-").toLowerCase()
    this.filePath = `moulinette/tiles/${this.folderName}/${this.imageName}`
  }
  
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinette-tileresult",
      classes: ["mtte", "searchresult"],
      title: game.i18n.localize("mtte.tileresult"),
      template: "modules/fvtt-moulinette/templates/tileresult.hbs",
      width: 420,
      height: "auto",
      dragDrop: [{dragSelector: ".thumbres"}],
      closeOnSubmit: true,
      submitOnClose: false,
    });
  }
  
  getData() {
    return this.data
  }
  
  _updateObject(event) {
    event.preventDefault();
    if(event.submitter.className == "createTile") {
      ui.notifications.error(game.i18n.format("ERROR.mtteCreateTile"));
      throw game.i18n.format("ERROR.mtteCreateTile");
    } else {
      this._downloadFile();
    }
  }
  
  _onDragStart(event) {
    const div = event.currentTarget;

    // Set drag data
    const dragData = {
      type: "Tile",
      img: this.filePath,
      tileSize: 100
    };
    
    // Create the drag preview for the image
    const img = div.querySelector("img")
    const w = img.naturalWidth * canvas.stage.scale.x;
    const h = img.naturalHeight * canvas.stage.scale.y;
    const preview = DragDrop.createDragImage(img, w, h);
    
    //event.dataTransfer.setDragImage(preview, w/2, h/2);
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
    
    this._downloadFile()
  }

  async _downloadFile() {
    // download & upload image
    const res = await fetch(this.data.thumb).catch(function(e) {
      ui.notifications.error(game.i18n.format("ERROR.mtteDownload"));
      console.log(`Moulinette | Cannot download image ${this.data.filename}`, e)
      return false;
    });

    const blob = await res.blob()
    await Moulinette.upload(new File([blob], this.imageName, { type: blob.type, lastModified: new Date() }), this.imageName, "moulinette/tiles", `moulinette/tiles/${this.folderName}`, false)
    return true
  }

  activateListeners(html) {
    super.activateListeners(html);
    this.bringToTop()
    this.html = html
    html.find(".thumb").css('background', `url(${this.data.thumb}) 50% 50% no-repeat`)
  }
  
}
