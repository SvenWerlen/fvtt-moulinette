
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
  
  static MOULINETTE_SOUNDBOARD = "Moulinette Soundboard"
  static MOULINETTE_PLAYLIST = "Moulinette Playlist"
  static FOLDER_CUSTOM_IMAGES = "/moulinette/images/custom"
  static FOLDER_CUSTOM_SOUNDS = "/moulinette/sounds/custom"
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
  
  static showMoulinetteForge() {
    new MoulinetteForge().render(true)
  }
  
  static showMoulinetteScribe() {
    new MoulinetteScribe().render(true)
  }
  
  /**
   * Adds a control button in the menu (top-left)
   */
  static async addControls(controls, html) {

      const moulinetteBtn = $(
          `<li class="scene-control moulinette-scene-control" data-control="moulinette" title="${game.i18n.localize("mtte.moulinette")}">
              <i class="fas fa-hammer"></i>
              <ol class="control-tools">
                  <div id="moulinetteOptions" class="moulinette-options" style="display: none;">
                  </div>
              </ol>
          </li>`
      );

      html.append(moulinetteBtn);
      moulinetteBtn[0].addEventListener('click', ev => this.toggleOptions(ev, html));
      //  this._createDiceTable(html);
  }
  
  static getSource() {
    var source = "data";
    if (typeof ForgeVTT != "undefined" && ForgeVTT.usingTheForge) {
        source = "forgevtt";
    }
    return source;
  }
  
  /**
   * Converts filename into pretty text
   */
  static prettyText(text) {
    // decode URI
    text = decodeURIComponent(text)
    
    // replace file separators
    text = text.replace(/[_-]/g, " ")
    
    // adds a space between word and number (ex: Orks2 => Orks 2)
    text = text.replace( /(\d+)$/g, " $1");
    
    // capitalize each word
    var splitStr = text.toLowerCase().split(' ');
    for (var i = 0; i < splitStr.length; i++) {
       splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);     
    }
    text = splitStr.join(' '); 
    
    return text;
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
  
  static async toggleOptions(event, html) {
    if (html.find('.moulinette-scene-control').hasClass('active')) {
      html.find('#moulinetteOptions').hide();
      html.find('.moulinette-scene-control').removeClass('active');
      html.find('.scene-control').first().addClass('active');
      $(document.getElementById("controls")).css('z-index', '');
    } else {
      this._createOptionsTable(html);
      html.find('.scene-control').removeClass('active');
      html.find('#moulinetteOptions').show();
      html.find('.moulinette-scene-control').addClass('active');
      $(document.getElementById("controls")).css('z-index', 159); // notifications have 160
    }
    event.stopPropagation();
  }
  
  static async _createOptionsTable(html) {
    const data = [
      {id: "scenes", name: game.i18n.localize("mtte.scenes"), icon: "fa-map"},
      {id: "gameicons", name: game.i18n.localize("mtte.gameIcons"), icon: "fa-file-image"},
      {id: "imagesearch", name: game.i18n.localize("mtte.imageSearch"), icon: "fa-search"},
      {id: "tilesearch", name: game.i18n.localize("mtte.tileSearch"), icon: "fa-puzzle-piece"},
      {id: "customaudio", name: game.i18n.localize("mtte.customAudio"), icon: "fa-music"}
    ]
    
    // audio favorites
    let favorites = game.settings.get("moulinette", "soundboard")
    
    let content = `<ul><li class="title" data-type="home">${game.i18n.localize("mtte.quickOpen")}</li>`
    for(const d of data) {
      content += `<li data-type="${d.id}" class="quick" title="${d.name}"><i class="fas ${d.icon}"></i></li>`
    }
    content += "</ul>"
    
    const cols = game.settings.get("fvtt-moulinette", "soundboardCols")
    const rows = game.settings.get("fvtt-moulinette", "soundboardRows")
    for(let r=0; r<rows; r++) {
      content += `<ul><li class="title" data-type="customaudio">${r == 0 ? game.i18n.localize("mtte.soundboard") : ""}</li>`
      for(let c=0; c<cols; c++) {
        const i = 1 + (r*cols) + c
        let name = `${i}`
        if(Object.keys(favorites).includes("fav" + i)) {
          const fav = favorites["fav" + i]
          if(fav.icon && fav.icon.length > 0) {
            if(fav.faIcon) {
              name = `<i class="fas fa-${fav.icon}" title="${fav.name}"></i>`
            } else {
              name = `<img class="icon" title="${fav.name}" src="${fav.icon}" draggable="true"/>`
            }
          } else {
            name = fav.name
          }
        }
        content += `<li class="fav" data-slot="${i}" draggable="true">${name}</li>`
      }
      content += "</ul>"
    }
    html.find('.moulinette-options ul').remove()
    html.find('.moulinette-options').append(content)
    html.find('.moulinette-options li.title').click(ev => this._openMoulinette(ev, html))
    html.find('.moulinette-options li.quick').click(ev => this._openMoulinette(ev, html))
    html.find('.moulinette-options li.fav').click(ev => this._playFavorite(ev, html))
    html.find('.moulinette-options li.fav').mousedown(ev => this._editFavorite(ev, html))

    html.find('.moulinette-options li.fav').on('dragstart',function (event) {
      const slot = event.currentTarget.dataset.slot
      event.originalEvent.dataTransfer.setData("text/plain", slot)
    })

    html.find('.moulinette-options li.fav').on('drop', async function (event) {
      event.preventDefault();
      const fromSlot = event.originalEvent.dataTransfer.getData("text/plain");
      const toSlot = event.currentTarget.dataset.slot
      let favorites = game.settings.get("moulinette", "soundboard")
      if(fromSlot && toSlot && fromSlot != toSlot && Object.keys(favorites).includes("fav" + fromSlot)) {
        const fromFav = favorites["fav" + fromSlot]
        const toFav = Object.keys(favorites).includes("fav" + toSlot) ? favorites["fav" + toSlot] : null
        let overwrite = null
        // target not defined => move
        if(!toFav) {
          overwrite = true
        }
        // target defined => prompt for desired behaviour
        else {
          overwrite = await Dialog.confirm({
            title: game.i18n.localize("mtte.moveFavorite"),
            content: game.i18n.format("mtte.moveFavoriteContent", { from: fromFav.name, to: toFav.name}),
          })
          if(overwrite == null) return;
        }
        favorites["fav" + toSlot] = fromFav
        if(overwrite) {
          delete favorites["fav" + fromSlot]
        } else {
          favorites["fav" + fromSlot] = toFav
        }
        await game.settings.set("moulinette", "soundboard", favorites)
        Moulinette._createOptionsTable($('#controls'))
      }
    })
    
    html.find('.moulinette-options li.fav').on('dragover',function (event) {
      event.preventDefault();
    })
  }
  
  static async _openMoulinette(event, html) {
    const type = event.currentTarget.dataset.type
    if(type == "home") {
      Moulinette.showMoulinette()
    } else {
      new MoulinetteForge(type).render(true)
    }
  }
  
  static async _editFavorite(event, html) {
    // right click only
    if(event.which == 3) {
      const slot = event.currentTarget.dataset.slot;
      let favorites = game.settings.get("moulinette", "soundboard")
      if(Object.keys(favorites).includes("fav" + slot)) {
        const fav = favorites["fav" + slot]
        let data = {name: fav.name, label: fav.name, path: fav.path, volume: fav.volume, slot: slot}
        if(fav.faIcon) {
          data["icon"] = fav.icon
        } else if(fav.icon.length > 0) {
          data["icon2"] = fav.icon
        }
        const moulinette = new MoulinetteFavorite(data);
        moulinette.options.title = game.i18n.localize("mtte.favoriteEdit")
        moulinette.render(true)
      }
    }
  }
  
  static async _playFavorite(event, html) {
    const slot = event.currentTarget.dataset.slot
    if(slot) {
      let favorites = game.settings.get("moulinette", "soundboard")
      if(Object.keys(favorites).includes("fav" + slot)) {
        const fav = favorites["fav" + slot]
        // get playlist
        let playlist = game.playlists.find( pl => pl.data.name == Moulinette.MOULINETTE_SOUNDBOARD )
        if(!playlist) {
          playlist = await Playlist.create({name: Moulinette.MOULINETTE_SOUNDBOARD, mode: -1})
        }
        // get sound
        let sound = playlist.sounds.find( s => s.path == fav.path )
        if(!sound) {
          const name = fav.name
          const repeat = false
          sound = await playlist.createEmbeddedEntity("PlaylistSound", {name: name, path: fav.path, volume: fav.volume}, {});
        }
        playlist.updateEmbeddedEntity("PlaylistSound", {_id: sound._id, playing: !sound.playing});
      } else {
        ui.notifications.warn(game.i18n.localize("mtte.slotNotAssigned"));
        new MoulinetteForge("customaudio").render(true)
        event.stopPropagation();
      }
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
  
  static get TABS() { return ["scenes", "gameicons", "imagesearch", "tilesearch", "customsearch", "customaudio"] }
  
  constructor(tab) {
    super()
    const curTab = tab ? tab : game.settings.get("moulinette", "currentTab")
    this.tab = MoulinetteForge.TABS.includes(curTab) ? curTab : "scenes"
    
    // specific to Tiles
    this.assets = []
    this.assetsPacks = []
    this.assetsCount = 0
  }
  
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinette",
      classes: ["mtte", "forge"],
      title: game.i18n.localize("mtte.moulinetteForge"),
      template: "modules/fvtt-moulinette/templates/forge.hbs",
      width: 800,
      height: "auto",
      resizable: true,
      dragDrop: [{dragSelector: ".draggable"}],
      closeOnSubmit: false,
      submitOnClose: false,
    });
  }
  
  async getData() {
    if (!game.user.isGM) {
      return { error: game.i18n.localize("ERROR.mtteGMOnly") }
    }
    
    let data = { 
      scenesActive: this.tab == "scenes", 
      gameIconsActive: this.tab == "gameicons", 
      imageSearchActive: this.tab == "imagesearch",
      tileSearchActive: this.tab == "tilesearch",
      customSearchActive: this.tab == "customsearch",
      customAudioActive: this.tab == "customaudio"
    }

    if(this.tab == "scenes") {
      let client = new MoulinetteClient()
      let lists = await client.get("/bundler/fvtt/packs")
      if( lists && lists.status == 200 ) {
        let scCount = 0;
        this.lists = lists.data
        this.lists.scenes.forEach( sc => { 
          sc.source = { name: sc.source.split('|')[0], url: sc.source.split('|')[1] } 
          scCount += sc.scenesCount
        })
        data.lists = this.lists
        data.scCount = scCount
      } else {
        console.log(`Moulinette | Error during communication with server ${MoulinetteClient.SERVER_URL}`, lists)
        return { error: game.i18n.localize("ERROR.mtteServerCommunication") }
      }
    }
    else if(this.tab == "gameicons") {
      data.fgColor = game.settings.get("moulinette", "gIconFgColor")
      data.bgColor = game.settings.get("moulinette", "gIconBgColor")
    }
    else if(this.tab == "tilesearch" || this.tab == "customsearch") {
      await this._buildAssetIndex([MoulinetteClient.SERVER_URL + "/assets/data.json", "moulinette/images/custom/index.json"])
      let packs = this.assetsPacks.map( (pack,idx) => { return { id: idx, name: pack.name, publisher: pack.publisher } } ).sort((a, b) => (a.publisher == b.publisher) ? (a.name > b.name ? 1 : -1) : (a.publisher > b.publisher ? 1 : -1))
      data.packs = packs
      data.count = this.assetsCount
    }
    else if(this.tab == "customaudio") {
      await this._buildAssetIndex(["moulinette/sounds/custom/index.json"])
      let packs = this.assetsPacks.map( (pack,idx) => { return { id: idx, name: pack.name, publisher: pack.publisher } } ).sort((a, b) => (a.publisher == b.publisher) ? (a.name > b.name ? 1 : -1) : (a.publisher > b.publisher ? 1 : -1))
      data.packs = packs
      data.count = this.assetsCount
    }
    
    return data
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
    
    // give focus to input text
    html.find(".searchinput").focus();
    
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
    
    // asset search (filter on pack)
    const parent = this
    html.find("select.packlist").on('change', function() {
      html.find(".searchinput").val("")
      parent.filter = ""
      parent.filterPack = this.value
      parent._searchAssets()
    });
    
    // enable alt _alternateColors
    this._alternateColors()
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
    if(this.filter.length < 3) return this.html.find("#images").html("")
    
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
  
  async _buildAssetIndex(urlList) {
    // build tiles' index
    if(this.assets.length == 0) {
      let idx = 0;
      for(const URL of urlList) {
        const response = await fetch(URL, {cache: "no-store"}).catch(function(e) {
          console.log(`Moulinette | Cannot download tiles/asset list`, e)
          return;
        });
        if(response.status != 200) return;
        const data = await response.json();
        for(const pub of data) {
          for(const pack of pub.packs) {
            this.assetsPacks.push({ publisher: pub.publisher, pubWebsite: pub.website, name: pack.name, url: pack.url, license: pack.license, licenseUrl: pack.licenseUrl, path: pack.path, count: pack.assets.length, isRemote: URL.startsWith('http') })
            for(const asset of pack.assets) {
              this.assets.push({ pack: idx, filename: asset})
            }
            idx++;
            this.assetsCount += pack.assets.length
          }
        }
      }
    }
  }
  
  async _searchAssets() {
    console.log("Moulinette | Searching assets ... " + this.filter)
    if(this.filter.length < 3 && this.filterPack < 0) return this.html.find("#assets").html("")
      
    const filters = this.filter.toLowerCase().split(" ")
    const filtered = this.assets.filter( t => {
      // pack doesn't match selection
      if( this.filterPack >= 0 && t.pack != this.filterPack ) return false
      // check if text match
      for( const f of filters ) {
        if( t.filename.toLowerCase().indexOf(f) < 0 ) return false
      }
      return true;
    })
    
    if(filtered.length == 0) {
      ui.notifications.warn(game.i18n.localize("mtte.noResult"));
      return
    }
    
    // playlist
    const playlist = game.playlists.find( pl => pl.data.name == Moulinette.MOULINETTE_SOUNDBOARD )
    
    let html = ""
    this.searchResults = filtered;
    let idx = 0;
    
    if(this.tab == "tilesearch" || this.tab == "customsearch") {
      filtered.forEach( r => {
        idx++
        const URL = this.assetsPacks[r.pack].isRemote ? `${MoulinetteClient.SERVER_URL}/assets/` : ""
        r.assetURL = `${URL}${this.assetsPacks[r.pack].path}/${r.filename}`
        html += `<div class="thumbres draggable" title="${r.filename}" data-idx="${idx}"><img width="100" height="100" src="${r.assetURL}"/></div>` 
      })
      // display results
      this.html.find("#assets").html(html)
      this.html.find(".thumbres").click(this._onClickAction.bind(this))
      // re-apply drag-drop
      const el = this.html[0]
      this._dragDrop.forEach(d => d.bind(el));
    }
    else if(this.tab == "customaudio") {
      // header
      html += `<div class="pack header">` 
      html += `<input type="checkbox" class="check all" name="all" value="-1">`
      html += `<span class="audio"><b>${game.i18n.localize("mtte.name")}</b></span><span class="audioSource"><b>${game.i18n.localize("mtte.publisher")} | ${game.i18n.localize("mtte.pack")}</b></span><div class="sound-controls flexrow">`
      html += "</div></div>"
      filtered.forEach( r => {
        idx++
        const URL = this.assetsPacks[r.pack].isRemote ? `${MoulinetteClient.SERVER_URL}/assets/` : ""
        r.assetURL = `${URL}${this.assetsPacks[r.pack].path}/${r.filename}`
        
        const pack   = this.assetsPacks[r.pack]
        const sound  = playlist ? playlist.sounds.find(s => s.path == r.assetURL) : null
        const name   = Moulinette.prettyText(r.filename.replace("/","").replace(".ogg","").replace(".mp3","").replace(".wav",""))
        const icon   = sound && sound.playing ? "fa-square" : "fa-play"
        const repeat = sound && sound.repeat ? "" : "inactive"
        const volume = sound ? sound.volume : 0.5
        
        html += `<div class="pack" data-path="${r.assetURL}" data-idx="${idx}">` 
        html += `<input type="checkbox" class="check">`
        html += `<span class="audio">${name}</span><span class="audioSource">${pack.publisher} | ${pack.name}</span><div class="sound-controls flexrow">`
        html += `<input class="sound-volume" type="range" title="${game.i18n.localize("PLAYLIST.SoundVolume")}" value="${volume}" min="0" max="1" step="0.05">`
        html += `<a class="sound-control ${repeat}" data-action="sound-repeat" title="${game.i18n.localize("PLAYLIST.SoundLoop")}"><i class="fas fa-sync"></i></a>`
        html += `<a class="sound-control" data-action="sound-play" title="${game.i18n.localize("PLAYLIST.SoundPlay")} / ${game.i18n.localize("PLAYLIST.SoundStop")}"><i class="fas ${icon}"></i></a>`
        html += `<a class="sound-control" data-action="favorite" title="${game.i18n.localize("mtte.favoriteSound")}")}"><i class="far fa-bookmark"></i></a>`
        html += "</div></div>"
      })
      // display results
      this.html.find("#assets").html(html)
      const jqHTML = this.html
      this.html.find('.check.all').change(event => jqHTML.find('.check:not(".all")').prop('checked', event.currentTarget.checked) );
      this.html.find('.sound-volume').change(event => this._onSoundVolume(event));
      this.html.find(".sound-control").click(this._onClickAction.bind(this))
      this._alternateColors()
    }
  }
  
  /**
   * Handle volume adjustments to sounds within a Playlist
   * @param {Event} event   The initial change event
   * @private
   */
  _onSoundVolume(event) {
    event.preventDefault();
    const slider = event.currentTarget;
    const path = slider.closest(".pack").dataset.path;
    
    // retrieve sound in play list
    const playlist = game.playlists.find( pl => pl.data.name == Moulinette.MOULINETTE_SOUNDBOARD )
    if(!playlist) return;
    const sound = playlist.sounds.find( s => s.path == path )
    if(!sound) return

    // Only push the update if the user is a GM
    const volume = AudioHelper.inputToVolume(slider.value);
    if (game.user.isGM) playlist.updateEmbeddedEntity("PlaylistSound", {_id: sound._id, volume: volume});

    // Otherwise simply apply a local override
    else {
      let sound = playlist.audio[sound._id];
      if (!sound.howl) return;
      sound.howl.volume(volume, sound._id);
    }
  }
  
  async _onClickAction(event) {
    event.preventDefault();
    const source = event.currentTarget;
    const idx = this.tab != "customaudio" ? source.dataset.idx : source.closest(".pack").dataset.idx;

    if(this.searchResults && idx > 0 && idx <= this.searchResults.length) {
      if(this.tab == "imagesearch") {
        new MoulinetteSearchResult(this.searchResults[idx-1]).render(true)
      } else if(this.tab == "tilesearch" || this.tab == "customsearch") {
        const result = this.searchResults[idx-1]
        new MoulinetteTileResult(duplicate(result), duplicate(this.assetsPacks[result.pack]), this.tab).render(true)
      } else if(this.tab == "customaudio") {
        const result = this.searchResults[idx-1]
        // get playlist
        let playlist = game.playlists.find( pl => pl.data.name == Moulinette.MOULINETTE_SOUNDBOARD )
        if(!playlist) {
          playlist = await Playlist.create({name: Moulinette.MOULINETTE_SOUNDBOARD, mode: -1})
        }
        // get sound
        let sound = playlist.sounds.find( s => s.path == result.assetURL )
        if(!sound) {
          const name = Moulinette.prettyText(result.filename.replace("/","").replace(".ogg","").replace(".mp3","").replace(".wav",""))
          const volume = AudioHelper.inputToVolume($(source.closest(".pack")).find(".sound-volume").val())
          const repeat = $(source.closest(".pack")).find("a[data-action='sound-repeat']").hasClass('inactive')
          sound = await playlist.createEmbeddedEntity("PlaylistSound", {name: name, path: result.assetURL, volume: volume}, {});
        }
        // toggle play
        if(source.dataset.action == "sound-play") {
          playlist.updateEmbeddedEntity("PlaylistSound", {_id: sound._id, playing: !sound.playing});
        } else if(source.dataset.action == "sound-repeat") {
          if(sound) {
            playlist.updateEmbeddedEntity("PlaylistSound", {_id: sound._id, repeat: !sound.repeat});
          }
        } else if(source.dataset.action == "favorite") {
          new MoulinetteFavorite({path: sound.path, name: sound.name, label: sound.name, volume: sound.volume }).render(true)
        } else {
          console.log(`Moulinette | Action ${source.dataset.action} not implemented`)
        }
      }
    }
  }
  
  _onDragStart(event) {
    super._onDragStart(event)
    const div = event.currentTarget;
    const idx = div.dataset.idx;
    if(this.searchResults && idx > 0 && idx <= this.searchResults.length) { 
      
      const tile = this.searchResults[idx-1]
      const pack = this.assetsPacks[tile.pack]
      if(!pack.isRemote) {
        const filePath = `${pack.path}${tile.filename}`
  
        // Set drag data
        const dragData = {
          type: "Tile",
          img: filePath,
          tileSize: 100
        };
        event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
      }
      else {
        const folderName = `${pack.publisher} ${pack.name}`.replace(/[\W_]+/g,"-").toLowerCase()
        const imageName = tile.filename.split('/').pop()
        const filePath = `moulinette/tiles/${folderName}/${imageName}`
  
        // Set drag data
        const dragData = {
          type: "Tile",
          img: filePath,
          tileSize: 100
        };
        event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  
        // download & upload image
        fetch(tile.assetURL).catch(function(e) {
          ui.notifications.error(game.i18n.localize("ERROR.mtteDownload"));
          console.log(`Moulinette | Cannot download image ${imageName}`, e)
          return;
        }).then( res => {
          res.blob().then( blob => Moulinette.upload(new File([blob], imageName, { type: blob.type, lastModified: new Date() }), imageName, "moulinette/tiles", `moulinette/tiles/${folderName}`, false) )
        });
      }
      
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
    $('.forge .pack').removeClass("alt");
    $('.forge .pack:even').addClass("alt");
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
  
  _clearPackLists() {
    this.filter = ""
    this.assetsCount = 0
    this.assets.length = 0
    this.assetsPacks.length = 0
  }
  
  _onNavigate(event) {
    event.preventDefault();
    const source = event.currentTarget;
    const tab = source.dataset.tab;
    if(MoulinetteForge.TABS.includes(tab)) {
      this.tab = tab
      game.settings.set("moulinette", "currentTab", tab)
      this._clearPackLists()
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
      } else if(this.tab == "tilesearch" || this.tab == "customsearch" || this.tab == "customaudio") { 
        this._searchAssets()
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
    else if (source.classList.contains("listPacks")) {
      // sort
      let list = duplicate(this.assetsPacks)
      list.sort((a, b) => (a.publisher == b.publisher) ? (a.name > b.name ? 1 : -1) : (a.publisher > b.publisher ? 1 : -1))
      
      let html = `<table class="mttedialog listPacks"><tr><th>${game.i18n.localize("mtte.publisher")}</th><th>${game.i18n.localize("mtte.pack")}</th><th class="num">#</th><th>${game.i18n.localize("mtte.license")}</th></tr>`
      list.forEach( t => {
        if(t.isRemote) {
          html += `<tr><td><a href="${t.pubWebsite}" target="_blank">${t.publisher}</a></td><td><a href="${t.url}" target="_blank">${t.name}</a></td><td class="num">${t.count}</td><td><a href="${t.licenseUrl}" target="_blank">${t.license}</a></td></tr>`
        } else {
          html += `<tr><td>${t.publisher}</td><td>${t.name}</td><td class="num">${t.count}</td><td>${game.i18n.localize("mtte.unknownLicense")}</td></tr>`
        }
      })
      html += "</table>"
      new Dialog({title: game.i18n.localize("mtte.listPacks"), content: html, buttons: {}}, { width: 650, height: "auto" }).render(true)
    }
    else if (source.classList.contains("customReferences")) {
      if(this.tab == "tilesearch") {
        new Dialog({title: game.i18n.localize("mtte.customReferencesPacks"), buttons: {}}, { id: "moulinette-info", classes: ["info"], template: "modules/fvtt-moulinette/templates/customReferences.hbs", width: 650, height: "auto" }).render(true)
      } else if(this.tab == "customaudio") {
        new Dialog({title: game.i18n.localize("mtte.customReferencesPacks"), buttons: {}}, { id: "moulinette-info", classes: ["info"], template: "modules/fvtt-moulinette/templates/customReferencesAudio.hbs", width: 650, height: "auto" }).render(true)
      }
    }
    else if (source.classList.contains("indexImages")) {
      ui.notifications.info(game.i18n.localize("mtte.indexingInProgress"));
      this.html.find(".indexImages").prop("disabled", true);
      // first level = publishers
      let publishers = []
      let dir1 = await FilePicker.browse(Moulinette.getSource(), Moulinette.FOLDER_CUSTOM_IMAGES);
      for(const pub of dir1.dirs) {
        let publisher = { publisher: decodeURI(pub.split('/').pop()), packs: [] }
        // second level = packs
        let dir2 = await FilePicker.browse(Moulinette.getSource(), pub);
        for(const pack of dir2.dirs) {
          let files = await MoulinetteForge._scanFolder(pack, ["gif","jpg","jpeg","png","webp"]);
          // remove pack path from file path
          files = files.map( (path) => { return path.split(pack)[1] } )
          publisher.packs.push({ name: decodeURI(pack.split('/').pop()), path: pack, assets: files })
        }
        publishers.push(publisher)
      }
      await Moulinette.upload(new File([JSON.stringify(publishers)], "index.json", { type: "application/json", lastModified: new Date() }), "index.json", "/moulinette/images", Moulinette.FOLDER_CUSTOM_IMAGES, true)
      ui.notifications.info(game.i18n.localize("mtte.indexingDone"));
      this._clearPackLists()
      this.render();
    }
    else if (source.classList.contains("indexSounds")) {
      ui.notifications.info(game.i18n.localize("mtte.indexingInProgress"));
      this.html.find(".indexSounds").prop("disabled", true);
      // first level = publishers
      let publishers = []
      let dir1 = await FilePicker.browse(Moulinette.getSource(), Moulinette.FOLDER_CUSTOM_SOUNDS);
      for(const pub of dir1.dirs) {
        let publisher = { publisher: decodeURI(pub.split('/').pop()), packs: [] }
        console.log(pub)
        // second level = packs
        let dir2 = await FilePicker.browse(Moulinette.getSource(), pub);
        console.log(dir2)
        for(const pack of dir2.dirs) {
          let files = await MoulinetteForge._scanFolder(pack, ["mp3", "ogg", "wav"]);
          // remove pack path from file path
          files = files.map( (path) => { return path.split(pack)[1] } )
          publisher.packs.push({ name: decodeURI(pack.split('/').pop()), path: pack, assets: files })
        }
        publishers.push(publisher)
      }
      await Moulinette.upload(new File([JSON.stringify(publishers)], "index.json", { type: "application/json", lastModified: new Date() }), "index.json", "/moulinette/sounds", Moulinette.FOLDER_CUSTOM_SOUNDS, true)
      ui.notifications.info(game.i18n.localize("mtte.indexingDone"));
      this._clearPackLists()
      this.render();
    }
    else if (source.classList.contains("activatePlaylist")) {
      ui.playlists.activate()
      // collapse all playlists but Moulinette
      $("#playlists .directory-item").each( function() {
        if(!$(this).hasClass("collapsed") && !$(this).find(".playlist-name").text().trim().startsWith("Moulinette")) {
          $(this).find(".playlist-name").click()
        }
      })
      // open Moulinette if collapsed
      $("#playlists .playlist-name").filter(function() { return $(this).text().trim().startsWith("Moulinette") }).each(function(index) { 
        if($(this).closest(".directory-item").hasClass("collapsed")) {
          $(this).click()
        }
      })
    }
    else if (source.classList.contains("deletePlaylist")) {
      Dialog.confirm({
        title: game.i18n.localize("mtte.deletePlayListAction"),
        content: game.i18n.localize("mtte.deletePlayListContent"),
        yes: async function() { 
          const playlist = game.playlists.find( p => p.name == "Moulinette Soundboard" )
          if(playlist) {
            let updates = []
            // stop any playing sound
            for( const sound of playlist.sounds ) {
              if(sound.playing) {
                updates.push({_id: sound._id, playing: false})
              }
            }
            if(updates.length > 0) {
              await playlist.updateEmbeddedEntity("PlaylistSound", updates);
            }
            await playlist.delete()
          }
        },
        no: () => {}
      });
    }
    else if (source.classList.contains("howto")) {
      new Dialog({title: game.i18n.localize("mtte.howto"), buttons: {}}, { id: "moulinette-help", classes: ["howto"], template: `modules/fvtt-moulinette/templates/help-${this.tab}.hbs`, width: 650, height: 700, resizable: true }).render(true)
    }
    else if (source.classList.contains("playChecked")) {
      // prepare selected sounds
      let selected = []
      let first = true
      this.html.find(".check:checkbox:checked").each(function(index) { 
        const path = $(this).closest(".pack").data('path')
        const name = $(this).closest(".pack").find('.audio').text()
        const volume = $(this).closest(".pack").find('.sound-volume').val()
        if(path) { selected.push({name: name, path: path, volume: volume, playing: first}); first = false }
      })
      
      if(selected.length == 0) return;
      
      // delete any existing playlist
      let playlist = game.playlists.find( pl => pl.data.name == Moulinette.MOULINETTE_PLAYLIST )
      if(playlist) { await playlist.delete() }
      playlist = await Playlist.create({name: Moulinette.MOULINETTE_PLAYLIST})
      
      playlist.createEmbeddedEntity("PlaylistSound", selected)
      playlist.update({ playing: true})
    }
  }
  
  
  /**
   * Returns the list of all images in folder (and its subfolders)
   */
  static async _scanFolder(path, filter) {
    let list = []
    const base = await FilePicker.browse(Moulinette.getSource(), path);
    let baseFiles = filter ? base.files.filter(f => filter.includes(f.split(".").pop().toLowerCase())) : base.files
    list.push(...baseFiles)
    for(const d of base.dirs) {
      const files = await MoulinetteForge._scanFolder(d, filter)
      list.push(...files)
    }
    return list
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
      ui.notifications.error(game.i18n.localize("ERROR.mtteInProgress"));
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
      return ui.notifications.error(game.i18n.localize("ERROR.mtteMandatorySceneName"));
    }
    else if(!inputs.sceneDesc || inputs.sceneDesc.length == 0) {
      return ui.notifications.error(game.i18n.localize("ERROR.mtteMandatorySceneDesc"));
    }
    else if(!inputs.authorImg || inputs.authorImg.length == 0) {
      return ui.notifications.error(game.i18n.localize("ERROR.mtteAuthorImg"));
    }
    else if(!inputs.authorURL || inputs.authorURL.length == 0) {
      return ui.notifications.error(game.i18n.localize("ERROR.mtteAuthorURL"));
    }
    else if(!inputs.imageURL || inputs.imageURL.length == 0) {
      return ui.notifications.error(game.i18n.localize("ERROR.mtteImageURL"));
    }
    else if(!inputs.agree1 || !inputs.agree2) {
      return ui.notifications.error(game.i18n.localize("ERROR.mtteMustAgree"));
    }
    else if(!inputs.discordId || inputs.discordId.length == 0) {
      return ui.notifications.error(game.i18n.localize("ERROR.mtteDiscordId"));
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
      return ui.notifications.error(game.i18n.localize("ERROR.mtteUnexpected"));
    } else {
      ui.notifications.info(game.i18n.localize("mtte.shareSuccess"));
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
      width: 800,
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
          ui.notifications.error(game.i18n.localize("ERROR.mtteNoBabele"));
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
      ui.notifications.error(game.i18n.localize("ERROR.mtteDownloadTimeout"));
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
      const article = await JournalEntry.create( {name: this.data.name, img: filepath} )
      article.sheet.render(true)
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
  
  constructor(tile, pack, tab) {
    super()
    this.tab = tab
    this.data = tile;
    this.data.pack = pack;
    
    if(pack.isRemote) {
      this.imageName = this.data.filename.split('/').pop()
      this.folderName = `${pack.publisher} ${pack.name}`.replace(/[\W_]+/g,"-").toLowerCase()
      this.filePath = `moulinette/tiles/${this.folderName}/${this.imageName}`
    } else {
      this.filePath = `${pack.path}${tile.filename}`
    }
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
      ui.notifications.error(game.i18n.localize("ERROR.mtteCreateTile"));
      throw game.i18n.localize("ERROR.mtteCreateTile");
    } else if(event.submitter.className == "download") {
      this._downloadFile();
    } else if(event.submitter.className == "clipboard") {
      navigator.clipboard.writeText(this.data.assetURL)
      .catch(err => {
        console.warn("Moulinette | Not able to copy path into clipboard")
      });
      ui.notifications.info(game.i18n.localize("mtte.clipboardImageSuccess"));
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
    
    if(this.data.pack.isRemote) {
      this._downloadFile()
    }
  }

  async _downloadFile() {
    // download & upload image
    const res = await fetch(this.data.assetURL).catch(function(e) {
      ui.notifications.error(game.i18n.localize("ERROR.mtteDownload"));
      console.log(`Moulinette | Cannot download image ${this.data.filename}`, e)
      return false;
    });

    const blob = await res.blob()
    await Moulinette.upload(new File([blob], this.imageName, { type: blob.type, lastModified: new Date() }), this.imageName, "moulinette/tiles", `moulinette/tiles/${this.folderName}`, false)
    
    // copy path into clipboard
    navigator.clipboard.writeText(`moulinette/tiles/${this.folderName}/${this.imageName}`)
    .catch(err => {
      console.warn("Moulinette | Not able to copy path into clipboard")
    });
    
    ui.notifications.info(game.i18n.localize("mtte.downloadImageSuccess"));
    return true
  }

  activateListeners(html) {
    super.activateListeners(html);
    this.bringToTop()
    this.html = html
    html.find(".thumb").css('background', `url(${this.data.assetURL}) 50% 50% no-repeat`)
  }
  
}

/*************************
 * Moulinette Favorite
 *************************/
class MoulinetteFavorite extends FormApplication {
  
  static WIDTH = {10: 420, 15: 630, 20: 840}
  
  constructor(data) {
    super()
    this.data = data
    if(this.data.slot) {
      this.selected = this.data.slot
    }
  }
  
  static get defaultOptions() {
    const cols = game.settings.get("fvtt-moulinette", "soundboardCols")
    return mergeObject(super.defaultOptions, {
      id: "moulinette-favorite",
      classes: ["mtte", "favorite"],
      title: game.i18n.localize("mtte.favorite"),
      template: "modules/fvtt-moulinette/templates/favorite.hbs",
      width: MoulinetteFavorite.WIDTH[cols],
      height: "auto",
      closeOnSubmit: true,
      submitOnClose: false,
    });
  }
  
  getData() {
    let slots = []
    // if slot is specified => edit mode
    if(!this.data.slot) {
      let favorites = game.settings.get("moulinette", "soundboard")
      const cols = game.settings.get("fvtt-moulinette", "soundboardCols")
      const rows = game.settings.get("fvtt-moulinette", "soundboardRows")
      for(let r=0; r<rows; r++) {
        let list = []
        for(let c=0; c<cols; c++) {
          const i = 1 + (r*cols) + c
          let data = { num: i, name: i }
          if(Object.keys(favorites).includes("fav" + i)) {
            const fav = favorites["fav" + i]
            data["name"] = ""
            if(fav.faIcon) {
              data["faIcon"] = fav.icon
            } else if(fav.icon) {
              data["icon"] = fav.icon
            } else {
              data["name"] = fav.name
            }
          }
          list.push(data)
        }
        slots.push(list)
      }
    }
    return {slots: slots, data: this.data}
  }
  
  async _onClick(event) {
    const button = event.currentTarget;
    if(button.classList.contains("cancel")) {
      this.close()
    }
    else if(button.classList.contains("slot")) {
      const idx = button.dataset.idx
      this.html.find("button").removeClass("selected")
      $(button).addClass("selected")
      this.selected = idx;
    }
    else if(button.classList.contains("browse")) {
      const icon = this.html.find("input.icon2").val()
      new FilePicker({callback: this._onPathChosen.bind(this), current: icon ? icon : "moulinette/images/", type: "image"}).render(true);
    }
    else if(button.classList.contains("save")) {
      const text = this.html.find("input.shortText").val()
      const icon = this.html.find("input.icon").val()
      const icon2 = this.html.find("input.icon2").val()
      if(!this.selected) {
        return ui.notifications.error(game.i18n.localize("ERROR.mtteChooseSlot"));
      }
      if(text.length == 0) {
        return ui.notifications.error(game.i18n.localize("ERROR.mtteEnterShortText"));
      }
      if(icon.length > 0 && icon2.length > 0) {
        return ui.notifications.error(game.i18n.localize("ERROR.mtteDoubleIconDefined"));
      }
      let favorites = game.settings.get("moulinette", "soundboard")
      favorites["fav" + this.selected] = { name: text, icon: (icon.length > 0 ? icon : icon2), faIcon: icon.length > 0, path: this.data.path, volume: this.data.volume }
      await game.settings.set("moulinette", "soundboard", favorites)
      Moulinette._createOptionsTable($('#controls'))
      this.close()
    }
  }
  
  _onPathChosen(path) {
    this.html.find("input.icon2").val(path)
  }
  
  async _onTogglePreview(event) {
    const sound = document.getElementById("previewSound")
    if(sound.paused) {
      sound.play();
    }
    else {
      sound.pause();
      sound.currentTime = 0;
    }
  }

  activateListeners(html) {
    this.html = html
    //super.activateListeners(html);
    //if (!$('.moulinette-scene-control').hasClass('active')) {
    //  $('.moulinette-scene-control').click();
    //} 
    html.find("button").click(this._onClick.bind(this))
    html.find("h2 a.sound-control i").click(this._onTogglePreview.bind(this))
  }
  
}
