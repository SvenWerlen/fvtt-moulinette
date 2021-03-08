
/**
 * Client functions for communicating with server
 */
class MoulinetteClient {
  
  static SERVER_URL = "http://127.0.0.1:5000"
  //static SERVER_URL = "https://boisdechet.org/moulinette"
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
    if( this.token ) { params.headers.Authorization = `Bearer ${this.token}`}
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
  
  /*
   * User login
   */
  async login() {
    const login = game.settings.get("moulinette", "lcLogin")
    const accessKey = game.settings.get("moulinette", "lcAccessKey")
    if( !login || !accessKey ) {
      return false
    }
    let data = {
      login: login,
      secret: accessKey
    }
    const response = await this.post('/login', data)
    if( !response || response.status == 401 ) {
      return false
    }
    
    this.token = response.data.access_token
    return true
  }
    
}


class Moulinette {
  
  static lastSelectedInitiative = 0
  static lastAuthor = ""
  
  constructor(hook, type, query) {
    Hooks.on(hook, this.handle.bind(this));
    this.type = type;
  }
  
  static async showMoulinette() {
    new MoulinetteHome().render(true)
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
  
  _onSelect(event) {
    event.preventDefault();
    const source = event.currentTarget;
    if (source.classList.contains("market")) {
      new MoulinetteMarket().render(true)
    } else if (source.classList.contains("requests")) {
      console.log("requests")
    }
  }
}


/*************************
 * Community Market
 *************************/
class MoulinetteMarket extends FormApplication {
  
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinette",
      classes: ["mtte", "market"],
      title: game.i18n.localize("mtte.communityMarket"),
      template: "modules/fvtt-moulinette/templates/market.html",
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
    if( lists.status == 200 ) {
      this.lists = lists.data
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
        $(this).css('display', text.length == 0 || text.indexOf(filter) >= 0 ? 'block' : 'none')
      });
      window._hideMessagebox();
    });
    
    // click on preview
    html.find(".preview").click(this._onPreview.bind(this));
    
    // keep messagebox reference for _updateObject
    this.msgbox = html.find(".messagebox")
    
    // hide error/success message on anychange
    html.find(".check").click(this._hideMessagebox.bind(this));
    
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
    console.log(this.lists)
    if(!this.lists || !this.lists.scenes || !this.msgbox) {
      return;
    }
    
    const selected = this.lists.scenes.filter( sc => sc.id in inputs && inputs[sc.id] )
    if(selected.length == 0) {
      this.msgbox.addClass('error').css('visibility', 'visible').find('.message').text(game.i18n.localize("ERROR.mtteSelectAtLeastOne"));
    } else if (selected.length > 3) {
      this.msgbox.addClass('error').css('visibility', 'visible').find('.message').text(game.i18n.localize("ERROR.mtteTooMany"));
    } else {
      // submit request
      const moduleName = "FoundryVTT"
      let userId = game.settings.get("moulinette", "userId", "")
      let client = new MoulinetteClient()
      let data = { userId: userId, module: moduleName }
      selected.forEach( s => data[s.id] = true )
      let response = await client.post("/v2/bundler/fvtt/task", data)
      if(response.status == 200) {
        this.msgbox.addClass('success').css('visibility', 'visible').find('.message').text(game.i18n.localize("mtte.requestSuccessful"));
      } else if(response.status == 403) {
        this.msgbox.addClass('error').css('visibility', 'visible').find('.message').text(game.i18n.localize("ERROR.tooManyRequests"));
      } else {
        console.log("Moulinette | Response from server", response)
        this.msgbox.addClass('error').css('visibility', 'visible').find('.message').text(game.i18n.localize("ERROR.requestFailed"));
      }
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


